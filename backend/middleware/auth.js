const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const config = require('../config/config');

const JWT_SECRET = config.jwt.secret;

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, odid, username, email, phone, is_admin, is_active, vip_level, balance, bonus_balance, currency, country, used_bonuses, deposit_count FROM users WHERE id = $1',
      [decoded.userId || decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Пользователь не найден' });
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Аккаунт заблокирован' });
    }

    req.user = {
      id: user.id,
      odid: user.odid,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      vipLevel: user.vip_level,
      balance: parseFloat(user.balance),
      bonusBalance: parseFloat(user.bonus_balance),
      currency: user.currency || 'RUB',
      country: user.country || 'RUS'
    };
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Токен истёк' });
    }
    console.error('Auth middleware error:', error);
    res.status(401).json({ success: false, message: 'Ошибка авторизации' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, odid, username, email, is_admin, is_active, vip_level FROM users WHERE id = $1',
      [decoded.userId || decoded.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Пользователь не найден' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Аккаунт заблокирован' });
    }
    
    if (!user.is_admin) {
      return res.status(403).json({ success: false, message: 'Доступ запрещён' });
    }

    req.user = {
      id: user.id,
      odid: user.odid,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      vipLevel: user.vip_level
    };
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Токен истёк' });
    }
    console.error('Admin auth error:', error);
    res.status(401).json({ success: false, message: 'Ошибка авторизации' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const result = await pool.query(
        'SELECT id, odid, username, email, is_admin, is_active, vip_level, balance, bonus_balance, currency, country FROM users WHERE id = $1',
        [decoded.userId || decoded.id]
      );
      
      if (result.rows.length > 0) {
        const user = result.rows[0];
        req.user = {
          id: user.id,
          odid: user.odid,
          username: user.username,
          email: user.email,
          isAdmin: user.is_admin,
          vipLevel: user.vip_level,
          balance: parseFloat(user.balance),
          bonusBalance: parseFloat(user.bonus_balance),
          currency: user.currency || 'RUB',
          country: user.country || 'RUS'
        };
      }
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { auth, adminAuth, optionalAuth };
