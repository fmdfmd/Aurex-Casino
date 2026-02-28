const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const rukassaService = require('../services/rukassaService');

async function handleCallback(req, res) {
  try {
    const data = { ...req.query, ...req.body };
    console.log('[Rukassa Callback] Received:', data);

    const { order_id, amount, in_amount, status, sign, shop_id } = data;

    if (!order_id || !status) {
      console.warn('[Rukassa Callback] Missing required fields');
      return res.status(400).send('Bad Request');
    }

    // Verify signature
    const TOKEN = process.env.RUKASSA_TOKEN || 'bf451c373f382bf178d47a461ba058524';
    const SHOP_ID = process.env.RUKASSA_SHOP_ID || '3596';
    if (sign && !rukassaService.verifyWebhook(SHOP_ID, TOKEN, order_id, sign)) {
      console.error('[Rukassa Callback] Invalid signature');
      return res.status(403).send('Forbidden');
    }

    // Parse our transaction ID from order_id (format: dep_TXID)
    const match = order_id.match(/^dep_(\d+)$/);
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

      const depositAmount = parseFloat(in_amount || amount || tx.amount);

      await pool.query('BEGIN');
      try {
        await pool.query(
          "UPDATE transactions SET status = 'completed', description = $1 WHERE id = $2",
          [`Пополнение баланса [RUKASSA PAID]`, txId]
        );
        await pool.query(
          "UPDATE users SET balance = balance + $1 WHERE id = $2",
          [depositAmount, tx.user_id]
        );
        await pool.query('COMMIT');
        console.log(`[Rukassa Callback] Deposit completed: user=${tx.user_id} amount=${depositAmount}`);
      } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
      }
    } else if (status === 'CANCEL') {
      await pool.query(
        "UPDATE transactions SET status = 'failed', description = $1 WHERE id = $2 AND status = 'pending'",
        ['Пополнение баланса [RUKASSA CANCEL]', txId]
      );
      console.log(`[Rukassa Callback] Payment cancelled: tx=${txId}`);
    } else {
      console.log(`[Rukassa Callback] Status=${status} for tx=${txId}, no action`);
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
