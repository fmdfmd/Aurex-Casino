const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Получить реферальную статистику пользователя
router.get('/stats', auth, async (req, res) => {
  try {
    // Получаем данные пользователя
    const userResult = await pool.query(
      'SELECT referral_code, referral_earnings FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    // Считаем рефералов
    const refResult = await pool.query(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE deposit_count > 0) as active_referrals
      FROM users
      WHERE referred_by = $1
    `, [req.user.id]);
    
    const refStats = refResult.rows[0];
    
    res.json({
      success: true,
      data: {
        referralCode: user.referral_code,
        referralLink: `https://aurex.casino/register?ref=${user.referral_code}`,
        totalReferrals: parseInt(refStats.total_referrals),
        activeReferrals: parseInt(refStats.active_referrals),
        totalEarnings: parseFloat(user.referral_earnings) || 0,
        commissionPercent: 10 // 10% от депозитов рефералов
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить список рефералов
router.get('/list', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(`
      SELECT id, username, created_at, deposit_count, 
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = users.id AND type = 'deposit' AND status = 'completed') as total_deposits
      FROM users
      WHERE referred_by = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), offset]);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE referred_by = $1',
      [req.user.id]
    );
    
    const referrals = result.rows.map(r => ({
      id: r.id,
      username: r.username.substring(0, 2) + '***' + r.username.slice(-1), // Маскируем имя
      registeredAt: r.created_at,
      depositCount: r.deposit_count,
      totalDeposits: parseFloat(r.total_deposits),
      earned: parseFloat(r.total_deposits) * 0.1 // 10% комиссия
    }));
    
    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get referral list error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Забрать реферальные вознаграждения
router.post('/claim', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT referral_earnings FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    const earnings = parseFloat(userResult.rows[0]?.referral_earnings) || 0;
    
    if (earnings < 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Минимальная сумма для вывода: ₽100' 
      });
    }
    
    // Переносим на основной баланс
    await pool.query(
      'UPDATE users SET balance = balance + $1, referral_earnings = 0 WHERE id = $2',
      [earnings, req.user.id]
    );
    
    // Логируем транзакцию
    await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status, description)
       VALUES ($1, 'referral_bonus', $2, 'completed', 'Реферальное вознаграждение')`,
      [req.user.id, earnings]
    );
    
    res.json({
      success: true,
      message: `₽${earnings.toFixed(2)} переведено на ваш баланс`,
      data: { claimedAmount: earnings }
    });
  } catch (error) {
    console.error('Claim referral earnings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Начислить реферальный бонус (вызывается при депозите реферала)
router.post('/credit', auth, async (req, res) => {
  try {
    const { referrerId, depositAmount } = req.body;
    
    if (!referrerId || !depositAmount) {
      return res.status(400).json({ success: false, message: 'Неверные данные' });
    }
    
    const commission = depositAmount * 0.1; // 10%
    
    await pool.query(
      'UPDATE users SET referral_earnings = referral_earnings + $1 WHERE id = $2',
      [commission, referrerId]
    );
    
    res.json({ success: true, data: { credited: commission } });
  } catch (error) {
    console.error('Credit referral error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
