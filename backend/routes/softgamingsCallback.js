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
  if (!userid || !i_gameid || !i_actionid) return null;
  try {
    const r = await client.query(
      `SELECT request_json, response_json
       FROM onewallet_requests
       WHERE userid = $1 AND i_gameid = $2 AND i_actionid = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [String(userid), String(i_gameid), String(i_actionid)]
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

// --- HANDLERS ---

// 1. PING
const handlePing = async (req, res) => {
  return sendOk(res, {});
};

// 2. BALANCE
const handleBalance = async (req, res) => {
  const { userid, currency } = req.body;
  
  try {
    const userId = parseInt(String(userid), 10);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    const result = await pool.query('SELECT balance, currency FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return sendOwError(res, 'User not found', '0.00');
    }
    
    const user = result.rows[0];
    
    // Optional: Check currency match
    if (currency && user.currency && String(user.currency) !== String(currency)) {
      return sendOwError(res, 'Currency mismatch', user.balance);
    }

    return sendOk(res, {
      balance: formatAmount(user.balance)
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

    // Cancellation request (subtype=cancel) must rollback the original event
    if (req.body.subtype === 'cancel') {
      return handleRollback(req, res);
    }

    const userId = parseInt(String(userid), 10);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    const result = await withTransaction(pool, async (client) => {
      // 0) Idempotency by TID
      const existingByTid = await findExistingByTid(client, tid);
      if (existingByTid) {
        const prevReq = existingByTid.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_TID_FIELDS), pick(req.body, ESSENTIAL_TID_FIELDS), ESSENTIAL_TID_FIELDS)) {
          const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
          const curBal = balRes.rows[0]?.balance ?? 0;
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByTid.response_json) {
          return { responseJson: existingByTid.response_json, done: true };
        }
        return { timeout: true, done: true };
      }

      // 0b) Idempotency by (i_gameid + i_actionid)
      const existingByAction = await findExistingByAction(client, { userid, i_gameid, i_actionid });
      if (existingByAction) {
        const prevReq = existingByAction.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_ACTION_FIELDS), pick(req.body, ESSENTIAL_ACTION_FIELDS), ESSENTIAL_ACTION_FIELDS)) {
          const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
          const curBal = balRes.rows[0]?.balance ?? 0;
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByAction.response_json) {
          return { responseJson: existingByAction.response_json, done: true };
        }
        return { timeout: true, done: true };
      }

      // Save request early (so we can return 408 if needed on retries)
      await saveRequest(client, req.body);

      // Lock user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userResult.rows.length === 0) throw { code: 404, msg: 'User not found' };
      
      const user = userResult.rows[0];

      // Currency check (spec requires error)
      if (req.body.currency && user.currency && String(user.currency) !== String(req.body.currency)) {
        const errorResponse = buildOwErrorResponse('Currency mismatch', user.balance);
        await saveResponse(client, tid, errorResponse);
        return { responseJson: errorResponse, done: true };
      }
      
      if (parseFloat(user.balance) < debitAmount) {
        const errorResponse = buildOwErrorResponse('INSUFFICIENT_FUNDS', user.balance);
        await saveResponse(client, tid, errorResponse);
        return { responseJson: errorResponse, done: true };
      }

      // Deduct balance
      const updateRes = await client.query(
        'UPDATE users SET balance = balance - $1, total_wagered = total_wagered + $1 WHERE id = $2 RETURNING balance',
        [debitAmount, userId]
      );
      const newBalance = updateRes.rows[0].balance;

      // Create/Update Game Session
      // Try to find active session for this game round
      let sessionId = null;
      const sessionRes = await client.query(
        "SELECT id, session_id FROM game_sessions WHERE session_id = $1", 
        [i_gameid]
      );

      if (sessionRes.rows.length > 0) {
        sessionId = sessionRes.rows[0].id;
        await client.query(
          'UPDATE game_sessions SET bet_amount = bet_amount + $1, updated_at = NOW() WHERE id = $2',
          [debitAmount, sessionId]
        );
      } else {
        // Create new session
        const newSession = await client.query(
          `INSERT INTO game_sessions (user_id, game_id, session_id, provider, currency, status, bet_amount, win_amount)
           VALUES ($1, $2, $3, 'softgamings', $4, 'active', $5, 0) RETURNING id`,
          [userid, req.body.i_gamedesc, i_gameid, req.body.currency, debitAmount]
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
      const loyaltyPoints = Math.floor(debitAmount / 100); // 1 point per 100 currency units
      if (loyaltyPoints > 0) {
        await client.query('UPDATE users SET vip_points = COALESCE(vip_points, 0) + $1 WHERE id = $2', [loyaltyPoints, userId]);
      }

      const okResponse = {
        status: 'OK',
        tid: String(tid),
        balance: formatAmount(newBalance)
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
    return sendOk(res, { tid: String(tid), balance: formatAmount(0) });

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

    // Handle Rollback (if i_rollback is present)
    if (i_rollback) {
      return handleRollback(req, res);
    }

    // Handle cancellation requests (subtype=cancel)
    if (req.body.subtype === 'cancel') {
      return handleRollback(req, res);
    }

    const userId = parseInt(String(userid), 10);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    const result = await withTransaction(pool, async (client) => {
      // 0) Idempotency by TID
      const existingByTid = await findExistingByTid(client, tid);
      if (existingByTid) {
        const prevReq = existingByTid.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_TID_FIELDS), pick(req.body, ESSENTIAL_TID_FIELDS), ESSENTIAL_TID_FIELDS)) {
          const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
          const curBal = balRes.rows[0]?.balance ?? 0;
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByTid.response_json) {
          return { responseJson: existingByTid.response_json, done: true };
        }
        return { timeout: true, done: true };
      }

      // 0b) Idempotency by (i_gameid + i_actionid)
      const existingByAction = await findExistingByAction(client, { userid, i_gameid, i_actionid });
      if (existingByAction) {
        const prevReq = existingByAction.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_ACTION_FIELDS), pick(req.body, ESSENTIAL_ACTION_FIELDS), ESSENTIAL_ACTION_FIELDS)) {
          const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
          const curBal = balRes.rows[0]?.balance ?? 0;
          return { responseJson: buildOwErrorResponse('Transaction parameter mismatch', curBal), done: true };
        }
        if (existingByAction.response_json) {
          return { responseJson: existingByAction.response_json, done: true };
        }
        return { timeout: true, done: true };
      }

      await saveRequest(client, req.body);

      // Lock user
      const userResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
      if (userResult.rows.length === 0) throw { code: 404, msg: 'User not found' };
      const user = userResult.rows[0];

      if (req.body.currency && user.currency && String(user.currency) !== String(req.body.currency)) {
        const errorResponse = buildOwErrorResponse('Currency mismatch', user.balance);
        await saveResponse(client, tid, errorResponse);
        return { responseJson: errorResponse, done: true };
      }
      
      // Add balance
      const updateRes = await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
        [creditAmount, userId]
      );
      const newBalance = updateRes.rows[0].balance;

      // Update Game Session
      await client.query(
        "UPDATE game_sessions SET win_amount = win_amount + $1, updated_at = NOW() WHERE session_id = $2",
        [creditAmount, i_gameid]
      );

      // Record Transaction
      await client.query(
        `INSERT INTO transactions 
        (user_id, type, amount, currency, status, description, round_id, payment_details)
        VALUES ($1, 'win', $2, $3, 'completed', $4, $5, $6)`,
        [
          userId, 
          creditAmount, 
          req.body.currency, 
          `Win in ${req.body.i_gamedesc}`, 
          i_actionid,
          JSON.stringify({ tid: tid.toString(), game_id: i_gameid })
        ]
      );

      const okResponse = {
        status: 'OK',
        tid: String(tid),
        balance: formatAmount(newBalance)
      };
      okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
      await saveResponse(client, tid, okResponse);
      return { responseJson: okResponse, done: true };
    });

    if (result?.timeout) return res.sendStatus(408);
    if (result?.responseJson) return res.status(200).json(result.responseJson);
    return sendOk(res, { tid: String(tid), balance: formatAmount(0) });

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

    const userId = parseInt(String(userid), 10);
    if (Number.isNaN(userId)) {
      return sendOwError(res, 'User not found', '0.00');
    }

    const result = await withTransaction(pool, async (client) => {
      // Idempotency by TID (rollback request TID)
      const existingByTid = await findExistingByTid(client, tid);
      if (existingByTid) {
        const prevReq = existingByTid.request_json;
        if (!sameEssentials(pick(prevReq, ESSENTIAL_TID_FIELDS), pick(req.body, ESSENTIAL_TID_FIELDS), ESSENTIAL_TID_FIELDS)) {
          const balRes = await client.query('SELECT balance FROM users WHERE id = $1', [userId]);
          const curBal = balRes.rows[0]?.balance ?? 0;
          const mismatch = { error: 'Transaction parameter mismatch', balance: formatAmount(curBal) };
          mismatch.hmac = generateHmac(mismatch, HMAC_SECRET);
          return { responseJson: mismatch, done: true };
        }
        if (existingByTid.response_json) return { responseJson: existingByTid.response_json, done: true };
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
      if (!targetReq && req.body.subtype === 'cancel') {
        const existing = await findExistingByAction(client, { userid, i_gameid, i_actionid: req.body.i_actionid });
        targetReq = existing?.request_json || null;
      }

      // Default: no-op if target not found
      if (!targetReq) {
        const okResponse = { status: 'OK', tid: String(tid), balance: formatAmount(user.balance) };
        okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
        await saveResponse(client, tid, okResponse);
        return { responseJson: okResponse, done: true };
      }

      const rollbackAmount = parseFloat(targetReq.amount ?? amount ?? 0);
      if (!Number.isFinite(rollbackAmount) || rollbackAmount <= 0) {
        const okResponse = { status: 'OK', tid: String(tid), balance: formatAmount(user.balance) };
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
          "UPDATE game_sessions SET bet_amount = GREATEST(bet_amount - $1, 0), updated_at = NOW() WHERE session_id = $2",
          [rollbackAmount, i_gameid]
        );
      }

      const okResponse = { status: 'OK', tid: String(tid), balance: formatAmount(newBalance) };
      okResponse.hmac = generateHmac(okResponse, HMAC_SECRET);
      await saveResponse(client, tid, okResponse);
      return { responseJson: okResponse, done: true };
    });

    if (result?.timeout) return res.sendStatus(408);
    if (result?.responseJson) return res.status(200).json(result.responseJson);
    return sendOk(res, { tid: String(tid), balance: formatAmount(0) });

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
