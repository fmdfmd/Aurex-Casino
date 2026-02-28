const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const rukassaService = require('../services/rukassaService');
const { DEPOSIT_BONUSES } = require('../config/bonusConfig');

async function handleCallback(req, res) {
  try {
    const body = { ...req.query, ...req.body };
    console.log('[Rukassa Callback] Received:', JSON.stringify(body));

    const { id, order_id, amount, in_amount, status, createdDateTime } = body;

    if (!order_id || !status) {
      console.warn('[Rukassa Callback] Missing required fields');
      return res.status(400).send('Bad Request');
    }

    // Verify HMAC-SHA256 signature from header
    const signature = req.headers['signature'] || req.headers['http_signature'];
    if (signature) {
      const isValid = rukassaService.verifyWebhook(id, createdDateTime, amount, signature);
      if (!isValid) {
        console.error('[Rukassa Callback] Invalid signature');
        return res.status(403).send('ERROR SIGN');
      }
    }

    // Parse our transaction ID from order_id (format: dep_TXID)
    const match = String(order_id).match(/^dep_(\d+)$/);
    if (!match) {
      console.warn('[Rukassa Callback] Unknown order_id format:', order_id);
      return res.status(200).send('OK');
    }

    const txId = parseInt(match[1]);
    const txResult = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND type = 'deposit'",
      [txId]
    );

    if (txResult.rows.length === 0) {
      console.warn('[Rukassa Callback] Transaction not found:', txId);
      return res.status(200).send('OK');
    }

    const tx = txResult.rows[0];

    if (status === 'PAID') {
      if (tx.status === 'completed') {
        console.log('[Rukassa Callback] Already completed:', txId);
        return res.status(200).send('OK');
      }

      // Check paid amount
      const paidAmount = parseFloat(in_amount || 0);
      const expectedAmount = parseFloat(amount || tx.amount || 0);
      if (paidAmount > 0 && paidAmount < expectedAmount * 0.99) {
        console.error(`[Rukassa Callback] Amount mismatch: paid=${paidAmount} expected=${expectedAmount}`);
        return res.status(200).send('ERROR AMOUNT');
      }

      const depositAmount = paidAmount > 0 ? paidAmount : parseFloat(tx.amount);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          "UPDATE transactions SET status = 'completed', description = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [`Пополнение баланса [RUKASSA]`, txId]
        );

        const userResult = await client.query(
          `UPDATE users SET balance = balance + $1, deposit_count = deposit_count + 1,
           total_deposited = total_deposited + $1
           WHERE id = $2 RETURNING *`,
          [depositAmount, tx.user_id]
        );

        const updatedUser = userResult.rows[0];
        const newDepositCount = updatedUser.deposit_count;

        // Welcome bonus
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
              [tx.user_id, `deposit_${depositNumber}`, bonusAmount, wagerRequired]
            );
            await client.query(
              'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
              [bonusAmount, tx.user_id]
            );
            await client.query(
              `UPDATE users SET used_bonuses = used_bonuses - 'selectedBonus' WHERE id = $1`,
              [tx.user_id]
            );
            console.log(`[Rukassa Callback] Bonus applied: deposit_${depositNumber} = ${bonusAmount} RUB for user ${tx.user_id}`);
          }
        }

        await client.query('COMMIT');
        console.log(`[Rukassa Callback] Deposit completed: user=${tx.user_id} amount=${depositAmount}`);

        // FTD postback (non-blocking)
        if (newDepositCount === 1) {
          const { fireFtdPostback } = require('../services/postbackService');
          fireFtdPostback(tx.user_id).catch(err => console.error('[Rukassa] FTD postback error:', err.message));
        }
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

    } else if (status === 'CANCEL') {
      await pool.query(
        "UPDATE transactions SET status = 'failed', description = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status = 'pending'",
        ['Отменено [RUKASSA]', txId]
      );
      console.log(`[Rukassa Callback] Payment cancelled: tx=${txId}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Rukassa Callback] Error:', error.message);
    res.status(200).send('OK');
  }
}

router.get('/', handleCallback);
router.post('/', handleCallback);

module.exports = router;
