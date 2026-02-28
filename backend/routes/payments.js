const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const avePayService = require('../services/avePayService');
const nirvanaPayService = require('../services/nirvanaPayService');
const expayService = require('../services/expayService');
const rukassaService = require('../services/rukassaService');
const { DEPOSIT_BONUSES } = require('../config/bonusConfig');

function isNirvanaMethod(method) {
  return method && method.startsWith('NIRVANA_');
}

function isExpayMethod(method) {
  return method && method.startsWith('EXPAY_');
}

function isRukassaMethod(method) {
  return method && method.startsWith('RUKASSA_');
}

function getNirvanaToken(method) {
  const map = {
    'NIRVANA_SBP': 'СБП',
    'NIRVANA_C2C': 'Межбанк',
    'NIRVANA_NSPK': 'НСПК',
    'NIRVANA_SBER': 'Сбербанк',
    'NIRVANA_SBER_SBP': 'СБЕР СБП',
    'NIRVANA_ALFA': 'Альфабанк',
    'NIRVANA_ALFA_SBP': 'Альфа СБП',
    'NIRVANA_VTB': 'ВТБ',
    'NIRVANA_VTB_SBP': 'ВТБ СБП',
    'NIRVANA_TRANS_SBP': 'ТрансСБП',
    'NIRVANA_TRANS_C2C': 'ТрансМежбанк',
    'NIRVANA_MOBILE': 'Мобильная Коммерция'
  };
  return map[method] || 'СБП';
}

// Получить историю транзакций пользователя
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, type } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (Math.max(1, parseInt(page)) - 1) * limit;
    
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const values = [req.user.id];
    
    if (type && type !== 'all') {
      values.push(type);
      query += ` AND type = $${values.length}`;
    }
    
    values.push(limit);
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
          page: Math.max(1, parseInt(page)),
          limit,
          total: parseInt(countResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: 'Ошибка загрузки истории' });
  }
});

