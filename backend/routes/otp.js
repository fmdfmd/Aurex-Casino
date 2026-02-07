const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const nodemailer = require('nodemailer');
const config = require('../config/config');
const pool = require('../config/database');
const { normalizePhone } = require('../utils/phone');

const router = express.Router();

const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || '300', 10); // 5 minutes
const OTP_RESEND_SECONDS = parseInt(process.env.OTP_RESEND_SECONDS || '15', 10); // 15 sec (uCaller limit)
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_CODE_DIGITS = 4; // uCaller uses 4-digit codes

// uCaller — верификация звонком
const UCALLER_SERVICE_ID = process.env.UCALLER_SERVICE_ID;
const UCALLER_SECRET_KEY = process.env.UCALLER_SECRET_KEY;
const UCALLER_API = 'https://api.ucaller.ru/v1.0';

function getOtpSecret() {
  return process.env.OTP_SECRET || config.jwt.secret;
}

function generateCode() {
  if (OTP_CODE_DIGITS === 6) return String(crypto.randomInt(100000, 1000000));
  return String(crypto.randomInt(1000, 10000)); // default 4 digits
}

function hashCode(code) {
  const secret = getOtpSecret();
  return crypto.createHash('sha256').update(`${secret}:${code}`).digest('hex');
}

async function canResend({ destination, channel, purpose }) {
  const result = await pool.query(
    `SELECT created_at
     FROM otp_codes
     WHERE destination = $1 AND channel = $2 AND purpose = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [destination, channel, purpose]
  );

  if (result.rows.length === 0) return true;
  const lastCreatedAt = new Date(result.rows[0].created_at).getTime();
  const secondsAgo = (Date.now() - lastCreatedAt) / 1000;
  return secondsAgo >= OTP_RESEND_SECONDS;
}

async function consumePrevious({ destination, channel, purpose }) {
  await pool.query(
    `UPDATE otp_codes
     SET consumed_at = NOW()
     WHERE destination = $1 AND channel = $2 AND purpose = $3 AND consumed_at IS NULL`,
    [destination, channel, purpose]
  );
}

async function createOtpRow({ destination, channel, purpose, codeHash, ipAddress, userAgent }) {
  const result = await pool.query(
    `INSERT INTO otp_codes (destination, channel, purpose, code_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, NOW() + ($5 || ' seconds')::interval, $6, $7)
     RETURNING id, expires_at`,
    [destination, channel, purpose, codeHash, OTP_TTL_SECONDS, ipAddress || null, userAgent || null]
  );
  return result.rows[0];
}

async function initUcallerCall(phone11, code) {
  if (!UCALLER_SERVICE_ID || !UCALLER_SECRET_KEY) {
    throw new Error('UCALLER_SERVICE_ID or UCALLER_SECRET_KEY is not set');
  }

  const resp = await axios.post(`${UCALLER_API}/initCall`, {
    phone: Number(phone11),
    code: Number(code)
  }, {
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${UCALLER_SECRET_KEY}.${UCALLER_SERVICE_ID}`
    }
  });

  console.log('[uCaller] initCall response:', JSON.stringify(resp.data));
  return resp.data;
}

let mailTransport = null;
function getMailTransport() {
  if (mailTransport) return mailTransport;
  mailTransport = nodemailer.createTransport({
    host: config.email.host,
    port: Number(config.email.port),
    secure: Number(config.email.port) === 465,
    auth: { user: config.email.user, pass: config.email.pass }
  });
  return mailTransport;
}

async function sendEmailOtp(toEmail, code) {
  const transport = getMailTransport();
  const from = process.env.MAIL_FROM || config.email.user;
  const subject = 'AUREX: код подтверждения';
  const text = `Ваш код подтверждения: ${code}\n\nСрок действия: ${Math.floor(OTP_TTL_SECONDS / 60)} мин.\n\nЕсли это не вы — просто игнорируйте сообщение.`;

  await transport.sendMail({
    from,
    to: toEmail,
    subject,
    text
  });
}

function signOtpToken({ channel, destination, purpose, otpId }) {
  return jwt.sign(
    { typ: 'otp', channel, destination, purpose, otpId },
    config.jwt.secret,
    { expiresIn: '15m' }
  );
}

// ========================= SMS OTP =========================

