const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const nirvanaPayService = require('../services/nirvanaPayService');
const { withTransaction } = require('../utils/dbTransaction');
const { DEPOSIT_BONUSES } = require('../config/bonusConfig');

// GET /api/payments/nirvana/callback — Nirvana Pay sends GET when status changes to SUCCESS or ERROR
router.get('/', async (req, res) => {
  try {
    const { txId, type } = req.query;

    console.log(`[NirvanaPay Callback] Received: txId=${txId}, type=${type}`);

    if (!txId) {
      console.warn('[NirvanaPay Callback] Missing txId');
      return res.status(200).send('OK');
    }

    const txIdNum = parseInt(txId);
    if (isNaN(txIdNum)) {
      console.warn('[NirvanaPay Callback] Invalid txId:', txId);
      return res.status(200).send('OK');
    }

    const txResult = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND status = 'pending'",
      [txIdNum]
    );

    if (txResult.rows.length === 0) {
      console.log(`[NirvanaPay Callback] Transaction ${txIdNum} already processed or not found`);
      return res.status(200).send('OK');
    }

    const tx = txResult.rows[0];
    const clientID = tx.type === 'deposit' ? `dep_${tx.id}` : `wd_${tx.id}`;

    let statusData;
    try {
      statusData = await nirvanaPayService.getStatus(clientID);
    } catch (err) {
      console.error(`[NirvanaPay Callback] Status check failed for ${clientID}:`, err.message);
      return res.status(200).send('OK');
    }

    console.log(`[NirvanaPay Callback] Status for ${clientID}:`, JSON.stringify(statusData).slice(0, 400));

    if (statusData.status === 'SUCCESS') {
      if (tx.type === 'deposit') {
        await handleDepositCompleted(tx.id, statusData);
      } else if (tx.type === 'withdrawal') {
        await handleWithdrawalCompleted(tx.id, statusData);
      }
    } else if (statusData.status === 'ERROR') {
      if (tx.type === 'deposit') {
        await handleDepositFailed(tx.id, statusData);
      } else if (tx.type === 'withdrawal') {
        await handleWithdrawalFailed(tx.id, statusData);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[NirvanaPay Callback] Error:', error);
    res.status(200).send('OK');
  }
});

async function handleDepositCompleted(txId, statusData) {
  await withTransaction(pool, async (client) => {
    const txResult = await client.query(
      "SELECT * FROM transactions WHERE id = $1 AND type = 'deposit' AND status = 'pending' FOR UPDATE",
      [txId]
    );

    if (txResult.rows.length === 0) {
      console.log(`[NirvanaPay] Deposit ${txId} already processed`);
      return;
    }

    const tx = txResult.rows[0];
    const depositAmount = parseFloat(statusData.amountFiatReceived || tx.amount);
    const userId = tx.user_id;

    await client.query(
      "UPDATE transactions SET status = 'completed', wallet_address = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [txId, statusData.trackerID || 'nirvana']
    );

    const userResult = await client.query(
      `UPDATE users SET balance = balance + $1, deposit_count = deposit_count + 1,
       total_deposited = total_deposited + $1
       WHERE id = $2 RETURNING *`,
      [depositAmount, userId]
    );

    const updatedUser = userResult.rows[0];
    const newDepositCount = updatedUser.deposit_count;

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

        console.log(`[NirvanaPay] Bonus applied: deposit_${depositNumber} = ${bonusAmount} RUB for user ${userId}`);
      }
    }

    console.log(`[NirvanaPay] Deposit ${txId} completed: +${depositAmount} RUB for user ${userId}`);
  });
}

async function handleDepositFailed(txId, statusData) {
  await pool.query(
    "UPDATE transactions SET status = 'failed', description = CONCAT(description, ' [NirvanaPay ERROR]'), updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'",
    [txId]
  );
  console.log(`[NirvanaPay] Deposit ${txId} failed`);
}

async function handleWithdrawalCompleted(txId, statusData) {
  await pool.query(
    "UPDATE transactions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'",
    [txId]
  );
  console.log(`[NirvanaPay] Withdrawal ${txId} completed`);
}

async function handleWithdrawalFailed(txId, statusData) {
  await withTransaction(pool, async (client) => {
    const txResult = await client.query(
      "SELECT * FROM transactions WHERE id = $1 AND type = 'withdrawal' AND status = 'pending' FOR UPDATE",
      [txId]
    );

    if (txResult.rows.length === 0) return;
    const tx = txResult.rows[0];

    await client.query(
      "UPDATE transactions SET status = 'failed', description = CONCAT(description, ' [NirvanaPay ERROR]'), updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [txId]
    );

    await client.query(
      'UPDATE users SET balance = balance + $1, total_withdrawn = total_withdrawn - $1 WHERE id = $2',
      [Math.abs(parseFloat(tx.amount)), tx.user_id]
    );

    console.log(`[NirvanaPay] Withdrawal ${txId} failed, funds returned to user ${tx.user_id}`);
  });
}

module.exports = router;
