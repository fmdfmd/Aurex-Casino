const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// Dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // User statistics
    const usersResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE last_login >= CURRENT_DATE - INTERVAL '1 day' AND is_active = true) as active
      FROM users
    `);

    // Game sessions statistics
    const gamesResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE) as today_sessions,
        COUNT(*) FILTER (WHERE status = 'active') as active_sessions
      FROM game_sessions
    `);

    // Financial statistics
    const financeResult = await pool.query(`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as total_deposits,
        COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed' AND created_at >= CURRENT_DATE), 0) as today_deposits,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as total_withdrawals,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal' AND status = 'completed' AND created_at >= CURRENT_DATE), 0) as today_withdrawals,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal' AND status = 'pending'), 0) as pending_withdrawals
      FROM transactions
    `);

    // Game revenue
    const revenueResult = await pool.query(`
      SELECT 
        COALESCE(SUM(bet_amount - win_amount), 0) as total_revenue,
        COALESCE(SUM(bet_amount - win_amount) FILTER (WHERE started_at >= CURRENT_DATE), 0) as today_revenue
      FROM game_sessions
    `);

    const topGamesResult = await pool.query(`
      SELECT 
        game_id,
        provider,
        COUNT(*) as sessions,
        COALESCE(SUM(bet_amount - win_amount), 0) as revenue,
        COALESCE(SUM(bet_amount), 0) as total_bet,
        COALESCE(SUM(win_amount), 0) as total_win
      FROM game_sessions
      WHERE started_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY game_id, provider
      ORDER BY revenue DESC
      LIMIT 10
    `);

    const users = usersResult.rows[0];
    const games = gamesResult.rows[0];
    const finance = financeResult.rows[0];
    const revenue = revenueResult.rows[0];

    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(users.total),
          today: parseInt(users.today),
          active: parseInt(users.active)
        },
        games: {
          totalSessions: parseInt(games.total_sessions),
          todaySessions: parseInt(games.today_sessions),
          activeSessions: parseInt(games.active_sessions)
        },
        finance: {
          totalDeposits: parseFloat(finance.total_deposits),
          todayDeposits: parseFloat(finance.today_deposits),
          totalWithdrawals: parseFloat(finance.total_withdrawals),
          todayWithdrawals: parseFloat(finance.today_withdrawals),
          pendingWithdrawals: parseFloat(finance.pending_withdrawals),
          revenue: parseFloat(finance.total_deposits) - parseFloat(finance.total_withdrawals),
          totalGameRevenue: parseFloat(revenue.total_revenue),
          todayGameRevenue: parseFloat(revenue.today_revenue)
        },
        topGames: topGamesResult.rows.map(g => ({
          gameId: g.game_id,
          gameName: g.game_id,
          provider: g.provider,
          sessions: parseInt(g.sessions),
          revenue: parseFloat(g.revenue),
          totalBet: parseFloat(g.total_bet),
          totalWin: parseFloat(g.total_win)
        }))
      }
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard data' });
  }
});

