const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const config = require('../config/config');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const router = express.Router();
const { normalizePhone } = require('../utils/phone');
const fundistService = require('../services/fundistApiService');

// Format user for response
const formatUser = (user) => {
  if (!user) return null;
  const id = user.id;
  const balance = parseFloat(user.balance) || 0;
  const bonusBalance = parseFloat(user.bonus_balance) || 0;
  const currency = user.currency || 'RUB';
  return {
    id,
    odid: user.odid || `AUREX-${String(id).padStart(6, '0')}`,
    username: user.username,
    email: user.email,
    phone: user.phone || null,
    firstName: user.first_name || null,
    lastName: user.last_name || null,
    country: user.country || null,
    birthDate: user.birth_date || null,
    balance,
    bonusBalance,
    currency,
    totalBalanceRUB: balance + bonusBalance,
    vipLevel: user.vip_level || 1,
    vipPoints: user.vip_points || 0,
    isVerified: user.is_verified || false,
    isAdmin: user.is_admin || false,
    role: user.is_admin ? 'admin' : 'user',
    referralCode: user.referral_code,
    googleEmail: user.google_email || null,
    telegramId: user.telegram_id || null,
    totalDeposited: parseFloat(user.total_deposited) || 0,
    totalWithdrawn: parseFloat(user.total_withdrawn) || 0,
    gamesPlayed: parseInt(user.games_played) || 0,
    totalWagered: parseFloat(user.total_wagered) || 0,
    depositCount: user.deposit_count || 0,
    lastLogin: user.last_login,
    createdAt: user.created_at
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// Multi-account check helper
const checkMultiAccount = async (req) => {
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0';
  const skipIps = ['127.0.0.1', '::1', '0.0.0.0'];
  if (skipIps.includes(ip)) return { isSuspicious: false, reason: null, ip };
  const result = await pool.query(
    `SELECT username FROM users WHERE registration_ip = $1 AND is_active = true LIMIT 3`,
    [ip]
  );
  if (result.rows.length > 0) {
    const names = result.rows.map(u => u.username).join(', ');
    console.warn(`[MultiAcc] IP ${ip} already has accounts: ${names}`);
    return { isSuspicious: true, reason: `Мультиакк: IP ${ip}, существующие аккаунты: ${names}`, ip };
  }
  return { isSuspicious: false, reason: null, ip };
};

// Register — поддерживает регистрацию по email ИЛИ по телефону (или оба)
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 32 })
    .withMessage('Username must be between 3 and 32 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      return Boolean(normalizePhone(value));
    })
    .withMessage('Please provide a valid phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, email, password, referralCode, phone, firstName, lastName, clickId } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    // Телефон обязателен при обычной регистрации
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Укажите номер телефона'
      });
    }

    // Check if user already exists
    const conditions = ['username = $1'];
    const values = [username];
    if (normalizedEmail) {
      values.push(normalizedEmail);
      conditions.push(`email = $${values.length}`);
    }
    if (normalizedPhone) {
      values.push(normalizedPhone);
      conditions.push(`phone = $${values.length}`);
    }

    const existingResult = await pool.query(
      `SELECT * FROM users WHERE ${conditions.join(' OR ')}`,
      values
    );

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      return res.status(400).json({
        success: false,
        error:
          existing.username === username
            ? 'Username already taken'
            : normalizedEmail && existing.email === normalizedEmail
              ? 'Email already registered'
              : 'Телефон уже зарегистрирован'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate ODID and referral code
    const odid = `AUREX-${Date.now().toString(36).toUpperCase()}`;
    const crypto = require('crypto');
    const userReferralCode = `REF-${username.toUpperCase().slice(0, 6)}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Find referrer if referral code provided
    let referredBy = null;
    if (referralCode) {
      const referrerResult = await pool.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referralCode]
      );
      if (referrerResult.rows.length > 0) {
        referredBy = referrerResult.rows[0].id;
      }
    }

    // Multi-account check by IP
    const { isSuspicious, reason: suspiciousReason, ip: registrationIp } = await checkMultiAccount(req);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (odid, username, email, password, phone, first_name, last_name, referral_code, referred_by, balance, bonus_balance, vip_level, is_active, click_id, registration_ip, last_ip, is_suspicious, suspicious_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 1, true, $10, $11, $11, $12, $13) RETURNING *`,
      [odid, username, normalizedEmail, hashedPassword, normalizedPhone || null, firstName || null, lastName || null, userReferralCode, referredBy, clickId || null, registrationIp, isSuspicious, suspiciousReason]
    );

    const user = result.rows[0];

    // Create user in Fundist system (non-blocking, for freerounds etc.)
    fundistService.ensureFundistUser(user.id, 'RUB', {
      ip: req.ip || '0.0.0.0',
      language: 'ru'
    }).catch(err => console.log('[reg] Fundist user creation deferred:', err.message));

    // Fire registration postback (non-blocking)
    if (clickId) {
      const { fireRegPostback } = require('../services/postbackService');
      fireRegPostback(user.id).catch(err => console.error('[reg] Postback error:', err.message));
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: formatUser(user),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Login
router.post('/login', [
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { login, email, password, phone } = req.body;
    const rawLogin = login || email || phone;
    const normalizedPhone = normalizePhone(rawLogin);
    const loginValue = normalizedPhone || rawLogin;

    if (!loginValue) {
      return res.status(400).json({ success: false, error: 'Email или логин обязателен' });
    }

    // Find user by email or username
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1 OR phone = $1',
      [loginValue]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
    }

    const user = result.rows[0];

    // Social-login users may not have a password
    if (!user.password) {
      const methods = [];
      if (user.google_id) methods.push('Google');
      if (user.telegram_id) methods.push('Telegram');
      return res.status(401).json({
        success: false,
        error: `Этот аккаунт использует вход через ${methods.join(' / ') || 'соцсеть'}. Используйте соответствующую кнопку.`
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ success: false, error: 'Аккаунт деактивирован' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUser(user),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = formatUser(result.rows[0]);

    // Подтягиваем активные бонусы для расчёта вейджера
    const bonusResult = await pool.query(
      `SELECT bonus_type, amount, wagering_requirement, wagering_completed, expires_at 
       FROM bonuses WHERE user_id = $1 AND status = 'active' 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    if (bonusResult.rows.length > 0) {
      // Суммируем все активные вейджеры
      const totalRequired = bonusResult.rows.reduce((sum, b) => sum + parseFloat(b.wagering_requirement || 0), 0);
      const totalCompleted = bonusResult.rows.reduce((sum, b) => sum + parseFloat(b.wagering_completed || 0), 0);
      // Средний множитель из первого бонуса
      const firstBonus = bonusResult.rows[0];
      const bonusAmount = parseFloat(firstBonus.amount || 0);
      const wagerReq = parseFloat(firstBonus.wagering_requirement || 0);
      const multiplier = bonusAmount > 0 ? Math.round(wagerReq / bonusAmount) : 0;

      userData.wager = {
        active: totalRequired > totalCompleted,
        required: totalRequired,
        completed: totalCompleted,
        multiplier,
        expiresAt: firstBonus.expires_at
      };
    }

    res.json({
      success: true,
      data: { user: userData }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user data' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, phone, country, birthDate } = req.body;
    
    const updates = [];
    const values = [];
    
    if (firstName !== undefined) {
      values.push(firstName);
      updates.push(`first_name = $${values.length}`);
    }
    if (lastName !== undefined) {
      values.push(lastName);
      updates.push(`last_name = $${values.length}`);
    }
    if (phone !== undefined) {
      const normalizedPhone = normalizePhone(phone);
      values.push(normalizedPhone || phone || null);
      updates.push(`phone = $${values.length}`);
    }
    if (country !== undefined) {
      values.push(country || null);
      updates.push(`country = $${values.length}`);
    }
    if (birthDate !== undefined) {
      values.push(birthDate || null);
      updates.push(`birth_date = $${values.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }
    
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: formatUser(result.rows[0]) }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Refresh token
router.post('/refresh', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const token = generateToken(result.rows[0].id);

    res.json({ success: true, data: { token } });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ success: false, error: 'Failed to refresh token' });
  }
});

// Get user's transactions history
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Only show financial transactions (not game bets/wins)
    const financialTypes = ['deposit', 'withdrawal', 'promo_bonus', 'cashback', 'referral_bonus', 'admin_adjustment'];
    
    let query = `SELECT * FROM transactions WHERE user_id = $1 AND type = ANY($2)`;
    const values = [req.user.id, financialTypes];
    
    if (type && type !== 'all') {
      values.push(type);
      query += ` AND type = $${values.length}`;
    }
    
    values.push(parseInt(limit));
    query += ` ORDER BY created_at DESC LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;
    
    const result = await pool.query(query, values);
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = ANY($2)`,
      [req.user.id, financialTypes]
    );
    
    res.json({
      success: true,
      data: {
        transactions: result.rows.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          currency: t.currency,
          status: t.status,
          method: t.payment_method || t.description || 'N/A',
          description: t.description,
          externalRef: t.wallet_address || null,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
});

// Get user's game history
router.get('/games/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(
      `SELECT * FROM game_sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );
    
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_games,
        COALESCE(SUM(bet_amount), 0) as total_bet,
        COALESCE(SUM(win_amount), 0) as total_win,
        COALESCE(MAX(win_amount), 0) as biggest_win
      FROM game_sessions WHERE user_id = $1
    `, [req.user.id]);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM game_sessions WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: {
        sessions: result.rows.map(s => ({
          id: s.id,
          gameId: s.game_id,
          gameName: s.game_name || s.game_id,
          provider: s.provider,
          betAmount: parseFloat(s.bet_amount || '0'),
          totalBet: parseFloat(s.bet_amount || '0'),
          winAmount: parseFloat(s.win_amount || '0'),
          totalWin: parseFloat(s.win_amount || '0'),
          currency: s.currency,
          status: s.status,
          createdAt: s.started_at || s.created_at,
          endedAt: s.ended_at
        })),
        stats: {
          totalGames: parseInt(statsResult.rows[0].total_games),
          totalBet: parseFloat(statsResult.rows[0].total_bet),
          totalWin: parseFloat(statsResult.rows[0].total_win),
          biggestWin: parseFloat(statsResult.rows[0].biggest_win)
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get game history' });
  }
});

// Logout
router.post('/logout', auth, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ===== FORGOT PASSWORD =====

// Reset password with verified phone (after uCaller verification)
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Укажите все данные' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Пароль должен быть не менее 6 символов' });
    }

    // Verify code one more time via otp_codes table (purpose: forgot_password)
    const codeHash = require('crypto').createHash('sha256').update(`${process.env.OTP_SECRET || require('../config/config').jwt.secret}:${code}`).digest('hex');
    
    const codeResult = await pool.query(
      `SELECT * FROM otp_codes 
       WHERE destination = $1 AND purpose = 'forgot_password' AND code_hash = $2 
       AND consumed_at IS NOT NULL AND expires_at > CURRENT_TIMESTAMP 
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedPhone, codeHash]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Сначала подтвердите номер телефона' });
    }

    // Find user
    const userResult = await pool.query('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Пользователь не найден' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userResult.rows[0].id]
    );

    res.json({ success: true, message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Ошибка сброса пароля' });
  }
});

// ===== GOOGLE OAUTH 2.0 =====

// Build Google callback URL dynamically from the request origin
const getGoogleCallbackUrl = (req) => {
  const origin = req.headers['x-forwarded-host'] || req.headers.origin?.replace(/^https?:\/\//, '') || req.headers.host;
  if (origin && !origin.includes('railway.app') && !origin.includes('localhost')) {
    return `https://${origin}/api/auth/google/callback`;
  }
  const { callbackUrl } = config.google || {};
  if (callbackUrl && callbackUrl.startsWith('http')) return callbackUrl;
  const frontendUrl = (config.server.frontendUrl || '').replace(/\/$/, '');
  return `${frontendUrl}/api/auth/google/callback`;
};