// Создать депозит (AVE PAY для 3000+, Nirvana Pay для 100-2999)
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, paymentMethod = 'P2P_CARD', currency = 'RUB', nspkPhone } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }

    if (paymentMethod === 'CRYPTO' || paymentMethod?.startsWith('CRYPTO_')) {
      return res.status(400).json({ success: false, message: 'Криптовалюта временно недоступна' });
    }

    const useNirvana = isNirvanaMethod(paymentMethod);
    const useExpay = isExpayMethod(paymentMethod);
    const useRukassa = isRukassaMethod(paymentMethod);

    // Rate limit: max 5 Nirvana deposit attempts per 15 minutes
    if (useNirvana) {
      const windowStart = new Date(Date.now() - 15 * 60 * 1000);
      const recentAttempts = await pool.query(
        `SELECT COUNT(*) as cnt FROM transactions
         WHERE user_id = $1 AND type = 'deposit'
           AND payment_method ILIKE 'NIRVANA_%'
           AND created_at >= $2`,
        [req.user.id, windowStart]
      );
      if (parseInt(recentAttempts.rows[0].cnt) >= 5) {
        return res.status(429).json({
          success: false,
          message: 'Вы создали слишком много заявок. Попробуйте через 15 минут.'
        });
      }
    }

    const minDeposits = {
      'P2P_CARD': 5000, 'P2P_SBP': 3000,
      'NIRVANA_SBP': 100, 'NIRVANA_C2C': 100,
      'NIRVANA_NSPK': 1000,
      'NIRVANA_SBER': 1000, 'NIRVANA_SBER_SBP': 1000,
      'NIRVANA_ALFA': 1000, 'NIRVANA_ALFA_SBP': 1000,
      'NIRVANA_VTB': 1000, 'NIRVANA_VTB_SBP': 1000,
      'NIRVANA_TRANS_SBP': 500, 'NIRVANA_TRANS_C2C': 500,
      'NIRVANA_MOBILE': 100,
      'EXPAY_SBER': 500, 'EXPAY_SBP': 500,
      'EXPAY_CARD': 500, 'EXPAY_NSPK': 500,
      'EXPAY_SBERQR': 100,
      'RUKASSA_CARD': 1000, 'RUKASSA_SBP': 1000,
      'RUKASSA_CRYPTO': 100
    };
    const maxDeposits = {
      'P2P_CARD': 300000, 'P2P_SBP': 300000,
      'NIRVANA_SBP': 100000, 'NIRVANA_C2C': 100000,
      'NIRVANA_NSPK': 150000,
      'NIRVANA_TRANS_SBP': 100000, 'NIRVANA_TRANS_C2C': 100000,
      'NIRVANA_MOBILE': 100000,
      'EXPAY_SBER': 300000, 'EXPAY_SBP': 300000,
      'EXPAY_CARD': 300000, 'EXPAY_NSPK': 300000,
      'EXPAY_SBERQR': 100000
    };
    const minDeposit = minDeposits[paymentMethod] || 100;
    const maxDeposit = maxDeposits[paymentMethod] || 300000;

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

    if (useNirvana) {
      const token = getNirvanaToken(paymentMethod);

      let nirvanaResponse;
      try {
        nirvanaResponse = await nirvanaPayService.createDepositH2H({
          amount: parseFloat(amount),
          transactionId: transaction.id,
          token,
          currency,
          userIp: req.ip,
          userAgent: req.headers['user-agent'],
          userEmail: req.user.email || undefined,
          userId: req.user.id
        });
      } catch (nirvanaErr) {
        const reason = nirvanaErr.response?.data?.reason || nirvanaErr.message;
        console.error(`[NirvanaPay] Deposit failed for tx ${transaction.id}: ${reason}`);
        await pool.query("UPDATE transactions SET status = 'failed' WHERE id = $1", [transaction.id]);

        if (reason && reason.includes('ликвидность')) {
          return res.status(400).json({ success: false, message: 'Метод временно недоступен. Попробуйте другой способ оплаты.' });
        }
        if (reason && reason.includes('лимит')) {
          return res.status(400).json({ success: false, message: 'Сумма выходит за пределы лимита. Измените сумму или способ оплаты.' });
        }
        return res.status(400).json({ success: false, message: `Платёж не создан: ${reason}` });
      }

      await pool.query(
        "UPDATE transactions SET wallet_address = $1 WHERE id = $2",
        [nirvanaResponse.clientID, transaction.id]
      );

      return res.json({
        success: true,
        message: 'Переведите средства по указанным реквизитам',
        data: {
          transaction: {
            id: transaction.id,
            amount: parseFloat(transaction.amount),
            status: transaction.status,
            createdAt: transaction.created_at
          },
          provider: 'nirvana',
          nirvanaDetails: {
            receiver: nirvanaResponse.receiver,
            bankName: nirvanaResponse.bankName,
            recipientName: nirvanaResponse.recipientName
          },
          redirectUrl: null,
          avePayId: null
        }
      });
    }

    if (useExpay) {
      const { token: expayToken, subToken } = expayService.getDepositTokens(paymentMethod);

      let expayResponse;
      try {
        expayResponse = await expayService.createDeposit({
          amount: parseFloat(amount),
          transactionId: transaction.id,
          token: expayToken,
          subToken,
          userId: req.user.id,
          userIp: req.ip,
          userAgent: req.headers['user-agent'],
          userPhone: req.user.phone || nspkPhone || undefined,
          redirectUrl: `https://${req.headers['x-forwarded-host'] || req.headers.host || 'aurex1.casino'}/wallet`
        });
      } catch (expayErr) {
        const reason = expayErr.response?.data?.description || expayErr.message;
        console.error(`[Expay] Deposit failed for tx ${transaction.id}: ${reason}`);
        await pool.query("UPDATE transactions SET status = 'failed' WHERE id = $1", [transaction.id]);
        return res.status(400).json({ success: false, message: `Платёж не создан: ${reason}` });
      }

      if (expayResponse.trackerId) {
        await pool.query(
          "UPDATE transactions SET wallet_address = $1 WHERE id = $2",
          [expayResponse.trackerId, transaction.id]
        );
      }

      return res.json({
        success: true,
        message: 'Перенаправляем на оплату',
        data: {
          transaction: {
            id: transaction.id,
            amount: parseFloat(transaction.amount),
            status: transaction.status,
            createdAt: transaction.created_at
          },
          provider: 'expay',
          redirectUrl: expayResponse.redirectUrl || null,
          avePayId: null
        }
      });
    }

    // RUKASSA flow
    if (useRukassa) {
      const rukassaResponse = await rukassaService.createPayment({
        amount: parseFloat(amount),
        transactionId: transaction.id,
        userId: req.user.id,
        paymentMethod
      });

      await pool.query(
        "UPDATE transactions SET wallet_address = $1 WHERE id = $2",
        [String(rukassaResponse.rukassaId), transaction.id]
      );

      return res.json({
        success: true,
        message: 'Перенаправляем на оплату',
        data: {
          transaction: {
            id: transaction.id,
            amount: parseFloat(transaction.amount),
            status: transaction.status,
            createdAt: transaction.created_at
          },
          provider: 'rukassa',
          redirectUrl: rukassaResponse.paymentUrl,
          rukassaId: rukassaResponse.rukassaId
        }
      });
    }

    // AVE PAY flow — check for existing pending deposit (max 1 active per user)
    const existingPending = await pool.query(
      `SELECT id, wallet_address, created_at FROM transactions 
       WHERE user_id = $1 AND type = 'deposit' AND status = 'pending' 
         AND payment_method IN ('P2P_SBP','P2P_CARD')
         AND created_at > NOW() - INTERVAL '20 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (existingPending.rows.length > 0) {
      const existing = existingPending.rows[0];
      // Cancel the newly created transaction since we'll reuse the existing one
      await pool.query("DELETE FROM transactions WHERE id = $1", [transaction.id]);

      // Get redirect URL from AVE PAY for existing payment
      let redirectUrl = null;
      if (existing.wallet_address) {
        try {
          const statusRes = await avePayService.getPaymentStatus(existing.wallet_address);
          redirectUrl = statusRes?.result?.redirectUrl || null;
        } catch (e) {
          console.warn('[AvePay] Could not fetch existing payment status:', e.message);
        }
      }

      return res.json({
        success: true,
        message: 'У вас уже есть активная заявка на пополнение',
        data: {
          transaction: { id: existing.id, amount: parseFloat(amount), status: 'pending', createdAt: existing.created_at },
          provider: 'avepay',
          redirectUrl,
          avePayId: existing.wallet_address
        }
      });
    }

    const customer = {};
    if (req.user.email) customer.email = req.user.email;
    if (req.user.phone) customer.phone = req.user.phone;

    const avePayMethod = paymentMethod;
    
    const avePayResponse = await avePayService.createDeposit({
      amount: parseFloat(amount),
      currency,
      transactionId: transaction.id,
      paymentMethod: avePayMethod,
      userId: req.user.id,
      customer: Object.keys(customer).length > 0 ? customer : undefined,
      originUrl: req.headers.origin || req.headers.referer?.replace(/\/[^/]*$/, '') || undefined
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
      message: 'Перенаправляем на оплату',
      data: {
        transaction: {
          id: transaction.id,
          amount: parseFloat(transaction.amount),
          status: transaction.status,
          createdAt: transaction.created_at
        },
        provider: 'avepay',
        redirectUrl: paymentResult?.redirectUrl || null,
        avePayId: paymentResult?.id || null
      }
    });
  } catch (error) {
    const providerError = error.response?.data?.message || error.response?.data?.reason || error.message;
    console.error('Create deposit error:', providerError);
    res.status(500).json({ success: false, message: 'Ошибка создания платежа. Попробуйте другой метод.' });
  }
});

// Подтвердить депозит (только admin — для ручного зачисления, основной путь через webhook AVE PAY)
router.post('/deposit/:id/confirm', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId required' });
    }
    const { withTransaction } = require('../utils/dbTransaction');
    
    const result = await withTransaction(pool, async (client) => {
      const txResult = await client.query(
        "SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND type = 'deposit' AND status = 'pending' FOR UPDATE",
        [id, userId]
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
      
      const userResult = await client.query(
        `UPDATE users SET balance = balance + $1, deposit_count = deposit_count + 1, 
         total_deposited = total_deposited + $1
         WHERE id = $2 RETURNING *`,
        [parseFloat(tx.amount), userId]
      );
      
      const updatedUser = userResult.rows[0];
      const depositAmount = parseFloat(tx.amount);
      const newDepositCount = updatedUser.deposit_count;
      let bonusInfo = null;
      
      const usedBonuses = updatedUser.used_bonuses || {};
      const selectedBonus = usedBonuses.selectedBonus;

      // Блокируем бонусы для мультиакк-подозреваемых
      if (updatedUser.is_suspicious) {
        console.warn(`[MultiAcc] Bonus blocked for suspected multi-account user ${userId} (${updatedUser.username})`);
      } else if (selectedBonus && selectedBonus.startsWith('deposit_')) {
        const depositNumber = parseInt(selectedBonus.replace('deposit_', ''));
        const bonusConfig = DEPOSIT_BONUSES[depositNumber];
        
        if (bonusConfig && depositNumber === newDepositCount) {
          const bonusAmount = Math.min(depositAmount * (bonusConfig.percent / 100), bonusConfig.maxBonus);
          const wagerRequired = (depositAmount + bonusAmount) * bonusConfig.wager;
          
          await client.query(
            `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
             VALUES ($1, $2, $3, $4, 0, 'active', NOW() + INTERVAL '30 days')`,
            [userId, `deposit_${depositNumber}`, bonusAmount, wagerRequired]
          );
          
          await client.query(
            'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
            [bonusAmount, userId]
          );
          
          await client.query(
            `UPDATE users SET used_bonuses = used_bonuses - 'selectedBonus' WHERE id = $1`,
            [userId]
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
    res.status(500).json({ success: false, message: 'Ошибка подтверждения депозита' });
  }
});

// Создать заявку на вывод
router.post('/withdraw', auth, async (req, res) => {
  try {
    const { amount, paymentMethod = 'P2P_CARD', walletAddress, currency = 'RUB', cardNumber, phone, bankCode, bankName } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }

    // Защита от спама — не более 1 попытки вывода за 15 минут при наличии недавней ошибки
    const recentFailed = await pool.query(
      `SELECT id, created_at FROM transactions
       WHERE user_id = $1 AND type = 'withdrawal' AND status = 'failed'
         AND created_at > NOW() - INTERVAL '15 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (recentFailed.rows.length > 0) {
      const failedAt = new Date(recentFailed.rows[0].created_at);
      const retryAt = new Date(failedAt.getTime() + 15 * 60 * 1000);
      const minutesLeft = Math.ceil((retryAt - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Предыдущая заявка не была обработана. Пожалуйста, попробуйте через ${minutesLeft} мин.`
      });
    }

    // Не более 1 активной (pending) заявки на вывод одновременно
    const pendingWithdraw = await pool.query(
      `SELECT id FROM transactions
       WHERE user_id = $1 AND type = 'withdrawal' AND status = 'pending'
         AND created_at > NOW() - INTERVAL '15 minutes'
       LIMIT 1`,
      [req.user.id]
    );
    if (pendingWithdraw.rows.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'У вас уже есть активная заявка на вывод. Пожалуйста, подождите 15 минут.'
      });
    }

    const minWithdrawMap = {
      'P2P_SBP': 5000, 'P2P_CARD': 5000,
      'NIRVANA_SBP': 1000, 'NIRVANA_C2C': 1000,
      'RUKASSA_CARD': 5000, 'RUKASSA_SBP': 5000,
      'RUKASSA_CRYPTO': 1000
    };
    const minWithdraw = minWithdrawMap[paymentMethod] || 1000;
    if (amount < minWithdraw) {
      return res.status(400).json({ success: false, message: `Минимальная сумма вывода: ${minWithdraw.toLocaleString('ru-RU')} ₽` });
    }

    const feePercent = 5;
    const feeAmount = Math.round(amount * feePercent) / 100;
    const totalDeducted = amount + feeAmount;

    const needsCard = ['P2P_CARD', 'NIRVANA_C2C', 'NIRVANA_TRANS_C2C', 'EXPAY_SBER', 'EXPAY_CARD', 'RUKASSA_CARD'].includes(paymentMethod);
    const needsPhone = ['P2P_SBP', 'NIRVANA_SBP', 'NIRVANA_SBER_SBP', 'NIRVANA_ALFA_SBP', 'NIRVANA_VTB_SBP', 'NIRVANA_TRANS_SBP', 'EXPAY_SBP', 'RUKASSA_SBP'].includes(paymentMethod);
    const needsWallet = paymentMethod === 'RUKASSA_CRYPTO';

    if (needsCard && !cardNumber) {
      return res.status(400).json({ success: false, message: 'Укажите номер карты' });
    }

    if (needsPhone && !phone) {
      return res.status(400).json({ success: false, message: 'Укажите номер телефона' });
    }

    if (needsWallet && !walletAddress) {
      return res.status(400).json({ success: false, message: 'Укажите адрес крипто-кошелька' });
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
        [req.user.id, -totalDeducted, currency, paymentMethod, cardNumber || phone || walletAddress, `Вывод ${amount} ₽${bankName ? ' — ' + bankName : ''} (комиссия ${feePercent}%: ${feeAmount} ₽)`]
      );
      
      return txResult.rows[0];
    });

    if (isRukassaMethod(paymentMethod)) {
      const wayMap = { 'RUKASSA_CARD': 'CARD', 'RUKASSA_SBP': 'SBP', 'RUKASSA_CRYPTO': 'USDT' };
      const way = wayMap[paymentMethod] || 'CARD';
      const wallet = cardNumber || phone || walletAddress;

      try {
        const rukassaRes = await rukassaService.createWithdraw({
          amount,
          wallet,
          way,
          orderId: `wd_${transaction.id}`
        });

        await pool.query(
          "UPDATE transactions SET wallet_address = $1, status = 'pending' WHERE id = $2",
          [String(rukassaRes.id || ''), transaction.id]
        );

        return res.json({
          success: true,
          message: 'Заявка на вывод создана. Ожидайте обработки.',
          data: { transaction: { id: transaction.id, amount: -totalDeducted, status: 'pending' } }
        });
      } catch (err) {
        await pool.query(
          "UPDATE transactions SET status = 'failed' WHERE id = $1",
          [transaction.id]
        );
        await pool.query(
          'UPDATE users SET balance = balance + $1, total_withdrawn = total_withdrawn - $1 WHERE id = $2',
          [totalDeducted, req.user.id]
        );
        const errMsg = err.message || 'Ошибка создания выплаты';
        console.error('[Rukassa] Withdraw error:', errMsg);
        return res.status(400).json({ success: false, message: errMsg });
      }
    }

    if (isNirvanaMethod(paymentMethod)) {
      // Создаём заявку как pending — НЕ вызываем Nirvana API сразу.
      // Выплата произойдёт только когда админ нажмёт "Выплатить" в транзакциях.
      return res.json({
        success: true,
        message: 'Заявка на вывод создана. Ожидайте обработки.',
        data: {
          transaction: {
            id: transaction.id,
            amount: parseFloat(transaction.amount),
            status: 'pending',
            createdAt: transaction.created_at
          },
          provider: 'nirvana',
          fee: { percent: feePercent, amount: feeAmount },
          netAmount: amount,
          totalDeducted
        }
      });
    }

    if (isExpayMethod(paymentMethod)) {
      const { token: expayToken, subToken } = expayService.getWithdrawTokens(paymentMethod);
      const isExpayCard = ['EXPAY_SBER', 'EXPAY_CARD'].includes(paymentMethod);
      const receiver = isExpayCard ? (cardNumber || '').replace(/\s/g, '') : (phone ? `7${phone}` : '');

      let expayResponse;
      try {
        expayResponse = await expayService.createWithdrawal({
          amount: parseFloat(amount),
          transactionId: transaction.id,
          token: expayToken,
          subToken,
          receiver,
          recipientName: '',
          clientIp: req.ip
        });
      } catch (expayErr) {
        const reason = expayErr.response?.data?.description || expayErr.message;
        console.error(`[Expay] Withdrawal failed for tx ${transaction.id}: ${reason}`);
        await pool.query(
          'UPDATE users SET balance = balance + $1, total_withdrawn = total_withdrawn - $1 WHERE id = $2',
          [totalDeducted, req.user.id]
        );
        await pool.query("UPDATE transactions SET status = 'failed' WHERE id = $1", [transaction.id]);
        return res.status(400).json({ success: false, message: `Вывод не создан: ${reason}` });
      }

      if (expayResponse.trackerId) {
        await pool.query(
          "UPDATE transactions SET wallet_address = $1 WHERE id = $2",
          [expayResponse.trackerId, transaction.id]
        );
      }

      return res.json({
        success: true,
        message: 'Заявка на вывод создана',
        data: {
          transaction: {
            id: transaction.id,
            amount: parseFloat(transaction.amount),
            status: transaction.status,
            createdAt: transaction.created_at
          },
          provider: 'expay',
          fee: { percent: feePercent, amount: feeAmount },
          netAmount: amount,
          totalDeducted
        }
      });
    }

    // AVE PAY withdrawal flow (existing)
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
        provider: 'avepay',
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
    const { withTransaction } = require('../utils/dbTransaction');
    
    await withTransaction(pool, async (client) => {
      const txResult = await client.query(
        "SELECT * FROM transactions WHERE id = $1 AND user_id = $2 AND type = 'withdrawal' AND status = 'pending' FOR UPDATE",
        [id, req.user.id]
      );
      
      if (txResult.rows.length === 0) {
        throw { status: 404, message: 'Транзакция не найдена' };
      }
      
      const tx = txResult.rows[0];
      
      await client.query(
        "UPDATE transactions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [Math.abs(parseFloat(tx.amount)), req.user.id]
      );
    });
    
    res.json({ success: true, message: 'Заявка отменена, средства возвращены' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Cancel withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Internal error' });
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
    res.status(500).json({ success: false, message: 'Ошибка загрузки статистики' });
  }
});

module.exports = router;
