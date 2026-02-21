const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const avePayService = require('../services/avePayService');
const { DEPOSIT_BONUSES } = require('../config/bonusConfig');

// Получить историю транзакций пользователя
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const values = [req.user.id];
    
    if (type && type !== 'all') {
      values.push(type);
      query += ` AND type = $${values.length}`;
    }
    
    values.push(parseInt(limit));
    query += ` ORDER BY created_at DESC LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;
    
    const result = await pool.query(query, values);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: {
        transactions: result.rows.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          currency: t.currency || 'RUB',
          status: t.status,
          paymentMethod: t.payment_method,
          description: t.description,
          createdAt: t.created_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Создать депозит через AVE PAY
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, paymentMethod = 'P2P_CARD', currency = 'RUB' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }

    const minDeposits = { 'P2P_CARD': 5000, 'P2P_SBP': 3000 };
    const maxDeposits = { 'P2P_CARD': 300000, 'P2P_SBP': 300000 };
    const minDeposit = minDeposits[paymentMethod] || 3000;
    const maxDeposit = maxDeposits[paymentMethod] || 300000;

    if (paymentMethod === 'CRYPTO' || paymentMethod?.startsWith('CRYPTO_')) {
      return res.status(400).json({ success: false, message: 'Криптовалюта временно недоступна' });
    }

    if (amount < minDeposit) {
      return res.status(400).json({ success: false, message: `Минимальная сумма депозита: ${minDeposit.toLocaleString('ru-RU')} ₽` });
    }

    if (amount > maxDeposit) {
      return res.status(400).json({ success: false, message: `Максимальная сумма депозита: ${maxDeposit.toLocaleString('ru-RU')} ₽` });
    }
    
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, payment_method, description)
       VALUES ($1, 'deposit', $2, $3, 'pending', $4, 'Пополнение баланса')
       RETURNING *`,
      [req.user.id, amount, currency, paymentMethod]
    );
    
    const transaction = result.rows[0];

    // Собираем данные клиента для AVE PAY
    const customer = {};
    if (req.user.email) customer.email = req.user.email;
    if (req.user.phone) customer.phone = req.user.phone;
    
    const avePayResponse = await avePayService.createDeposit({
      amount: parseFloat(amount),
      currency,
      transactionId: transaction.id,
      paymentMethod,
      userId: req.user.id,
      customer: Object.keys(customer).length > 0 ? customer : undefined
    });

    // AVE PAY wraps data in { status, result: { id, redirectUrl, ... } }
    const paymentResult = avePayResponse?.result || avePayResponse;

    // Сохраняем AVE PAY payment ID
    if (paymentResult?.id) {
      await pool.query(
        "UPDATE transactions SET wallet_address = $1 WHERE id = $2",
        [paymentResult.id, transaction.id]
      );
    }
    
    res.json({
      success: true,
      message: 'Перенаправляем на оплату',
      data: {
        transaction: {
          id: transaction.id,
          amount: parseFloat(transaction.amount),
          status: transaction.status,
          createdAt: transaction.created_at
        },
        redirectUrl: paymentResult?.redirectUrl || null,
        avePayId: paymentResult?.id || null
      }
    });
  } catch (error) {
    console.error('Create deposit error:', error);
    const avePayError = error.response?.data?.message || error.message;
    res.status(500).json({ success: false, message: `Ошибка создания платежа: ${avePayError}` });
  }
});