// Step 1: Redirect to Google
router.get('/google', (req, res) => {
  const { clientId } = config.google || {};
  if (!clientId) {
    return res.status(500).json({ success: false, error: 'Google OAuth не настроен' });
  }

  if (req.query.ref) {
    res.cookie('aurex_ref', req.query.ref, { maxAge: 30 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
  }

  const fullCallbackUrl = getGoogleCallbackUrl(req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: fullCallbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Step 2: Google callback — exchange code for tokens, find/create user
router.get('/google/callback', async (req, res) => {
  const origin = req.headers['x-forwarded-host'] || req.headers.host;
  const frontendUrl = (origin && !origin.includes('railway.app') && !origin.includes('localhost'))
    ? `https://${origin}`
    : config.server.frontendUrl;
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    const { clientId, clientSecret } = config.google || {};
    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    const fullCallbackUrl = getGoogleCallbackUrl(req);

    // Exchange code for tokens
    const https = require('https');
    const tokenData = await new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: fullCallbackUrl,
        grant_type: 'authorization_code'
      }).toString();

      const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    if (tokenData.error) {
      console.error('Google token error:', tokenData);
      return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);
    }

    // Get user profile from Google
    const googleProfile = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: '/oauth2/v2/userinfo',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      request.on('error', reject);
      request.end();
    });

    if (!googleProfile.id) {
      console.error('Google profile error:', googleProfile);
      return res.redirect(`${frontendUrl}/login?error=profile_fetch_failed`);
    }

    const googleId = String(googleProfile.id);
    const googleEmail = googleProfile.email || null;
    const firstName = googleProfile.given_name || null;
    const lastName = googleProfile.family_name || null;

    // Try to find existing user by google_id
    let userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user;

    if (userResult.rows.length > 0) {
      // Existing Google user — just login
      user = userResult.rows[0];
      await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    } else if (googleEmail) {
      // Check if user with this email already exists — link Google
      userResult = await pool.query('SELECT * FROM users WHERE email = $1', [googleEmail]);
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
        await pool.query(
          'UPDATE users SET google_id = $1, google_email = $2, last_login = CURRENT_TIMESTAMP WHERE id = $3',
          [googleId, googleEmail, user.id]
        );
      }
    }

    if (!user) {
      // Create new user
      const crypto = require('crypto');
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const username = `user_${randomSuffix}`;
      const odid = `AUREX-${Date.now().toString(36).toUpperCase()}`;
      const referralCode = `REF-${username.toUpperCase().slice(0, 6)}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // Check referral from cookie
      let referredBy = null;
      const refCode = req.cookies?.aurex_ref;
      if (refCode) {
        const refResult = await pool.query('SELECT id FROM users WHERE referral_code = $1', [refCode]);
        if (refResult.rows.length > 0) referredBy = refResult.rows[0].id;
        res.clearCookie('aurex_ref');
      }

      const { isSuspicious: gSusp, reason: gReason, ip: gIp } = await checkMultiAccount(req);
      const insertResult = await pool.query(
        `INSERT INTO users (odid, username, email, google_id, google_email, first_name, last_name, referral_code, referred_by, balance, bonus_balance, vip_level, is_active, registration_ip, last_ip, is_suspicious, suspicious_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 1, true, $10, $10, $11, $12) RETURNING *`,
        [odid, username, googleEmail, googleId, googleEmail, firstName, lastName, referralCode, referredBy, gIp, gSusp, gReason]
      );
      user = insertResult.rows[0];

      // Create user in Fundist (non-blocking)
      fundistService.ensureFundistUser(user.id, 'RUB', { language: 'ru' })
        .catch(err => console.log('[google-reg] Fundist user creation deferred:', err.message));
    }

    if (!user.is_active) {
      return res.redirect(`${frontendUrl}/login?error=account_disabled`);
    }

    const token = generateToken(user.id);

    // Redirect to frontend with token
    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

// ===== TELEGRAM LOGIN =====

// Helper: verify Telegram data and find/create user
async function processTelegramAuth(telegramData) {
  const { id, first_name, last_name, username: tgUsername, photo_url, auth_date, hash } = telegramData;

  if (!id || !hash || !auth_date) {
    throw new Error('Неверные данные Telegram');
  }

  const botToken = config.telegram?.botToken;
  if (!botToken) {
    throw new Error('Telegram бот не настроен');
  }

  const crypto = require('crypto');

  // Only include fields that Telegram actually signs
  const telegramFields = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'];
  const checkFields = telegramFields
    .filter(k => telegramData[k] !== undefined && telegramData[k] !== null)
    .sort()
    .map(k => `${k}=${telegramData[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkFields).digest('hex');

  if (hmac !== hash) {
    throw new Error('Неверная подпись Telegram');
  }

  // Check auth_date is not too old (allow up to 1 day)
  const authAge = Math.floor(Date.now() / 1000) - parseInt(auth_date);
  if (authAge > 86400) {
    throw new Error('Данные Telegram устарели');
  }

  const telegramId = String(id);

  // Find existing user by telegram_id
  let userResult = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
  let user;

  if (userResult.rows.length > 0) {
    user = userResult.rows[0];
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
  } else {
    // Create new user
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const username = tgUsername || `tg_${randomSuffix}`;
    const odid = `AUREX-${Date.now().toString(36).toUpperCase()}`;
    const referralCode = `REF-${username.toUpperCase().slice(0, 6)}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Check if username already taken
    const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    const finalUsername = existingUsername.rows.length > 0 ? `${username}_${randomSuffix}` : username;

    // Check referral code
    let referredBy = null;
    if (telegramData.referralCode) {
      const refResult = await pool.query('SELECT id FROM users WHERE referral_code = $1', [telegramData.referralCode]);
      if (refResult.rows.length > 0) referredBy = refResult.rows[0].id;
    }

    const { isSuspicious: tSusp, reason: tReason, ip: tIp } = await checkMultiAccount(req);
    const insertResult = await pool.query(
      `INSERT INTO users (odid, username, telegram_id, first_name, last_name, referral_code, referred_by, balance, bonus_balance, vip_level, is_active, registration_ip, last_ip, is_suspicious, suspicious_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 1, true, $8, $8, $9, $10) RETURNING *`,
      [odid, finalUsername, telegramId, first_name || null, last_name || null, referralCode, referredBy, tIp, tSusp, tReason]
    );
    user = insertResult.rows[0];

    // Create user in Fundist (non-blocking)
    fundistService.ensureFundistUser(user.id, 'RUB', { language: 'ru' })
      .catch(err => console.log('[tg-reg] Fundist user creation deferred:', err.message));
  }

  if (!user.is_active) {
    throw new Error('Аккаунт деактивирован');
  }

  return user;
}

// POST /auth/telegram — for AJAX calls
router.post('/telegram', async (req, res) => {
  try {
    const user = await processTelegramAuth(req.body);
    const token = generateToken(user.id);
    res.json({
      success: true,
      message: 'Telegram login successful',
      data: { user: formatUser(user), token }
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(401).json({ success: false, error: error.message || 'Telegram auth failed' });
  }
});

// GET /auth/telegram/callback — redirect-based flow (like Google)
router.get('/telegram/callback', async (req, res) => {
  // Приоритет: cookie (сохранён с фронта) → x-forwarded-host → дефолт
  const cookieOrigin = req.cookies?.aurex_origin ? decodeURIComponent(req.cookies.aurex_origin) : null;
  const tgOrigin = req.headers['x-forwarded-host'] || req.headers.host;
  const rawFrontend = cookieOrigin
    || ((tgOrigin && !tgOrigin.includes('railway.app') && !tgOrigin.includes('localhost')) ? `https://${tgOrigin}` : null)
    || config.server.frontendUrl;
  const frontendUrl = rawFrontend.replace(/\/$/, '');
  try {
    // Pass referral code from cookie to processTelegramAuth
    const refCode = req.cookies?.aurex_ref;
    const authData = { ...req.query };
    if (refCode) authData.referralCode = refCode;

    const user = await processTelegramAuth(authData);
    const token = generateToken(user.id);
    res.clearCookie('aurex_ref');
    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Telegram callback error:', error);
    res.redirect(`${frontendUrl}/login?error=telegram_failed`);
  }
});

module.exports = router;
