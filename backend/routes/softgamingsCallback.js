const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require('crypto');
const { withTransaction } = require('../utils/dbTransaction');
const { updateVipLevel } = require('../config/vipLevels');
const config = require('../config/config');
const { generateHmac, validateHmac } = require('../utils/oneWalletHmac');

// HMAC Secret from SoftGamings / Fundist OneWallet
// IMPORTANT: Per OneWallet spec, HMAC key = SHA256(secret) binary.
const HMAC_SECRET = config?.slotsApi?.hmacSecret || process.env.SLOTS_HMAC_SECRET;
if (!HMAC_SECRET) {
  console.error('FATAL: SLOTS_HMAC_SECRET is not configured. OneWallet callbacks cannot be validated safely.');
}

// Helper: Format amount to 2 decimal places string
const formatAmount = (amount) => {
  return parseFloat(amount).toFixed(2);
};

// Helper: Ensure tid is a number (Fundist requires long integer, not string)
const numericTid = (tid) => {
  const n = Number(tid);
  return Number.isFinite(n) ? n : 0;
};

// Helper: Build idempotent cached response with CURRENT balance and correct tid
// Per OW spec: "balance field must contain current value" even for cached responses
const buildCachedResponse = async (client, userId, tid, cachedResp) => {
  const balRes = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
  const curBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(balRes.rows[0]?.bonus_balance || 0);
  const resp = { ...cachedResp, tid: numericTid(tid), balance: formatAmount(curBal) };
  delete resp.hmac;
  resp.hmac = generateHmac(resp, HMAC_SECRET);
  return resp;
};

// Helper: Send Success Response (HTTP 200 required by spec)
const sendOk = (res, data = {}) => {
  const response = {
    status: 'OK',
    ...data
  };
  response.hmac = generateHmac(response, HMAC_SECRET);
  return res.status(200).json(response);
};

// Helper: Send Error Response (no `status` field per spec)
const sendOwError = (res, errorCode, balance = '0.00') => {
  const response = {
    error: String(errorCode),
    balance: formatAmount(balance)
  };
  response.hmac = generateHmac(response, HMAC_SECRET);
  return res.status(200).json(response);
};

const buildOwErrorResponse = (errorCode, balance = '0.00') => {
  const response = {
    error: String(errorCode),
    balance: formatAmount(balance)
  };
  response.hmac = generateHmac(response, HMAC_SECRET);
  return response;
};

// --- Idempotency helpers (OneWallet spec) ---
const ESSENTIAL_TID_FIELDS = ['type', 'tid', 'userid', 'currency', 'amount'];
const ESSENTIAL_ACTION_FIELDS = ['userid', 'currency', 'amount'];

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) out[k] = obj?.[k] ?? null;
  return out;
};

const sameEssentials = (a, b, keys) => {
  for (const k of keys) {
    // Compare as strings to avoid 123 vs "123" mismatches
    const av = a?.[k] === undefined || a?.[k] === null ? null : String(a[k]);
    const bv = b?.[k] === undefined || b?.[k] === null ? null : String(b[k]);
    if (av !== bv) return false;
  }
  return true;
};

async function findExistingByTid(client, tid) {
  try {
    const r = await client.query(
      `SELECT request_json, response_json
       FROM onewallet_requests
       WHERE tid = $1
       LIMIT 1`,
      [String(tid)]
    );
    return r.rows[0] || null;
  } catch (e) {
    // Table might not be migrated yet in dev
    if (e && e.code === '42P01') return null;
    throw e;
  }
}