router.post('/sms/send', async (req, res) => {
  try {
    const { phone, purpose = 'register' } = req.body || {};
    console.log('[OTP Phone] Raw phone from request:', JSON.stringify(phone));
    const normalized = normalizePhone(phone);
    console.log('[OTP Phone] Normalized phone:', normalized);
    if (!normalized) {
      return res.status(400).json({ success: false, error: 'Неверный номер телефона' });
    }

    const okToResend = await canResend({ destination: normalized, channel: 'call', purpose });
    if (!okToResend) {
      return res.status(429).json({ success: false, error: 'Подождите 15 секунд перед повторным звонком' });
    }

    const code = generateCode();
    const codeHash = hashCode(code);

    await consumePrevious({ destination: normalized, channel: 'call', purpose });
    const row = await createOtpRow({
      destination: normalized,
      channel: 'call',
      purpose,
      codeHash,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    try {
      const ucallerResult = await initUcallerCall(normalized, code);
      if (!ucallerResult.status) {
        throw new Error(ucallerResult.error || 'uCaller initCall failed');
      }
    } catch (e) {
      await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [row.id]);
      throw e;
    }

    return res.json({
      success: true,
      message: 'Звонок совершён',
      data: { expiresInSeconds: OTP_TTL_SECONDS }
    });
  } catch (error) {
    console.error('OTP call send error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, error: 'Не удалось совершить звонок' });
  }
});

router.post('/sms/verify', async (req, res) => {
  try {
    const { phone, code, purpose = 'register' } = req.body || {};
    const normalized = normalizePhone(phone);
    const codeStr = String(code || '').trim();

    if (!normalized) return res.status(400).json({ success: false, error: 'Неверный номер телефона' });
    if (!/^\d{4,6}$/.test(codeStr)) return res.status(400).json({ success: false, error: 'Неверный код' });

    const result = await pool.query(
      `SELECT *
       FROM otp_codes
       WHERE destination = $1 AND channel = 'call' AND purpose = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalized, purpose]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Код не найден или уже использован' });
    }

    const otp = result.rows[0];
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      return res.status(400).json({ success: false, error: 'Код истёк' });
    }

    const attemptsRes = await pool.query(
      `UPDATE otp_codes
       SET attempts = attempts + 1, last_attempt_at = NOW()
       WHERE id = $1
       RETURNING attempts`,
      [otp.id]
    );
    const attempts = attemptsRes.rows[0]?.attempts ?? (otp.attempts + 1);

    if (attempts > OTP_MAX_ATTEMPTS) {
      await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      return res.status(429).json({ success: false, error: 'Слишком много попыток. Запросите новый код.' });
    }

    const incomingHash = hashCode(codeStr);
    if (incomingHash !== otp.code_hash) {
      return res.status(400).json({ success: false, error: 'Неверный код' });
    }

    await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);

    const otpToken = signOtpToken({
      channel: 'call',
      destination: normalized,
      purpose,
      otpId: otp.id
    });

    return res.json({
      success: true,
      message: 'Телефон подтверждён',
      data: { otpToken }
    });
  } catch (error) {
    console.error('OTP call verify error:', error.message);
    return res.status(500).json({ success: false, error: 'Не удалось проверить код' });
  }
});

// ========================= EMAIL OTP =========================

router.post('/email/send', async (req, res) => {
  try {
    const { email, purpose = 'register' } = req.body || {};
    const normalized = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return res.status(400).json({ success: false, error: 'Неверный email' });
    }

    const okToResend = await canResend({ destination: normalized, channel: 'email', purpose });
    if (!okToResend) {
      return res.status(429).json({ success: false, error: 'Подождите перед повторной отправкой кода' });
    }

    const code = generateCode();
    const codeHash = hashCode(code);

    await consumePrevious({ destination: normalized, channel: 'email', purpose });
    const row = await createOtpRow({
      destination: normalized,
      channel: 'email',
      purpose,
      codeHash,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    try {
      await sendEmailOtp(normalized, code);
    } catch (e) {
      await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [row.id]);
      throw e;
    }

    return res.json({
      success: true,
      message: 'Код отправлен',
      data: { expiresInSeconds: OTP_TTL_SECONDS }
    });
  } catch (error) {
    console.error('OTP email send error:', error.message);
    return res.status(500).json({ success: false, error: 'Не удалось отправить код' });
  }
});

router.post('/email/verify', async (req, res) => {
  try {
    const { email, code, purpose = 'register' } = req.body || {};
    const normalized = String(email || '').trim().toLowerCase();
    const codeStr = String(code || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return res.status(400).json({ success: false, error: 'Неверный email' });
    }
    if (!/^\d{4,6}$/.test(codeStr)) return res.status(400).json({ success: false, error: 'Неверный код' });

    const result = await pool.query(
      `SELECT *
       FROM otp_codes
       WHERE destination = $1 AND channel = 'email' AND purpose = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalized, purpose]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Код не найден или уже использован' });
    }

    const otp = result.rows[0];
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      return res.status(400).json({ success: false, error: 'Код истёк' });
    }

    const attemptsRes = await pool.query(
      `UPDATE otp_codes
       SET attempts = attempts + 1, last_attempt_at = NOW()
       WHERE id = $1
       RETURNING attempts`,
      [otp.id]
    );
    const attempts = attemptsRes.rows[0]?.attempts ?? (otp.attempts + 1);

    if (attempts > OTP_MAX_ATTEMPTS) {
      await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);
      return res.status(429).json({ success: false, error: 'Слишком много попыток. Запросите новый код.' });
    }

    const incomingHash = hashCode(codeStr);
    if (incomingHash !== otp.code_hash) {
      return res.status(400).json({ success: false, error: 'Неверный код' });
    }

    await pool.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);

    const otpToken = signOtpToken({
      channel: 'email',
      destination: normalized,
      purpose,
      otpId: otp.id
    });

    return res.json({
      success: true,
      message: 'Email подтверждён',
      data: { otpToken }
    });
  } catch (error) {
    console.error('OTP email verify error:', error.message);
    return res.status(500).json({ success: false, error: 'Не удалось проверить код' });
  }
});

module.exports = router;