// Get all users with pagination and filters
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, role, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM users';
    const conditions = [];
    const values = [];
    
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(username ILIKE $${values.length} OR email ILIKE $${values.length} OR odid ILIKE $${values.length})`);
    }
    
    if (status === 'active') {
      conditions.push('is_active = true');
    } else if (status === 'inactive') {
      conditions.push('is_active = false');
    }
    
    if (role === 'admin') {
      conditions.push('is_admin = true');
    } else if (role === 'user') {
      conditions.push('is_admin = false');
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Sort
    const validSortColumns = ['created_at', 'last_login', 'balance', 'vip_level', 'username'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDir}`;
    
    // Pagination (parameterized)
    values.push(parseInt(limit));
    query += ` LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;
    
    const result = await pool.query(query, values);
    
    // Count total
    let countQuery = 'SELECT COUNT(*) FROM users';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    // Count query needs only condition values, not LIMIT/OFFSET
    const countValues = values.slice(0, values.length - 2);
    const countResult = await pool.query(countQuery, countValues);
    
    const users = result.rows.map(u => ({
      id: u.id,
      odid: u.odid,
      username: u.username,
      email: u.email,
      balance: parseFloat(u.balance),
      bonusBalance: parseFloat(u.bonus_balance),
      vipLevel: u.vip_level,
      vipPoints: u.vip_points,
      isVerified: u.is_verified,
      isAdmin: u.is_admin,
      isActive: u.is_active,
      referralCode: u.referral_code,
      depositCount: u.deposit_count,
      lastLogin: u.last_login,
      createdAt: u.created_at
    }));
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

// Get user by ID or ODID
router.get('/users/:identifier', adminAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let result;
    if (identifier.startsWith('AUREX-')) {
      result = await pool.query('SELECT * FROM users WHERE odid = $1', [identifier]);
    } else {
      result = await pool.query('SELECT * FROM users WHERE id = $1', [identifier]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const u = result.rows[0];
    res.json({
      success: true,
      data: {
        id: u.id,
        odid: u.odid,
        username: u.username,
        email: u.email,
        balance: parseFloat(u.balance),
        bonusBalance: parseFloat(u.bonus_balance),
        vipLevel: u.vip_level,
        vipPoints: u.vip_points,
        isVerified: u.is_verified,
        isAdmin: u.is_admin,
        isActive: u.is_active,
        referralCode: u.referral_code,
        referredBy: u.referred_by,
        depositCount: u.deposit_count,
        lastLogin: u.last_login,
        createdAt: u.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

// Update user
router.put('/users/:identifier', adminAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { isActive, isAdmin, vipLevel, balance, bonusBalance, customReferralPercent } = req.body;
    
    let userId;
    if (identifier.startsWith('AUREX-')) {
      const result = await pool.query('SELECT id FROM users WHERE odid = $1', [identifier]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      userId = result.rows[0].id;
    } else {
      userId = identifier;
    }
    
    const updates = [];
    const values = [];
    
    if (isActive !== undefined) {
      values.push(isActive);
      updates.push(`is_active = $${values.length}`);
    }
    if (isAdmin !== undefined) {
      values.push(isAdmin);
      updates.push(`is_admin = $${values.length}`);
    }
    if (vipLevel !== undefined) {
      values.push(vipLevel);
      updates.push(`vip_level = $${values.length}`);
    }
    if (balance !== undefined) {
      values.push(balance);
      updates.push(`balance = $${values.length}`);
    }
    if (bonusBalance !== undefined) {
      values.push(bonusBalance);
      updates.push(`bonus_balance = $${values.length}`);
    }
    if (customReferralPercent !== undefined) {
      const pct = customReferralPercent === null ? null : parseFloat(customReferralPercent);
      values.push(pct);
      updates.push(`custom_referral_percent = $${values.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }
    
    values.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    
    res.json({ success: true, message: 'User updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Add/remove balance
router.post('/users/:identifier/balance', adminAuth, [
  body('amount').isFloat({ min: -1000000000, max: 1000000000 }),
  body('type').isIn(['add', 'subtract', 'set']),
  body('balanceType').optional().isIn(['balance', 'bonusBalance']),
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }
    
    const { identifier } = req.params;
    const { amount, type, balanceType = 'balance', reason } = req.body;
    
    let userId;
    if (identifier.startsWith('AUREX-')) {
      const result = await pool.query('SELECT id FROM users WHERE odid = $1', [identifier]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      userId = result.rows[0].id;
    } else {
      userId = identifier;
    }
    
    const column = balanceType === 'bonusBalance' ? 'bonus_balance' : 'balance';
    const { withTransaction } = require('../utils/dbTransaction');
    
    const data = await withTransaction(pool, async (client) => {
      // Lock row
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      
      let result;
      if (type === 'set') {
        result = await client.query(
          `UPDATE users SET ${column} = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
          [amount, userId]
        );
      } else if (type === 'add') {
        result = await client.query(
          `UPDATE users SET ${column} = ${column} + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
          [amount, userId]
        );
      } else {
        // subtract — проверяем что хватает средств
        const current = await client.query(`SELECT ${column} FROM users WHERE id = $1`, [userId]);
        if (parseFloat(current.rows[0][column]) < amount) {
          throw { status: 400, message: `Недостаточно средств. Текущий баланс: ${current.rows[0][column]}` };
        }
        result = await client.query(
          `UPDATE users SET ${column} = ${column} - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
          [amount, userId]
        );
      }
      
      const transactionType = type === 'add' ? 'admin_credit' : (type === 'subtract' ? 'admin_debit' : 'admin_set');
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, description)
         VALUES ($1, $2, $3, 'completed', $4)`,
        [userId, transactionType, type === 'subtract' ? -amount : amount, reason || 'Admin balance adjustment']
      );
      
      return {
        newBalance: parseFloat(result.rows[0][column]),
        balanceType, amount, type
      };
    });
    
    res.json({ success: true, message: 'Balance updated', data });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to update balance' });
  }
});

// Get transactions
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status, userId } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT t.*, u.username, u.odid, u.email
      FROM transactions t
      JOIN users u ON t.user_id = u.id
    `;
    const conditions = [];
    const values = [];
    
    if (type && type !== 'all') {
      values.push(type);
      conditions.push(`t.type = $${values.length}`);
    }
    
    if (status && status !== 'all') {
      values.push(status);
      conditions.push(`t.status = $${values.length}`);
    }
    
    if (userId) {
      values.push(userId);
      conditions.push(`t.user_id = $${values.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    values.push(parseInt(limit));
    query += ` ORDER BY t.created_at DESC LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows.map(t => ({
        id: t.id,
        odid: t.odid,
        username: t.username,
        email: t.email,
        type: t.type,
        amount: parseFloat(t.amount),
        currency: t.currency,
        status: t.status,
        paymentMethod: t.payment_method,
        description: t.description,
        createdAt: t.created_at
      }))
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
});

// Approve/reject transaction
router.post('/transactions/:id/:action', adminAuth, async (req, res) => {
  try {
    const { id, action } = req.params;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    const newStatus = action === 'approve' ? 'completed' : 'failed';
    const { withTransaction } = require('../utils/dbTransaction');
    
    const transaction = await withTransaction(pool, async (client) => {
      const result = await client.query(
        'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [newStatus, id]
      );
      
      if (result.rows.length === 0) {
        throw { status: 404, message: 'Transaction not found' };
      }
      
      const tx = result.rows[0];
      
      if (tx.type === 'withdrawal') {
        // Lock user row
        await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [tx.user_id]);
        
        if (action === 'approve') {
          // Деньги уже списаны при создании заявки — ничего не делаем
        } else {
          // Rejected — возвращаем деньги
          await client.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [Math.abs(parseFloat(tx.amount)), tx.user_id]
          );
        }
      }
      
      return tx;
    });
    
    res.json({ success: true, message: `Transaction ${action}d`, data: transaction });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    console.error('Transaction action error:', error);
    res.status(500).json({ success: false, error: 'Failed to process transaction' });
  }
});

// Get game sessions
router.get('/games/sessions', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT gs.*, u.username, u.odid
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
    `;
    const values = [];
    
    if (status && status !== 'all') {
      values.push(status);
      query += ' WHERE gs.status = $1';
    }
    
    values.push(parseInt(limit));
    query += ` ORDER BY gs.started_at DESC LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;
    
    const result = await pool.query(query, values);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get game sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get game sessions' });
  }
});

// Settings
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings = {};
    for (const row of result.rows) {
      try {
        settings[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      } catch {
        settings[row.key] = row.value;
      }
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

router.get('/settings/:key', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings WHERE key = $1', [req.params.key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Setting not found' });
    }
    
    res.json({ success: true, data: result.rows[0].value });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ success: false, error: 'Failed to get setting' });
  }
});

router.put('/settings/:key', adminAuth, async (req, res) => {
  try {
    const { value } = req.body;
    
    const result = await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.params.key, JSON.stringify(value)]
    );
    
    res.json({ success: true, message: 'Setting updated', data: result.rows[0] });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

// Сбросить все настройки (удалить из БД - вернутся дефолтные)
router.post('/settings/reset', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM site_config');
    res.json({ success: true, message: 'Настройки сброшены до значений по умолчанию' });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset settings' });
  }
});

// =========================================================================
// Freerounds Management
// =========================================================================

const fundistApi = require('../services/fundistApiService');

// Issue freerounds to a user
router.post('/freerounds', adminAuth, [
  body('userId').isInt({ min: 1 }),
  body('gameCode').isString().notEmpty(),
  body('operator').isString().notEmpty(),
  body('count').isInt({ min: 1, max: 1000 }),
  body('betLevel').optional().isInt({ min: 1 }),
  body('expireDays').optional().isInt({ min: 1, max: 365 }),
  body('wagerMultiplier').optional().isFloat({ min: 0, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
    }

    const { userId, gameCode, operator, count, betLevel, expireDays = 7, wagerMultiplier = 0 } = req.body;

    // Get user info
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const user = userResult.rows[0];
    const currency = user.currency || 'RUB';

    // Ensure user exists in Fundist before issuing freerounds
    const fundistLogin = await fundistApi.ensureFundistUser(user.id, currency, { language: 'ru' });

    // Calculate expire date
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + expireDays);
    const expire = expireDate.toISOString().replace('T', ' ').split('.')[0];

    console.log(`[freerounds] Issuing ${count} freerounds to ${fundistLogin} on ${gameCode} (${operator}), betLevel=${betLevel || 1}, wager=x${wagerMultiplier}, expire=${expire}`);

    const result = await fundistApi.addFreerounds(
      operator,
      fundistLogin,
      gameCode,
      count,
      expire,
      { betLevel: betLevel || undefined }
    );

    // Save to freerounds_bonuses table (for wager tracking)
    try {
      await pool.query(
        `INSERT INTO freerounds_bonuses 
         (user_id, fundist_tid, operator, game_code, count, bet_level, wager_multiplier, status, expire_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)`,
        [userId, result.tid, operator, gameCode, count, betLevel || 1, wagerMultiplier, expireDate]
      );
    } catch (dbErr) {
      console.log('[freerounds] Failed to save bonus record:', dbErr.message);
    }

    // Log transaction
    try {
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description, metadata)
         VALUES ($1, 'freerounds', 0, $2, 'completed', $3, $4)`,
        [
          userId,
          currency,
          `${count} фриспинов на ${gameCode}${wagerMultiplier > 0 ? ` (вейджер x${wagerMultiplier})` : ''}`,
          JSON.stringify({ operator, gameCode, count, betLevel, wagerMultiplier, expire, tid: result.tid })
        ]
      );
    } catch (dbErr) {
      console.log('[freerounds] Failed to log transaction:', dbErr.message);
    }

    res.json({
      success: true,
      message: `${count} фриспинов выдано пользователю ${user.username}${wagerMultiplier > 0 ? ` (вейджер x${wagerMultiplier})` : ''}`,
      data: { tid: result.tid, login: fundistLogin, expire, wagerMultiplier }
    });
  } catch (error) {
    console.error('[freerounds] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's freerounds
router.get('/freerounds/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const user = userResult.rows[0];
    const currency = user.currency || 'RUB';
    const fundistLogin = `aurex_${user.id}_${currency}`;

    const data = await fundistApi.getUserFreerounds(fundistLogin);

    res.json({ success: true, data, login: fundistLogin });
  } catch (error) {
    console.error('[freerounds] Get user freerounds error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
