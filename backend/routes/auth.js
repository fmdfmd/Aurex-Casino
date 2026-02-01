const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const config = require('../config/config');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Determine which database to use
const usePostgres = !!process.env.DATABASE_URL;
let pool, User;

if (usePostgres) {
  pool = require('../config/database');
  console.log('🐘 Auth using PostgreSQL');
} else {
  User = require('../models/temp-models').User;
  console.log('📦 Auth using in-memory storage');
}

// PostgreSQL User helpers
const PGUser = {
  async findOne(query) {
    if (!usePostgres) return User.findOne(query);
    try {
      if (query.email) {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [query.email]);
        return result.rows[0] || null;
      }
      if (query.username) {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [query.username]);
        return result.rows[0] || null;
      }
      if (query.$or) {
        const email = query.$or.find(q => q.email)?.email;
        const username = query.$or.find(q => q.username)?.username;
        const result = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
        return result.rows[0] || null;
      }
      if (query.referralCode) {
        const result = await pool.query('SELECT * FROM users WHERE referral_code = $1', [query.referralCode]);
        return result.rows[0] || null;
      }
      return null;
    } catch (e) { console.error('PGUser.findOne error:', e); return null; }
  },
  async findById(id) {
    if (!usePostgres) return User.findById(id);
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (e) { console.error('PGUser.findById error:', e); return null; }
  },
  async create(data) {
    if (!usePostgres) return User.create(data);
    try {
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const odid = `AUREX-${Date.now().toString(36).toUpperCase()}`;
      const referralCode = `REF-${data.username.toUpperCase().slice(0, 6)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const result = await pool.query(
        `INSERT INTO users (odid, username, email, password, referral_code, balance, bonus_balance, vip_level, is_active)
         VALUES ($1, $2, $3, $4, $5, 1000, 500, 1, true) RETURNING *`,
        [odid, data.username, data.email, hashedPassword, referralCode]
      );
      const user = result.rows[0];
      user._id = user.id;
      user.comparePassword = async (pwd) => bcrypt.compare(pwd, user.password);
      user.save = async () => user;
      return user;
    } catch (e) { console.error('PGUser.create error:', e); throw e; }
  },
  async comparePassword(user, pwd) {
    if (user.comparePassword) return user.comparePassword(pwd);
    return bcrypt.compare(pwd, user.password);
  },
  async updateById(id, updates) {
    if (!usePostgres) {
      const user = await User.findById(id);
      if (user) { Object.assign(user, updates); await user.save(); }
      return user;
    }
    try {
      const result = await pool.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0] || null;
    } catch (e) { console.error('PGUser.updateById error:', e); return null; }
  }
};

// Format user for response
const formatUser = (user) => {
  if (!user) return null;
  const id = user._id || user.id;
  return {
    id,
    odid: user.odid || `AUREX-${String(id).padStart(6, '0')}`,
    username: user.username,
    email: user.email,
    firstName: user.firstName || user.first_name,
    lastName: user.lastName || user.last_name,
    balance: user.balance || { RUB: parseFloat(user.balance) || 0 },
    bonusBalance: parseFloat(user.bonusBalance || user.bonus_balance) || 0,
    vipLevel: user.vipLevel || user.vip_level || 1,
    vipPoints: user.vipPoints || user.vip_points || 0,
    isVerified: user.isVerified || user.is_verified || false,
    isAdmin: user.isAdmin || user.is_admin || false,
    role: (user.isAdmin || user.is_admin) ? 'admin' : (user.role || 'user'),
    referralCode: user.referralCode || user.referral_code,
    depositCount: user.depositCount || user.deposit_count || 0,
    usedBonuses: user.usedBonuses || user.used_bonuses || {},
    wager: user.wager || { required: 0, completed: 0, active: false },
    lastLogin: user.lastLogin || user.last_login,
    createdAt: user.createdAt || user.created_at
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// Register
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 32 })
    .withMessage('Username must be between 3 and 32 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters')
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

    const { username, email, password, firstName, lastName, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await PGUser.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }

    // Create new user
    const user = await PGUser.create({ username, email, password, firstName, lastName });

    // Generate token
    const token = generateToken(user._id || user.id);

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
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login - поддержка входа по email ИЛИ username
router.post('/login', [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
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

    // Поддержка login (username) или email
    const { login, email, password } = req.body;
    const loginValue = login || email;

    if (!loginValue) {
      return res.status(400).json({
        success: false,
        error: 'Email или логин обязателен'
      });
    }

    // Поиск пользователя по email ИЛИ username
    let user = await PGUser.findOne({ email: loginValue });
    if (!user) {
      user = await PGUser.findOne({ username: loginValue });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }

    // Check password
    const isPasswordValid = await PGUser.comparePassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Неверный логин или пароль'
      });
    }

    // Check if user is active
    if (user.isActive === false || user.is_active === false) {
      return res.status(401).json({
        success: false,
        error: 'Аккаунт деактивирован'
      });
    }

    // Update last login
    await PGUser.updateById(user._id || user.id, { lastLogin: new Date() });

    // Generate token
    const token = generateToken(user._id || user.id);

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
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await PGUser.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: formatUser(user)
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
});

// Update user profile
router.put('/profile', auth, [
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters'),
  body('settings.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be boolean'),
  body('settings.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be boolean'),
  body('settings.privacy.showOnline')
    .optional()
    .isBoolean()
    .withMessage('Show online status must be boolean')
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

    const updates = req.body;
    const user = await PGUser.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update allowed fields
    if (updates.firstName !== undefined) user.firstName = updates.firstName;
    if (updates.lastName !== undefined) user.lastName = updates.lastName;
    if (updates.settings) {
      if (updates.settings.notifications) {
        Object.assign(user.settings.notifications, updates.settings.notifications);
      }
      if (updates.settings.privacy) {
        Object.assign(user.settings.privacy, updates.settings.privacy);
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          settings: user.settings
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Change password
router.put('/change-password', auth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
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
    const user = await PGUser.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await PGUser.comparePassword(user, currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Refresh token
router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await PGUser.findById(req.user.id);
    
    if (!user || user.isActive === false || user.is_active === false) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const token = generateToken(user._id || user.id);

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token'
    });
  }
});

// Get user's transactions history
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    // Get transactions from global store
    const allTransactions = global.tempTransactions || [];
    
    // Filter by user
    let userTransactions = allTransactions.filter(t => 
      t.user === req.user.id || t.userId === req.user.id
    );
    
    // Filter by type if specified
    if (type && type !== 'all') {
      userTransactions = userTransactions.filter(t => t.type === type);
    }
    
    // Sort by date (newest first)
    userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTransactions = userTransactions.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userTransactions.length,
          pages: Math.ceil(userTransactions.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions'
    });
  }
});

// Get user's game history
router.get('/games/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Get game sessions from global store
    const allSessions = global.tempGameSessions || [];
    
    // Filter by user
    let userSessions = allSessions.filter(s => 
      s.user === req.user.id || s.userId === req.user.id
    );
    
    // Sort by date (newest first)
    userSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedSessions = userSessions.slice(offset, offset + parseInt(limit));
    
    // Calculate stats
    const stats = {
      totalGames: userSessions.length,
      totalBet: userSessions.reduce((sum, s) => sum + (s.totalBet || 0), 0),
      totalWin: userSessions.reduce((sum, s) => sum + (s.totalWin || 0), 0),
      biggestWin: Math.max(0, ...userSessions.map(s => s.totalWin || 0))
    };
    
    res.json({
      success: true,
      data: {
        sessions: paginatedSessions,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userSessions.length,
          pages: Math.ceil(userSessions.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game history'
    });
  }
});

// Logout (client-side only, token blacklisting would require Redis)
router.post('/logout', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;