async function findExistingByAction(client, { userid, i_gameid, i_actionid }) {
  if (!userid || !i_actionid) return null;
  try {
    // Try full match first (userid + i_gameid + i_actionid)
    if (i_gameid) {
      const r = await client.query(
        `SELECT request_json, response_json
         FROM onewallet_requests
         WHERE userid = $1 AND i_gameid = $2 AND i_actionid = $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [String(userid), String(i_gameid), String(i_actionid)]
      );
      if (r.rows.length > 0) return r.rows[0];
    }
    // Fallback: search by userid + i_actionid only (for cancel/rollback where i_gameid may differ)
    const r = await client.query(
      `SELECT request_json, response_json
       FROM onewallet_requests
       WHERE userid = $1 AND i_actionid = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [String(userid), String(i_actionid)]
    );
    return r.rows[0] || null;
  } catch (e) {
    if (e && e.code === '42P01') return null;
    throw e;
  }
}

async function saveRequest(client, body) {
  const tid = String(body.tid ?? '');
  try {
    await client.query(
      `INSERT INTO onewallet_requests
       (tid, type, userid, currency, amount, i_gameid, i_actionid, subtype, request_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (tid) DO NOTHING`,
      [
        tid,
        String(body.type ?? ''),
        String(body.userid ?? ''),
        String(body.currency ?? ''),
        body.amount === undefined ? null : String(body.amount),
        body.i_gameid === undefined ? null : String(body.i_gameid),
        body.i_actionid === undefined ? null : String(body.i_actionid),
        body.subtype === undefined ? null : String(body.subtype),
        body
      ]
    );
  } catch (e) {
    if (e && e.code === '42P01') return;
    throw e;
  }
}

async function saveResponse(client, tid, responseJson) {
  try {
    await client.query(
      `UPDATE onewallet_requests
       SET response_json = $2, updated_at = NOW()
       WHERE tid = $1`,
      [String(tid), responseJson]
    );
  } catch (e) {
    if (e && e.code === '42P01') return;
    throw e;
  }
}

// --- Helpers ---

// Parse numeric user ID from Fundist userid field.
// Supports both old format ("1") and new tagged format ("aurex_1_RUB").
function parseUserId(userid) {
  const s = String(userid || '');
  // New format: aurex_{id}_{currency}
  const taggedMatch = s.match(/^aurex_(\d+)_/);
  if (taggedMatch) return parseInt(taggedMatch[1], 10);
  // Old format: plain numeric
  const num = parseInt(s, 10);
  return Number.isNaN(num) ? NaN : num;
}

// --- HANDLERS ---

// 1. PING
const handlePing = async (req, res) => {
  return sendOk(res, {});
};

// 2. BALANCE
const handleBalance = async (req, res) => {
  const { userid, currency } = req.body;
  
  try {
    const userId = parseUserId(userid);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    const result = await pool.query('SELECT balance, bonus_balance, currency FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return sendOwError(res, 'User not found', '0.00');
    }
    
    const user = result.rows[0];
    
    if (currency && user.currency && String(user.currency) !== String(currency)) {
      console.warn(`⚠️ OneWallet balance: currency mismatch for user ${userid}: Fundist=${currency}, DB=${user.currency}`);
      return sendOwError(res, 'Currency mismatch', '0.00');
    }

    // Return main + bonus balance (Fundist sees total; wager is our internal logic)
    const totalBalance = parseFloat(user.balance || 0) + parseFloat(user.bonus_balance || 0);

    return sendOk(res, {
      balance: formatAmount(totalBalance)
    });
  } catch (error) {
    console.error('Balance Error:', error);
    return sendOwError(res, 'Internal error', '0.00');
  }
};

// 3. DEBIT (Bet)
const handleDebit = async (req, res) => {
  const { userid, amount, tid, i_gameid, i_actionid, round_ended } = req.body;
  const debitAmount = parseFloat(amount);

  try {
    if (!HMAC_SECRET) return res.status(500).json({ error: 'HMAC secret not configured' });

    // Reject negative amounts
    if (debitAmount < 0) {
      return sendOwError(res, 'Invalid amount', '0.00');
    }

    // Cancellation request (subtype=cancel) must rollback the original event
    if (req.body.subtype === 'cancel') {
      return handleRollback(req, res);
    }

    const userId = parseUserId(userid);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    const result = await withTransaction(pool, async (client) => {
      // 0) Idempotency by TID (same tid retry)
      const existingByTid = await findExistingByTid(client, tid);
      if (existingByTid) {
        const prevReq = existingByTid.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_TID_FIELDS), pick(req.body, ESSENTIAL_TID_FIELDS), ESSENTIAL_TID_FIELDS)) {
          const balRes = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
          const curBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(balRes.rows[0]?.bonus_balance || 0);
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByTid.response_json) {
          return { responseJson: await buildCachedResponse(client, userId, tid, existingByTid.response_json), done: true };
        }
        return { timeout: true, done: true };
      }

      // 0b) Idempotency by (i_gameid + i_actionid) — new tid, same action
      const existingByAction = await findExistingByAction(client, { userid, i_gameid, i_actionid });
      if (existingByAction) {
        const prevReq = existingByAction.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_ACTION_FIELDS), pick(req.body, ESSENTIAL_ACTION_FIELDS), ESSENTIAL_ACTION_FIELDS)) {
          const balRes = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
          const curBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(balRes.rows[0]?.bonus_balance || 0);
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByAction.response_json) {
          return { responseJson: await buildCachedResponse(client, userId, tid, existingByAction.response_json), done: true };
        }
        return { timeout: true, done: true };
      }

      // Save request early (so we can return 408 if needed on retries)
      await saveRequest(client, req.body);

      // Lock user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userResult.rows.length === 0) throw { code: 404, msg: 'User not found' };
      
      const user = userResult.rows[0];
      const mainBal = parseFloat(user.balance || 0);
      const bonusBal = parseFloat(user.bonus_balance || 0);
      const totalAvailable = mainBal + bonusBal;

      if (req.body.currency && user.currency && String(user.currency) !== String(req.body.currency)) {
        console.warn(`⚠️ OneWallet debit: currency mismatch for user ${userid}: Fundist=${req.body.currency}, DB=${user.currency}`);
        const curBal = parseFloat(user.balance || 0) + parseFloat(user.bonus_balance || 0);
        return { responseJson: buildOwErrorResponse('Currency mismatch', curBal), done: true };
      }
      
      if (totalAvailable < debitAmount) {
        const errorResponse = buildOwErrorResponse('INSUFFICIENT_FUNDS', formatAmount(totalAvailable));
        await saveResponse(client, tid, errorResponse);
        return { responseJson: errorResponse, done: true };
      }

      // Deduct from main balance first, then bonus_balance
      let fromMain = Math.min(debitAmount, mainBal);
      let fromBonus = debitAmount - fromMain;

      const updateRes = await client.query(
        `UPDATE users 
         SET balance = balance - $1, 
             bonus_balance = bonus_balance - $2, 
             total_wagered = total_wagered + $3 
         WHERE id = $4 
         RETURNING balance, bonus_balance`,
        [fromMain, fromBonus, debitAmount, userId]
      );
      const newMainBal = parseFloat(updateRes.rows[0].balance);
      const newBonusBal = parseFloat(updateRes.rows[0].bonus_balance);
      const newTotalBalance = newMainBal + newBonusBal;

      // Track wager progress for active freerounds bonuses
      if (debitAmount > 0) {
        try {
          const activeWagers = await client.query(
            `SELECT id, wager_required, wager_completed, win_amount 
             FROM freerounds_bonuses 
             WHERE user_id = $1 AND status = 'wagering' AND expire_at > NOW()
             ORDER BY created_at ASC`,
            [userId]
          );
          for (const bonus of activeWagers.rows) {
            const remaining = parseFloat(bonus.wager_required) - parseFloat(bonus.wager_completed);
            if (remaining <= 0) continue;
            const contribution = Math.min(debitAmount, remaining);
            await client.query(
              `UPDATE freerounds_bonuses 
               SET wager_completed = wager_completed + $1, updated_at = NOW() 
               WHERE id = $2`,
              [contribution, bonus.id]
            );
            const newCompleted = parseFloat(bonus.wager_completed) + contribution;
            // Check if wager is now met
            if (newCompleted >= parseFloat(bonus.wager_required)) {
              // Move remaining bonus balance to main balance and mark completed
              const bonusWin = parseFloat(bonus.win_amount);
              // The win_amount was added to bonus_balance; transfer what's left
              const transferAmount = Math.min(bonusWin, newBonusBal);
              if (transferAmount > 0) {
                await client.query(
                  `UPDATE users SET balance = balance + $1, bonus_balance = bonus_balance - $1 WHERE id = $2`,
                  [transferAmount, userId]
                );
                console.log(`✅ Wager completed! Transferred ${transferAmount} from bonus to main for user ${userId}`);
              }
              await client.query(
                `UPDATE freerounds_bonuses SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
                [bonus.id]
              );
            }
          }
        } catch (wagerErr) {
          console.error('[wager] Error tracking wager:', wagerErr.message);
        }
      }

      // Create/Update Game Session
      let sessionId = null;
      const sessionRes = await client.query(
        "SELECT id, session_id FROM game_sessions WHERE session_id = $1", 
        [i_gameid]
      );

      if (sessionRes.rows.length > 0) {
        sessionId = sessionRes.rows[0].id;
        await client.query(
          'UPDATE game_sessions SET bet_amount = bet_amount + $1 WHERE id = $2',
          [debitAmount, sessionId]
        );
      } else {
        const newSession = await client.query(
          `INSERT INTO game_sessions (user_id, game_id, session_id, provider, currency, status, bet_amount, win_amount)
           VALUES ($1, $2, $3, 'softgamings', $4, 'active', $5, 0) RETURNING id`,
          [userId, req.body.i_gamedesc, i_gameid, req.body.currency, debitAmount]
        );
        sessionId = newSession.rows[0].id;
      }

      // Record Transaction
      await client.query(
        `INSERT INTO transactions 
        (user_id, type, amount, currency, status, description, round_id, payment_details)
        VALUES ($1, 'bet', $2, $3, 'completed', $4, $5, $6)`,
        [
          userId, 
          -debitAmount, 
          req.body.currency, 
          `Bet in ${req.body.i_gamedesc}`, 
          i_actionid,
          JSON.stringify({ tid: tid.toString(), game_id: i_gameid })
        ]
      );

      // VIP Points
      const loyaltyPoints = Math.floor(debitAmount / 100);
      if (loyaltyPoints > 0) {
        await client.query('UPDATE users SET vip_points = COALESCE(vip_points, 0) + $1 WHERE id = $2', [loyaltyPoints, userId]);
      }

      // Re-read balance after potential wager transfer
      const finalBal = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
      const finalTotal = parseFloat(finalBal.rows[0].balance) + parseFloat(finalBal.rows[0].bonus_balance);

      const okResponse = {
        status: 'OK',
        tid: numericTid(tid),
        balance: formatAmount(finalTotal)
      };
      okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
      await saveResponse(client, tid, okResponse);
      return { responseJson: okResponse, done: true };
    });

    // Update VIP Level (async)
    updateVipLevel(pool, userId).catch(console.error);

    if (result?.timeout) return res.sendStatus(408);
    if (result?.responseJson) return res.status(200).json(result.responseJson);
    // Fallback (should not happen)
    return sendOk(res, { tid: numericTid(tid), balance: formatAmount(0) });

  } catch (error) {
    console.error('Debit Error:', error);
    if (error.code === 404) {
      return sendOwError(res, 'User not found', '0.00');
    }
    return sendOwError(res, 'Internal error', '0.00');
  }
};

// 4. CREDIT (Win)
const handleCredit = async (req, res) => {
  const { userid, amount, tid, i_gameid, i_actionid, i_rollback } = req.body;
  const creditAmount = parseFloat(amount);

  try {
    if (!HMAC_SECRET) return res.status(500).json({ error: 'HMAC secret not configured' });

    // Reject negative amounts
    if (creditAmount < 0) {
      return sendOwError(res, 'Invalid amount', '0.00');
    }

    // Handle Rollback (if i_rollback is present)
    if (i_rollback) {
      return handleRollback(req, res);
    }

    // Handle cancellation requests (subtype=cancel)
    if (req.body.subtype === 'cancel') {
      return handleRollback(req, res);
    }

    const userId = parseUserId(userid);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    // Check if this is a freeround win
    // Method 1: game_extra = "FREEROUNDS_XXX" (requires Fundist to enable this field)
    const gameExtra = req.body.game_extra || '';
    const freeroundTidMatch = gameExtra.match(/^FREEROUNDS_(.+)$/);
    let freeroundTid = freeroundTidMatch ? freeroundTidMatch[1] : null;

    // Method 2: detect freeround by matching game + checking no debit in same round
    // Extract game page code from i_gamedesc (format: "960:vs10bbbonanza")
    const gameDesc = req.body.i_gamedesc || '';
    const gamePageCode = gameDesc.includes(':') ? gameDesc.split(':')[1] : gameDesc;

    const result = await withTransaction(pool, async (client) => {
      // 0) Idempotency by TID (same tid retry)
      const existingByTid = await findExistingByTid(client, tid);
      if (existingByTid) {
        const prevReq = existingByTid.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_TID_FIELDS), pick(req.body, ESSENTIAL_TID_FIELDS), ESSENTIAL_TID_FIELDS)) {
          const balRes = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
          const curBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(balRes.rows[0]?.bonus_balance || 0);
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByTid.response_json) {
          return { responseJson: await buildCachedResponse(client, userId, tid, existingByTid.response_json), done: true };
        }
        return { timeout: true, done: true };
      }

      // 0b) Idempotency by (i_gameid + i_actionid) — new tid, same action
      const existingByAction = await findExistingByAction(client, { userid, i_gameid, i_actionid });
      if (existingByAction) {
        const prevReq = existingByAction.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_ACTION_FIELDS), pick(req.body, ESSENTIAL_ACTION_FIELDS), ESSENTIAL_ACTION_FIELDS)) {
          const balRes = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
          const curBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(balRes.rows[0]?.bonus_balance || 0);
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByAction.response_json) {
          return { responseJson: await buildCachedResponse(client, userId, tid, existingByAction.response_json), done: true };
        }
        return { timeout: true, done: true };
      }

      await saveRequest(client, req.body);

      // Lock user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userResult.rows.length === 0) throw { code: 404, msg: 'User not found' };
      const user = userResult.rows[0];

      if (req.body.currency && user.currency && String(user.currency) !== String(req.body.currency)) {
        console.warn(`⚠️ OneWallet credit: currency mismatch for user ${userid}: Fundist=${req.body.currency}, DB=${user.currency}`);
        const curBal = parseFloat(user.balance || 0) + parseFloat(user.bonus_balance || 0);
        return { responseJson: buildOwErrorResponse('Currency mismatch', curBal), done: true };
      }

      // Detect freeround win: Method 2 (fallback when game_extra is not available)
      // If no freeroundTid from game_extra, check if this game matches an active freeround
      // AND there was no debit (bet) in this game round — freerounds have no bets
      let hasWager = false;
      let freeroundBonus = null;

      if (!freeroundTid && creditAmount > 0 && gamePageCode) {
        try {
          // Check if user has active freerounds for this game
          const bonusRes = await client.query(
            `SELECT * FROM freerounds_bonuses 
             WHERE user_id = $1 AND game_code = $2 
               AND status IN ('active', 'wagering') 
               AND expire_at > NOW()
             ORDER BY created_at ASC LIMIT 1`,
            [userId, gamePageCode]
          );
          if (bonusRes.rows.length > 0) {
            // Check if there was any debit in this game round (i_gameid)
            // Freerounds = credit WITHOUT debit. Regular play = debit then credit.
            const debitCheck = await client.query(
              `SELECT COUNT(*) as cnt FROM onewallet_requests 
               WHERE userid = $1 AND i_gameid = $2 AND type = 'debit'`,
              [String(userid), String(i_gameid)]
            );
            const hasDebit = parseInt(debitCheck.rows[0]?.cnt || '0') > 0;

            if (!hasDebit) {
              freeroundBonus = bonusRes.rows[0];
              freeroundTid = freeroundBonus.fundist_tid;
              hasWager = freeroundBonus.wager_multiplier > 0;
              console.log(`🎰 Detected freeround win (no-debit method): ${creditAmount} on ${gamePageCode}, TID=${freeroundTid}, wager=${freeroundBonus.wager_multiplier}`);
            }
          }
        } catch (detectErr) {
          console.error('[freeround-detect] Error:', detectErr.message);
        }
      }

      // Method 1: game_extra was available
      if (freeroundTid && !freeroundBonus && creditAmount > 0) {
        const bonusRes = await client.query(
          `SELECT * FROM freerounds_bonuses WHERE fundist_tid = $1 AND user_id = $2 AND wager_multiplier > 0`,
          [freeroundTid, userId]
        );
        if (bonusRes.rows.length > 0) {
          freeroundBonus = bonusRes.rows[0];
          hasWager = true;
        }
      }

      let newBalance;
      if (hasWager && freeroundBonus) {
        // Freeround win WITH wager — add to bonus_balance instead of main balance
        const updateRes = await client.query(
          'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2 RETURNING balance, bonus_balance',
          [creditAmount, userId]
        );
        newBalance = updateRes.rows[0].balance;
        const newBonusBalance = updateRes.rows[0].bonus_balance;

        // Update freerounds_bonuses record
        const wagerRequired = creditAmount * freeroundBonus.wager_multiplier;
        await client.query(
          `UPDATE freerounds_bonuses 
           SET win_amount = win_amount + $1, 
               wager_required = wager_required + $2,
               status = CASE WHEN status = 'active' THEN 'wagering' ELSE status END,
               updated_at = NOW()
           WHERE id = $3`,
          [creditAmount, wagerRequired, freeroundBonus.id]
        );

        console.log(`🎰 Freeround win: ${creditAmount} → bonus_balance (wager x${freeroundBonus.wager_multiplier}, need ${wagerRequired})`);

        // Return balance = main + bonus (Fundist sees total, wager is our internal logic)
        const totalBalance = parseFloat(newBalance) + parseFloat(newBonusBalance);
        
        // Record Transaction as freeround_win
        await client.query(
          `INSERT INTO transactions 
          (user_id, type, amount, currency, status, description, round_id, payment_details)
          VALUES ($1, 'freeround_win', $2, $3, 'completed', $4, $5, $6)`,
          [
            userId, creditAmount, req.body.currency,
            `Freeround win (wager x${freeroundBonus.wager_multiplier})`,
            i_actionid,
            JSON.stringify({ tid: tid.toString(), game_id: i_gameid, freeround_tid: freeroundTid, wager_multiplier: freeroundBonus.wager_multiplier })
          ]
        );

        const okResponse = {
          status: 'OK',
          tid: numericTid(tid),
          balance: formatAmount(totalBalance)
        };
        okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
        await saveResponse(client, tid, okResponse);
        return { responseJson: okResponse, done: true };
      }

      // Normal credit (no wager, or freeround without wager) — add to main balance
      const updateRes = await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance, bonus_balance',
        [creditAmount, userId]
      );
      newBalance = updateRes.rows[0].balance;
      const bonusBal = parseFloat(updateRes.rows[0].bonus_balance || 0);

      // If this is a freeround win without wager, update the bonus record too
      if (freeroundTid) {
        await client.query(
          `UPDATE freerounds_bonuses 
           SET win_amount = win_amount + $1, status = 'completed', completed_at = NOW(), updated_at = NOW()
           WHERE fundist_tid = $2 AND user_id = $3`,
          [creditAmount, freeroundTid, userId]
        ).catch(() => {});
      }

      // Update Game Session
      await client.query(
        "UPDATE game_sessions SET win_amount = win_amount + $1 WHERE session_id = $2",
        [creditAmount, i_gameid]
      );

      // Record Transaction
      const txType = freeroundTid ? 'freeround_win' : 'win';
      const txDesc = freeroundTid ? `Freeround win in ${req.body.i_gamedesc}` : `Win in ${req.body.i_gamedesc}`;
      await client.query(
        `INSERT INTO transactions 
        (user_id, type, amount, currency, status, description, round_id, payment_details)
        VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7)`,
        [
          userId, txType, creditAmount, req.body.currency, txDesc, i_actionid,
          JSON.stringify({ tid: tid.toString(), game_id: i_gameid, ...(freeroundTid ? { freeround_tid: freeroundTid } : {}) })
        ]
      );

      // Return total balance (main + bonus) to Fundist
      const totalBalance = parseFloat(newBalance) + bonusBal;

      const okResponse = {
        status: 'OK',
        tid: numericTid(tid),
        balance: formatAmount(totalBalance)
      };
      okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
      await saveResponse(client, tid, okResponse);
      return { responseJson: okResponse, done: true };
    });

    if (result?.timeout) return res.sendStatus(408);
    if (result?.responseJson) return res.status(200).json(result.responseJson);
    return sendOk(res, { tid: numericTid(tid), balance: formatAmount(0) });

  } catch (error) {
    console.error('Credit Error:', error);
    if (error.code === 404) {
      return sendOwError(res, 'User not found', '0.00');
    }
    return sendOwError(res, 'Internal error', '0.00');
  }
};

// 5. ROLLBACK (Cancel Transaction)
const handleRollback = async (req, res) => {
  const { userid, amount, tid, i_rollback, i_gameid } = req.body;
  // Rollback is essentially a credit, but linked to a previous debit tid
  
  try {
    if (!HMAC_SECRET) return res.status(500).json({ error: 'HMAC secret not configured' });

    const userId = parseUserId(userid);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    const result = await withTransaction(pool, async (client) => {
      // Idempotency by TID (rollback request TID)
      const existingByTid = await findExistingByTid(client, tid);
      if (existingByTid) {
        const prevReq = existingByTid.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_TID_FIELDS), pick(req.body, ESSENTIAL_TID_FIELDS), ESSENTIAL_TID_FIELDS)) {
          const balRes = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
          const curBal = parseFloat(balRes.rows[0]?.balance || 0) + parseFloat(balRes.rows[0]?.bonus_balance || 0);
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByTid.response_json) {
          return { responseJson: await buildCachedResponse(client, userId, tid, existingByTid.response_json), done: true };
        }
        return { timeout: true, done: true };
      }

      await saveRequest(client, req.body);

      // Lock user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userResult.rows.length === 0) throw { code: 404, msg: 'User not found' };
      const user = userResult.rows[0];

      // Find original request by i_rollback (preferred)
      let targetReq = null;
      if (i_rollback) {
        const existing = await findExistingByTid(client, i_rollback);
        targetReq = existing?.request_json || null;
      }

      // If not found, try by (i_gameid + i_actionid) cancel semantics
      // Search specifically for the original debit (not the cancel request itself)
      if (!targetReq && req.body.subtype === 'cancel' && req.body.i_actionid) {
        const r = await client.query(
          `SELECT request_json, response_json
           FROM onewallet_requests
           WHERE userid = $1 AND i_actionid = $2 AND type = 'debit'
           ORDER BY created_at DESC
           LIMIT 1`,
          [String(userid), String(req.body.i_actionid)]
        );
        targetReq = r.rows[0]?.request_json || null;
      }

      // Default: no-op if target not found
      if (!targetReq) {
        console.warn(`⚠️ Rollback/Cancel: target not found for user=${userid}, i_actionid=${req.body.i_actionid}, i_rollback=${i_rollback}, i_gameid=${i_gameid}`);
        const totalBal = parseFloat(user.balance || 0) + parseFloat(user.bonus_balance || 0);
        const okResponse = { status: 'OK', tid: numericTid(tid), balance: formatAmount(totalBal) };
        okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
        await saveResponse(client, tid, okResponse);
        return { responseJson: okResponse, done: true };
      }

      const rollbackAmount = parseFloat(targetReq.amount ?? amount ?? 0);
      if (!Number.isFinite(rollbackAmount) || rollbackAmount <= 0) {
        const totalBal = parseFloat(user.balance || 0) + parseFloat(user.bonus_balance || 0);
        const okResponse = { status: 'OK', tid: numericTid(tid), balance: formatAmount(totalBal) };
        okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
        await saveResponse(client, tid, okResponse);
        return { responseJson: okResponse, done: true };
      }

      // Reverse balance effect based on original type
      const originalType = String(targetReq.type || '').toLowerCase();
      let newBalance = user.balance;
      if (originalType === 'debit') {
        const updateRes = await client.query(
          'UPDATE users SET balance = balance + $1, total_wagered = GREATEST(total_wagered - $1, 0) WHERE id = $2 RETURNING balance',
          [rollbackAmount, userId]
        );
        newBalance = updateRes.rows[0].balance;
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, currency, status, description, round_id, payment_details)
           VALUES ($1, 'rollback', $2, $3, 'completed', $4, $5, $6)`,
          [
            userId,
            rollbackAmount,
            req.body.currency,
            `Rollback for ${String(i_rollback || '')}`.trim(),
            req.body.i_actionid,
            JSON.stringify({ tid: String(tid), related_tid: String(i_rollback || '') })
          ]
        );
      } else if (originalType === 'credit') {
        // Reverse credit (rare). Ensure non-negative by relying on DB constraint; if would go negative, reject.
        const updateRes = await client.query(
          'UPDATE users SET balance = balance - $1 WHERE id = $2 RETURNING balance',
          [rollbackAmount, userId]
        );
        newBalance = updateRes.rows[0].balance;
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, currency, status, description, round_id, payment_details)
           VALUES ($1, 'rollback', $2, $3, 'completed', $4, $5, $6)`,
          [
            userId,
            -rollbackAmount,
            req.body.currency,
            `Rollback credit for ${String(i_rollback || '')}`.trim(),
            req.body.i_actionid,
            JSON.stringify({ tid: String(tid), related_tid: String(i_rollback || '') })
          ]
        );
      }

      // Update Session (best-effort)
      if (i_gameid) {
        await client.query(
          "UPDATE game_sessions SET bet_amount = GREATEST(bet_amount - $1, 0) WHERE session_id = $2",
          [rollbackAmount, i_gameid]
        );
      }

      // Re-fetch to get accurate total (main + bonus)
      const finalBal = await client.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [userId]);
      const finalTotal = parseFloat(finalBal.rows[0].balance) + parseFloat(finalBal.rows[0].bonus_balance || 0);

      const okResponse = { status: 'OK', tid: numericTid(tid), balance: formatAmount(finalTotal) };
      okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
      await saveResponse(client, tid, okResponse);
      console.log(`✅ Rollback/Cancel OK: user=${userid}, type=${originalType}, amount=${rollbackAmount}, newBalance=${finalTotal}`);
      return { responseJson: okResponse, done: true };
    });

    if (result?.timeout) return res.sendStatus(408);
    if (result?.responseJson) return res.status(200).json(result.responseJson);
    return sendOk(res, { tid: numericTid(tid), balance: formatAmount(0) });

  } catch (error) {
    console.error('Rollback Error:', error);
    if (error.code === 404) return sendOwError(res, 'User not found', '0.00');
    return sendOwError(res, 'Internal error', '0.00');
  }
};

// --- MAIN ROUTER ---

router.post('/', async (req, res) => {
  if (!HMAC_SECRET) return res.status(500).json({ error: 'HMAC secret not configured' });

  // Validate HMAC (403 on auth failure)
  const v = validateHmac(req.body, HMAC_SECRET);
  if (!v.ok) {
    console.error(`❌ OneWallet HMAC validation failed: ${v.reason}`);
    if (v.calculated) console.error(`Calculated HMAC: ${v.calculated}`);
    console.error('Payload:', JSON.stringify(req.body));
    return res.status(403).json({ error: v.reason });
  }

  const { type } = req.body;
  console.log(`🎰 SoftGamings [${type}] Request:`, JSON.stringify(req.body));

  switch (type) {
    case 'ping':
      return handlePing(req, res);
    case 'balance':
      return handleBalance(req, res);
    case 'debit':
      return handleDebit(req, res);
    case 'credit':
      return handleCredit(req, res);
    case 'roundinfo':
      // Round info is informational only. Reply OK.
      return sendOk(res, {});
    default:
      console.warn(`Unknown request type: ${type}`);
      // Return generic error (HTTP 200 per protocol expectations)
      return sendOwError(res, `Unknown request type|${type}`, '0.00');
  }
});

module.exports = router;
