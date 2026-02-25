const axios = require('axios');
const pool = require('../config/database');

const POSTBACK_URLS = {
  reg: 'https://trackhta.com/close/?token={click_id}&advertiserId=360552&label=reg',
  ftd: 'https://trackhta.com/close/?token={click_id}&advertiserId=360552',
};

async function firePostback(type, clickId) {
  if (!clickId || !POSTBACK_URLS[type]) return false;

  const url = POSTBACK_URLS[type].replace('{click_id}', encodeURIComponent(clickId));

  try {
    const res = await axios.get(url, { timeout: 10000 });
    console.log(`[POSTBACK] ${type} fired for click_id=${clickId} → ${res.status}`);
    return true;
  } catch (err) {
    console.error(`[POSTBACK] ${type} FAILED for click_id=${clickId}:`, err.message);
    return false;
  }
}

async function fireRegPostback(userId) {
  try {
    const { rows } = await pool.query(
      'SELECT click_id, postback_reg_sent FROM users WHERE id = $1',
      [userId]
    );
    const user = rows[0];
    if (!user?.click_id || user.postback_reg_sent) return;

    const ok = await firePostback('reg', user.click_id);
    if (ok) {
      await pool.query('UPDATE users SET postback_reg_sent = TRUE WHERE id = $1', [userId]);
    }
  } catch (err) {
    console.error('[POSTBACK] fireRegPostback error:', err.message);
  }
}

async function fireFtdPostback(userId) {
  try {
    const { rows } = await pool.query(
      'SELECT click_id, postback_ftd_sent FROM users WHERE id = $1',
      [userId]
    );
    const user = rows[0];
    if (!user?.click_id || user.postback_ftd_sent) return;

    const ok = await firePostback('ftd', user.click_id);
    if (ok) {
      await pool.query('UPDATE users SET postback_ftd_sent = TRUE WHERE id = $1', [userId]);
    }
  } catch (err) {
    console.error('[POSTBACK] fireFtdPostback error:', err.message);
  }
}

module.exports = { fireRegPostback, fireFtdPostback };
