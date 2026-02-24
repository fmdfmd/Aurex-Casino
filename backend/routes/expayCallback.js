const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const expayService = require('../services/expayService');
const { withTransaction } = require('../utils/dbTransaction');
const { DEPOSIT_BONUSES } = require('../config/bonusConfig');

const TRUSTED_IPS = ['68.183.213.224', '157.245.17.198', '165.227.159.246'];

async function handleCallback(req, res) {
  try {
    const trackerId = req.body?.tracker_id || req.query?.tracker_id;
    const clientTxId = req.body?.client_transaction_id || req.query?.client_transaction_id;

    console.log(`[Expay Callback] Received: tracker_id=${trackerId}, client_transaction_id=${clientTxId}`);

    if (!trackerId && !clientTxId) {
      console.warn('[Expay Callback] Missing identifiers');
      return res.status(200).send('OK');
    }

    let statusData;
    try {
      statusData = trackerId
        ? await expayService.getTransactionInfo(trackerId)
        : await expayService.getTransactionInfoByClientId(clientTxId);
    } catch (err) {
      console.error(`[Expay Callback] Status check failed:`, err.message);
      return res.status(200).send('OK');
    }

    console.log(`[Expay Callback] Status response:`, JSON.stringify(statusData).slice(0, 500));

    const tx = statusData.transaction || {};
    const resolvedClientTxId = tx.client_transaction_id || clientTxId;
    if (!resolvedClientTxId) {
      console.warn('[Expay Callback] No client_transaction_id in response');
      return res.status(200).send('OK');
    }

    const match = resolvedClientTxId.match(/^(dep|wd)_(\d+)$/);
    if (!match) {
      console.warn('[Expay Callback] Invalid client_transaction_id format:', resolvedClientTxId);
      return res.status(200).send('OK');
    }

    const txType = match[1] === 'dep' ? 'deposit' : 'withdrawal';
    const txId = parseInt(match[2]);

    const txResult = await pool.query(
      "SELECT * FROM transactions WHERE id = $1 AND status = 'pending'",
      [txId]
    );

    if (txResult.rows.length === 0) {
      console.log(`[Expay Callback] Transaction ${txId} already processed or not found`);
      return res.status(200).send('OK');
    }

    const expayStatus = (tx.status || '').toUpperCase();

    if (expayStatus === 'SUCCESS') {
      if (txType === 'deposit') {
        await handleDepositCompleted(txId, tx);
      } else {
        await handleWithdrawalCompleted(txId, tx);
      }
    } else if (expayStatus === 'ERROR') {
      if (txType === 'deposit') {
        await handleDepositFailed(txId, tx);
      } else {
        await handleWithdrawalFailed(txId, tx);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Expay Callback] Error:', error.message);
    res.status(200).send('OK');
  }
}

router.get('/', handleCallback);
router.post('/', handleCallback);

async function handleDepositCompleted(txId, statusData) {
  await withTransaction(pool, async (client) => {
    const txResult = await client.query(
      "SELECT * FROM transactions WHERE id = $1 AND type = 'deposit' AND status = 'pending' FOR UPDATE",
      [txId]
    );

    if (txResult.rows.length === 0) {
      console.log(`[Expay] Deposit ${txId} already processed`);
      return;
    }

    const tx = txResult.rows[0];
    const depositAmount = parseFloat(statusData.amount || tx.amount);
    const userId = tx.user_id;

    await client.query(
      "UPDATE transactions SET status = 'completed', wallet_address = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [txId, statusData.tracker_id || 'expay']
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

        console.log(`[Expay] Bonus applied: deposit_${depositNumber} = ${bonusAmount} RUB for user ${userId}`);
      }
    }

    console.log(`[Expay] Deposit ${txId} completed: +${depositAmount} RUB for user ${userId}`);
  });
}

async function handleDepositFailed(txId, statusData) {
  await pool.query(
    "UPDATE transactions SET status = 'failed', description = CONCAT(description, ' [Expay ERROR]'), updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'",
    [txId]
  );
  console.log(`[Expay] Deposit ${txId} failed`);
}

async function handleWithdrawalCompleted(txId, statusData) {
  await pool.query(
    "UPDATE transactions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending'",
    [txId]
  );
  console.log(`[Expay] Withdrawal ${txId} completed`);
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
      "UPDATE transactions SET status = 'failed', description = CONCAT(description, ' [Expay ERROR]'), updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [txId]
    );

    await client.query(
      'UPDATE users SET balance = balance + $1, total_withdrawn = total_withdrawn - $1 WHERE id = $2',
      [Math.abs(parseFloat(tx.amount)), tx.user_id]
    );

    console.log(`[Expay] Withdrawal ${txId} failed, funds returned to user ${tx.user_id}`);
  });
}

module.exports = router;