// Подтвердить депозит (вызывается webhook от платёжки или вручную)
router.post('/deposit/:id/confirm', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { withTransaction } = require('../utils/dbTransaction');
    
    const result = await withTransaction(pool, async (client) => {
      // Получаем транзакцию с блокировкой
      const txResult = await client.query(
        "SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND type = 'deposit' AND status = 'pending' FOR UPDATE",
        [id, req.user.id]
      );
      
      if (txResult.rows.length === 0) {
        throw { status: 404, message: 'Транзакция не найдена' };
      }
      
      const tx = txResult.rows[0];
      
      // Обновляем статус транзакции
      await client.query(
        "UPDATE transactions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      
      // Добавляем на баланс + обновляем total_deposited + deposit_count
      const userResult = await client.query(
        `UPDATE users SET balance = balance + $1, deposit_count = deposit_count + 1, 
         total_deposited = total_deposited + $1
         WHERE id = $2 RETURNING *`,
        [parseFloat(tx.amount), req.user.id]
      );
      
      const updatedUser = userResult.rows[0];
      const depositAmount = parseFloat(tx.amount);
      const newDepositCount = updatedUser.deposit_count;
      let bonusInfo = null;
      
      // Проверяем, выбрал ли пользователь бонус (selectedBonus в used_bonuses)
      const usedBonuses = updatedUser.used_bonuses || {};
      const selectedBonus = usedBonuses.selectedBonus;
      
      if (selectedBonus && selectedBonus.startsWith('deposit_')) {
        const depositNumber = parseInt(selectedBonus.replace('deposit_', ''));
        
        // Конфигурация бонусов
        const bonusConfig = DEPOSIT_BONUSES[depositNumber];
        
        // Проверяем: бонус для правильного депозита и ещё не был использован
        if (bonusConfig && depositNumber === newDepositCount) {
          const bonusAmount = Math.min(depositAmount * (bonusConfig.percent / 100), bonusConfig.maxBonus);
          const wagerRequired = (depositAmount + bonusAmount) * bonusConfig.wager;
          
          // Создаём бонус
          await client.query(
            `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
             VALUES ($1, $2, $3, $4, 0, 'active', NOW() + INTERVAL '30 days')`,
            [req.user.id, `deposit_${depositNumber}`, bonusAmount, wagerRequired]
          );
          
          // Зачисляем на бонусный баланс
          await client.query(
            'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
            [bonusAmount, req.user.id]
          );
          
          // Убираем selectedBonus
          await client.query(
            `UPDATE users SET used_bonuses = used_bonuses - 'selectedBonus' WHERE id = $1`,
            [req.user.id]
          );
          
          bonusInfo = {
            type: `deposit_${depositNumber}`,
            percent: bonusConfig.percent,
            bonusAmount,
            wagerRequired
          };
        }
      }
      
      return {
        amount: depositAmount,
        newBalance: parseFloat(updatedUser.balance) + depositAmount,
        depositNumber: newDepositCount,
        bonus: bonusInfo
      };
    });
    
    res.json({ success: true, message: 'Депозит подтверждён', data: result });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Confirm deposit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Создать заявку на вывод
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, paymentMethod = 'P2P_CARD', walletAddress, currency = 'RUB', cardNumber, phone, bankCode } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }

    if (amount < 1000) {
      return res.status(400).json({ success: false, message: 'Минимальная сумма вывода: 1 000 ₽' });
    }

    const feePercent = (paymentMethod === 'P2P_CARD' || paymentMethod === 'P2P_SBP') ? 5 : 2;
    const feeAmount = Math.round(amount * feePercent) / 100;
    const totalDeducted = amount + feeAmount;

    if (paymentMethod === 'P2P_CARD' && !cardNumber) {
      return res.status(400).json({ success: false, message: 'Укажите номер карты' });
    }

    if (paymentMethod === 'P2P_SBP' && !phone) {
      return res.status(400).json({ success: false, message: 'Укажите номер телефона' });
    }
    
    const { withTransaction } = require('../utils/dbTransaction');
    
    const transaction = await withTransaction(pool, async (client) => {
      // Check active bonuses with incomplete wager
      const activeBonuses = await client.query(
        `SELECT bonus_type, wagering_requirement, wagering_completed 
         FROM bonuses 
         WHERE user_id = $1 AND status = 'active' AND wagering_completed < wagering_requirement`,
        [req.user.id]
      );

      if (activeBonuses.rows.length > 0) {
        const bonus = activeBonuses.rows[0];
        const remaining = parseFloat(bonus.wagering_requirement) - parseFloat(bonus.wagering_completed);
        throw { 
          status: 400, 
          message: `Активный вейджер: осталось отыграть ₽${Math.ceil(remaining).toLocaleString('ru-RU')}. Отмените бонус в кошельке для вывода без отыгрыша.`
        };
      }

      const userResult = await client.query(
        'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
        [req.user.id]
      );
      if (userResult.rows.length === 0) {
        throw { status: 404, message: 'Пользователь не найден' };
      }
      const balance = parseFloat(userResult.rows[0].balance);
      
      if (totalDeducted > balance) {
        throw { status: 400, message: `Недостаточно средств. Сумма с комиссией ${feePercent}%: ${totalDeducted.toLocaleString('ru-RU')} ₽` };
      }
      
      await client.query(
        'UPDATE users SET balance = balance - $1, total_withdrawn = total_withdrawn + $1 WHERE id = $2',
        [totalDeducted, req.user.id]
      );
      
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, payment_method, wallet_address, description)
         VALUES ($1, 'withdrawal', $2, $3, 'pending', $4, $5, $6)
         RETURNING *`,
        [req.user.id, -totalDeducted, currency, paymentMethod, cardNumber || phone || walletAddress, `Вывод ${amount} ₽ (комиссия ${feePercent}%: ${feeAmount} ₽)`]
      );
      
      return txResult.rows[0];
    });

    const customer = {};
    if (req.user.email) customer.email = req.user.email;

    const avePayResponse = await avePayService.createWithdrawal({
      amount: parseFloat(amount),
      currency,
      transactionId: transaction.id,
      paymentMethod,
      userId: req.user.id,
      bankCode: bankCode || undefined,
      cardNumber: paymentMethod === 'P2P_CARD' ? cardNumber : undefined,
      phone: paymentMethod === 'P2P_SBP' ? phone : undefined,
      customer: Object.keys(customer).length > 0 ? customer : undefined
    });

    const paymentResult = avePayResponse?.result || avePayResponse;
    if (paymentResult?.id) {
      await pool.query(
        "UPDATE transactions SET wallet_address = $1 WHERE id = $2",
        [paymentResult.id, transaction.id]
      );
    }
    
    res.json({
      success: true,
      message: 'Заявка на вывод создана',
      data: {
        transaction: {
          id: transaction.id,
          amount: parseFloat(transaction.amount),
          status: transaction.status,
          createdAt: transaction.created_at
        },
        avePayId: paymentResult?.id || null,
        fee: { percent: feePercent, amount: feeAmount },
        netAmount: amount,
        totalDeducted
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Create withdrawal error:', error);
    const avePayError = error.response?.data?.message || error.message;
    res.status(500).json({ success: false, message: `Ошибка вывода: ${avePayError}` });
  }
});

// Отменить заявку на вывод
router.post('/withdraw/:id/cancel', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const txResult = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND type = 'withdrawal' AND status = 'pending'",
      [id, req.user.id]
    );
    
    if (txResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Транзакция не найдена' });
    }
    
    const tx = txResult.rows[0];
    const { withTransaction } = require('../utils/dbTransaction');
    
    await withTransaction(pool, async (client) => {
      // Отменяем транзакцию
      await client.query(
        "UPDATE transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      
      // Возвращаем деньги
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [Math.abs(parseFloat(tx.amount)), req.user.id]
      );
    });
    
    res.json({ success: true, message: 'Заявка отменена, средства возвращены' });
  } catch (error) {
    console.error('Cancel withdrawal error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить статистику платежей
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as total_deposits,
        COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'completed') as deposit_count,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as total_withdrawals,
        COUNT(*) FILTER (WHERE type = 'withdrawal' AND status = 'completed') as withdrawal_count,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal' AND status = 'pending'), 0) as pending_withdrawals
      FROM transactions
      WHERE user_id = $1
    `, [req.user.id]);
    
    const stats = result.rows[0];
    
    res.json({
      success: true,
      data: {
        totalDeposits: parseFloat(stats.total_deposits),
        depositCount: parseInt(stats.deposit_count),
        totalWithdrawals: parseFloat(stats.total_withdrawals),
        withdrawalCount: parseInt(stats.withdrawal_count),
        pendingWithdrawals: parseFloat(stats.pending_withdrawals)
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
