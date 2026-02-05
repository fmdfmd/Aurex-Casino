const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

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
    
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    
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

// Создать депозит
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, paymentMethod, currency = 'RUB' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }
    
    // Создаём транзакцию
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, payment_method, description)
       VALUES ($1, 'deposit', $2, $3, 'pending', $4, 'Пополнение баланса')
       RETURNING *`,
      [req.user.id, amount, currency, paymentMethod]
    );
    
    const transaction = result.rows[0];
    
    // Генерируем платёжные данные (заглушка для реального платёжного шлюза)
    const paymentData = {
      transactionId: transaction.id,
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      // Для криптовалют
      walletAddress: paymentMethod === 'btc' ? '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2' :
                     paymentMethod === 'eth' ? '0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab12' :
                     paymentMethod === 'usdt' ? 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9' : null,
      // Для СБП
      sbpLink: paymentMethod === 'sbp' ? `https://qr.nspk.ru/pay?amount=${amount}&purpose=AUREX` : null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 минут
    };
    
    res.json({
      success: true,
      message: 'Заявка на депозит создана',
      data: {
        transaction: {
          id: transaction.id,
          amount: parseFloat(transaction.amount),
          status: transaction.status,
          createdAt: transaction.created_at
        },
        paymentData
      }
    });
  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Подтвердить депозит (вызывается webhook от платёжки или вручную)
router.post('/deposit/:id/confirm', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем транзакцию
    const txResult = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND type = 'deposit' AND status = 'pending'",
      [id, req.user.id]
    );
    
    if (txResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Транзакция не найдена' });
    }
    
    const tx = txResult.rows[0];
    
    // Обновляем статус транзакции
    await pool.query(
      "UPDATE transactions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );
    
    // Добавляем на баланс
    await pool.query(
      'UPDATE users SET balance = balance + $1, deposit_count = deposit_count + 1 WHERE id = $2',
      [parseFloat(tx.amount), req.user.id]
    );
    
    // Получаем обновлённый баланс
    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    
    res.json({
      success: true,
      message: 'Депозит подтверждён',
      data: {
        amount: parseFloat(tx.amount),
        newBalance: parseFloat(userResult.rows[0].balance)
      }
    });
  } catch (error) {
    console.error('Confirm deposit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Создать заявку на вывод
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, paymentMethod, walletAddress, currency = 'RUB' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }
    
    // Получаем баланс пользователя
    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    const balance = parseFloat(userResult.rows[0].balance);
    
    if (amount > balance) {
      return res.status(400).json({ success: false, message: 'Недостаточно средств' });
    }
    
    // Минимальные суммы вывода
    const minWithdraw = {
      btc: 1000, eth: 1000, usdt: 1000, ltc: 1000,
      card: 2000, sbp: 1000, qiwi: 1000, yoomoney: 1000
    };
    
    if (amount < (minWithdraw[paymentMethod] || 1000)) {
      return res.status(400).json({ 
        success: false, 
        message: `Минимальная сумма вывода: ₽${minWithdraw[paymentMethod] || 1000}` 
      });
    }
    
    // Блокируем средства (списываем с баланса сразу)
    await pool.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [amount, req.user.id]
    );
    
    // Создаём транзакцию
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, payment_method, wallet_address, description)
       VALUES ($1, 'withdrawal', $2, $3, 'pending', $4, $5, 'Вывод средств')
       RETURNING *`,
      [req.user.id, -amount, currency, paymentMethod, walletAddress]
    );
    
    res.json({
      success: true,
      message: 'Заявка на вывод создана',
      data: {
        transaction: result.rows[0],
        estimatedTime: '1-24 часа'
      }
    });
  } catch (error) {
    console.error('Create withdrawal error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    
    // Отменяем транзакцию
    await pool.query(
      "UPDATE transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );
    
    // Возвращаем деньги
    await pool.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [Math.abs(parseFloat(tx.amount)), req.user.id]
    );
    
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
