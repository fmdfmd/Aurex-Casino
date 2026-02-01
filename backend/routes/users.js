const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Получить профиль пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
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
        referralCode: u.referral_code,
        avatar: u.avatar,
        createdAt: u.created_at,
        lastLogin: u.last_login
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обновить профиль
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, email, avatar } = req.body;
    
    const updates = [];
    const values = [];
    
    if (username) {
      // Проверяем уникальность
      const existing = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Имя пользователя занято' });
      }
      values.push(username);
      updates.push(`username = $${values.length}`);
    }
    
    if (email) {
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Email уже используется' });
      }
      values.push(email);
      updates.push(`email = $${values.length}`);
    }
    
    if (avatar) {
      values.push(avatar);
      updates.push(`avatar = $${values.length}`);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
    }
    
    values.push(req.user.id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    
    res.json({ success: true, message: 'Профиль обновлён', data: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить баланс
router.get('/balance', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT balance, bonus_balance FROM users WHERE id = $1',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: {
        balance: parseFloat(result.rows[0].balance),
        bonusBalance: parseFloat(result.rows[0].bonus_balance),
        total: parseFloat(result.rows[0].balance) + parseFloat(result.rows[0].bonus_balance)
      }
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить VIP статус
router.get('/vip', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT vip_level, vip_points FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const user = result.rows[0];
    
    const vipLevels = [
      { level: 1, name: 'Bronze', pointsRequired: 0, cashbackPercent: 5 },
      { level: 2, name: 'Silver', pointsRequired: 1000, cashbackPercent: 7 },
      { level: 3, name: 'Gold', pointsRequired: 5000, cashbackPercent: 10 },
      { level: 4, name: 'Platinum', pointsRequired: 20000, cashbackPercent: 12 },
      { level: 5, name: 'Emperor', pointsRequired: 100000, cashbackPercent: 15 }
    ];
    
    const currentLevel = vipLevels.find(l => l.level === user.vip_level) || vipLevels[0];
    const nextLevel = vipLevels.find(l => l.level === user.vip_level + 1);
    
    res.json({
      success: true,
      data: {
        level: user.vip_level,
        levelName: currentLevel.name,
        points: user.vip_points,
        cashbackPercent: currentLevel.cashbackPercent,
        nextLevel: nextLevel ? {
          level: nextLevel.level,
          name: nextLevel.name,
          pointsRequired: nextLevel.pointsRequired,
          pointsNeeded: nextLevel.pointsRequired - user.vip_points
        } : null
      }
    });
  } catch (error) {
    console.error('Get VIP status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить статистику пользователя
router.get('/stats', auth, async (req, res) => {
  try {
    // Статистика транзакций
    const txResult = await pool.query(`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE type = 'deposit' AND status = 'completed'), 0) as total_deposits,
        COUNT(*) FILTER (WHERE type = 'deposit' AND status = 'completed') as deposit_count,
        COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'withdrawal' AND status = 'completed'), 0) as total_withdrawals
      FROM transactions
      WHERE user_id = $1
    `, [req.user.id]);
    
    // Статистика игр
    const gameResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(bet_amount), 0) as total_wagered,
        COALESCE(SUM(win_amount), 0) as total_won,
        COALESCE(MAX(win_amount), 0) as biggest_win
      FROM game_sessions
      WHERE user_id = $1
    `, [req.user.id]);
    
    const tx = txResult.rows[0];
    const game = gameResult.rows[0];
    
    res.json({
      success: true,
      data: {
        finance: {
          totalDeposits: parseFloat(tx.total_deposits),
          depositCount: parseInt(tx.deposit_count),
          totalWithdrawals: parseFloat(tx.total_withdrawals),
          netDeposits: parseFloat(tx.total_deposits) - parseFloat(tx.total_withdrawals)
        },
        gaming: {
          totalSessions: parseInt(game.total_sessions),
          totalWagered: parseFloat(game.total_wagered),
          totalWon: parseFloat(game.total_won),
          biggestWin: parseFloat(game.biggest_win),
          netResult: parseFloat(game.total_won) - parseFloat(game.total_wagered)
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить историю транзакций
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
    
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    
    const result = await pool.query(query, values);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить рефералов
router.get('/referrals', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, created_at, deposit_count
      FROM users
      WHERE referred_by = $1
      ORDER BY created_at DESC
    `, [req.user.id]);
    
    const referrals = result.rows.map(r => ({
      id: r.id,
      username: r.username.substring(0, 2) + '***',
      registeredAt: r.created_at,
      isActive: r.deposit_count > 0
    }));
    
    res.json({ success: true, data: referrals });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить активные бонусы пользователя
router.get('/bonuses', auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM bonuses WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC",
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: result.rows.map(b => ({
        id: b.id,
        type: b.bonus_type,
        amount: parseFloat(b.amount),
        wageringRequired: parseFloat(b.wagering_requirement),
        wageringCompleted: parseFloat(b.wagering_completed),
        progress: b.wagering_requirement > 0 
          ? Math.min(100, (parseFloat(b.wagering_completed) / parseFloat(b.wagering_requirement)) * 100)
          : 100,
        expiresAt: b.expires_at
      }))
    });
  } catch (error) {
    console.error('Get user bonuses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
