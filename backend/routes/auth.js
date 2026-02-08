const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const config = require('../config/config');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');
const router = express.Router();
const { normalizePhone } = require('../utils/phone');

// Format user for response
const formatUser = (user) => {
  if (!user) return null;
  const id = user.id;
  const balance = parseFloat(user.balance) || 0;
  const bonusBalance = parseFloat(user.bonus_balance) || 0;
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

    const { username, email, password, referralCode, phone, firstName, lastName } = req.body;
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

    // Create user
    const result = await pool.query(
      `INSERT INTO users (odid, username, email, password, phone, first_name, last_name, referral_code, referred_by, balance, bonus_balance, vip_level, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 1, true) RETURNING *`,
      [odid, username, normalizedEmail, hashedPassword, normalizedPhone || null, firstName || null, lastName || null, userReferralCode, referredBy]
    );

    const user = result.rows[0];

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
    
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const values = [req.user.id];
    
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
      'SELECT COUNT(*) FROM transactions WHERE user_id = $1',
      [req.user.id]
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

// ===== GOOGLE OAUTH 2.0 =====

// Build Google callback URL — use GOOGLE_CALLBACK_URL or derive from frontend URL
const getGoogleCallbackUrl = () => {
  const { callbackUrl } = config.google || {};
  // If explicitly configured as full URL, use it
  if (callbackUrl && callbackUrl.startsWith('http')) return callbackUrl;
  // Otherwise build from frontend URL
  const frontendUrl = (config.server.frontendUrl || '').replace(/\/$/, '');
  return `${frontendUrl}/api/auth/google/callback`;
};

// Step 1: Redirect to Google
router.get('/google', (req, res) => {
  const { clientId } = config.google || {};
  if (!clientId) {
    return res.status(500).json({ success: false, error: 'Google OAuth не настроен' });
  }

  const fullCallbackUrl = getGoogleCallbackUrl();

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
  const frontendUrl = config.server.frontendUrl;
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${frontendUrl}/login?error=no_code`);
    }

    const { clientId, clientSecret } = config.google || {};
    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    const fullCallbackUrl = getGoogleCallbackUrl();

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

      const insertResult = await pool.query(
        `INSERT INTO users (odid, username, email, google_id, google_email, first_name, last_name, referral_code, balance, bonus_balance, vip_level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, 1, true) RETURNING *`,
        [odid, username, googleEmail, googleId, googleEmail, firstName, lastName, referralCode]
      );
      user = insertResult.rows[0];
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

router.post('/telegram', async (req, res) => {
  try {
    const telegramData = req.body;
    const { id, first_name, last_name, username: tgUsername, photo_url, auth_date, hash } = telegramData;

    if (!id || !hash || !auth_date) {
      return res.status(400).json({ success: false, error: 'Неверные данные Telegram' });
    }

    // Verify signature
    const botToken = config.telegram?.botToken;
    if (!botToken) {
      return res.status(500).json({ success: false, error: 'Telegram бот не настроен' });
    }

    const crypto = require('crypto');

    // Create the data-check-string
    const checkFields = Object.keys(telegramData)
      .filter(k => k !== 'hash')
      .sort()
      .map(k => `${k}=${telegramData[k]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey).update(checkFields).digest('hex');

    if (hmac !== hash) {
      return res.status(401).json({ success: false, error: 'Неверная подпись Telegram' });
    }

    // Check auth_date is not too old (allow up to 1 day)
    const authAge = Math.floor(Date.now() / 1000) - parseInt(auth_date);
    if (authAge > 86400) {
      return res.status(401).json({ success: false, error: 'Данные Telegram устарели' });
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

      const insertResult = await pool.query(
        `INSERT INTO users (odid, username, telegram_id, first_name, last_name, referral_code, balance, bonus_balance, vip_level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 1, true) RETURNING *`,
        [odid, finalUsername, telegramId, first_name || null, last_name || null, referralCode]
      );
      user = insertResult.rows[0];
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, error: 'Аккаунт деактивирован' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Telegram login successful',
      data: {
        user: formatUser(user),
        token
      }
    });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ success: false, error: 'Telegram auth failed' });
  }
});

module.exports = router;
