const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const avePayService = require('../services/avePayService');
const { withTransaction } = require('../utils/dbTransaction');
const { auth, adminAuth } = require('../middleware/auth');
const { DEPOSIT_BONUSES } = require('../config/bonusConfig');

// GET /api/payments/avepay/callback — health check for webhook URL
router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AVE PAY webhook endpoint is reachable', timestamp: new Date().toISOString() });
});

// GET /api/payments/avepay/callback/debug — check recent webhook activity (admin only)
router.get('/debug', adminAuth, async (req, res) => {
  try {
    const recentTx = await pool.query(
      `SELECT id, type, amount, status, payment_method, wallet_address, description, created_at, updated_at
       FROM transactions 
       WHERE wallet_address IS NOT NULL 
       ORDER BY updated_at DESC LIMIT 10`
    );

    const pendingDeposits = await pool.query(
      `SELECT id, user_id, amount, status, payment_method, wallet_address, created_at 
       FROM transactions 
       WHERE type = 'deposit' AND status = 'pending' 
       ORDER BY created_at DESC LIMIT 10`
    );

    const config = require('../config/config');

    res.json({
      success: true,
      data: {
        webhookUrl: config.avePay.callbackUrl || `${config.server.frontendUrl}/api/payments/avepay/callback`,
        returnUrl: config.avePay.returnUrl,
        webhookSecretSet: !!config.avePay.webhookSecret,
        recentAvePayTransactions: recentTx.rows,
        pendingDeposits: pendingDeposits.rows
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payments/avepay/callback/test — simulate a webhook for a pending deposit (admin only)
router.post('/test', adminAuth, async (req, res) => {
  try {
    const { transactionId, action = 'complete' } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId required' });
    }

    const txResult = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND status = 'pending'",
      [transactionId]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pending transaction not found' });
    }

    const tx = txResult.rows[0];
    const fakeAvePayId = `test_${Date.now()}`;

    if (action === 'complete') {
      if (tx.type === 'deposit') {
        await handleDepositCompleted(tx.id, fakeAvePayId, {});
      } else if (tx.type === 'withdrawal') {
        await handleWithdrawalCompleted(tx.id, fakeAvePayId);
      }
    } else if (action === 'decline') {
      if (tx.type === 'deposit') {
        await handleDepositFailed(tx.id, fakeAvePayId, 'DECLINED');
      } else if (tx.type === 'withdrawal') {
        await handleWithdrawalFailed(tx.id, fakeAvePayId, 'DECLINED');
      }
    }

    const updated = await pool.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
    const user = await pool.query('SELECT id, username, balance, bonus_balance FROM users WHERE id = $1', [tx.user_id]);

    res.json({
      success: true,
      message: `Transaction ${transactionId} ${action}d via test webhook`,
      data: {
        transaction: updated.rows[0],
        userBalance: user.rows[0]
      }
    });
  } catch (error) {
    console.error('[AvePay Test Webhook] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// AVE PAY webhook — receives payment status updates
// Statuses: COMPLETED, DECLINED, CANCELLED
router.post('/', async (req, res) => {
  try {
    // Body is already parsed by express.json() in server.js
    const payload = req.body?.result || req.body;
    console.log('[AvePay Webhook] Received:', JSON.stringify(req.body).slice(0, 800));

    const { id: avePayId, state, paymentType, referenceId, amount, currency } = payload;

    if (!referenceId || !state) {
      console.warn('[AvePay Webhook] Missing referenceId or state');
      return res.status(200).json({ received: true });
    }

    // Extract our transaction ID from referenceId (format: "deposit_123" or "withdrawal_456")
    const parts = referenceId.split('_');
    const txType = parts[0]; // "deposit" or "withdrawal"
    const txId = parseInt(parts.slice(1).join('_'));

    if (!txId || isNaN(txId)) {
      console.warn('[AvePay Webhook] Could not parse transaction ID from referenceId:', referenceId);
      return res.status(200).json({ received: true });
    }

    if (state === 'COMPLETED') {
      if (txType === 'deposit') {
        await handleDepositCompleted(txId, avePayId, payload);
      } else if (txType === 'withdrawal') {
        await handleWithdrawalCompleted(txId, avePayId);
      }
    } else if (state === 'DECLINED' || state === 'CANCELLED') {
      if (txType === 'deposit') {
        await handleDepositFailed(txId, avePayId, state);
      } else if (txType === 'withdrawal') {
        await handleWithdrawalFailed(txId, avePayId, state);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[AvePay Webhook] Processing error:', error);
    res.status(200).json({ received: true });
  }
});

async function handleDepositCompleted(txId, avePayId, payload) {
  await withTransaction(pool, async (client) => {
    const txResult = await client.query(
      "SELECT * FROM transactions WHERE id = $1 AND type = 'deposit' AND status = 'pending' FOR UPDATE",
      [txId]
    );

    if (txResult.rows.length === 0) {
      console.log(`[AvePay] Deposit ${txId} already processed or not found`);
      return;
    }

    const tx = txResult.rows[0];
    const depositAmount = parseFloat(tx.amount);
    const userId = tx.user_id;

    // Mark transaction completed, store AVE PAY payment ID
    await client.query(
      "UPDATE transactions SET status = 'completed', payment_method = COALESCE(payment_method, 'avepay'), wallet_address = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [txId, avePayId]
    );

    // Credit user balance
    const userResult = await client.query(
      `UPDATE users SET balance = balance + $1, deposit_count = deposit_count + 1, 
       total_deposited = total_deposited + $1
       WHERE id = $2 RETURNING *`,
      [depositAmount, userId]
    );

    const updatedUser = userResult.rows[0];
    const newDepositCount = updatedUser.deposit_count;

    // Welcome bonus logic (same as payments.js /deposit/:id/confirm)
    const usedBonuses = updatedUser.used_bonuses || {};
    const selectedBonus = usedBonuses.selectedBonus;

    if (selectedBonus && selectedBonus.startsWith('deposit_')) {
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

        console.log(`[AvePay] Bonus applied: deposit_${depositNumber} = ${bonusAmount} RUB for user ${userId}`);
      }
    }

    console.log(`[AvePay] Deposit ${txId} completed: +${depositAmount} ${tx.currency} for user ${userId}`);
  });
}

async function handleDepositFailed(txId, avePayId, state) {
  await pool.query(
    "UPDATE transactions SET status = 'failed', wallet_address = $2, description = CONCAT(description, ' [', $3::text, ']'), updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'",
    [txId, avePayId, state]
  );
  console.log(`[AvePay] Deposit ${txId} ${state}`);
}

async function handleWithdrawalCompleted(txId, avePayId) {
  await pool.query(
    "UPDATE transactions SET status = 'completed', wallet_address = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'",
    [txId, avePayId]
  );
  console.log(`[AvePay] Withdrawal ${txId} completed`);
}

async function handleWithdrawalFailed(txId, avePayId, state) {
  await withTransaction(pool, async (client) => {
    const txResult = await client.query(
      "SELECT * FROM transactions WHERE id = $1 AND type = 'withdrawal' AND status = 'pending' FOR UPDATE",
      [txId]
    );

    if (txResult.rows.length === 0) return;
    const tx = txResult.rows[0];

    await client.query(
      "UPDATE transactions SET status = 'failed', wallet_address = $2, description = CONCAT(description, ' [', $3::text, ']'), updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [txId, avePayId, state]
    );

    // Refund user balance on failed withdrawal
    await client.query(
      'UPDATE users SET balance = balance + $1, total_withdrawn = total_withdrawn - $1 WHERE id = $2',
      [Math.abs(parseFloat(tx.amount)), tx.user_id]
    );

    console.log(`[AvePay] Withdrawal ${txId} ${state}, funds returned to user ${tx.user_id}`);
  });
}

module.exports = router;
