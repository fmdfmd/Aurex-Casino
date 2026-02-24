const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Referral tiers: commission % from referral's GGR
const REFERRAL_TIERS = [
  { level: 1, name: 'Новичок', requiredReferrals: 0, commissionPercent: 10, bonus: 0 },
  { level: 2, name: 'Партнёр', requiredReferrals: 5, commissionPercent: 12, bonus: 1000 },
  { level: 3, name: 'Эксперт', requiredReferrals: 15, commissionPercent: 15, bonus: 5000 },
  { level: 4, name: 'Мастер', requiredReferrals: 30, commissionPercent: 18, bonus: 15000 },
  { level: 5, name: 'Легенда', requiredReferrals: 50, commissionPercent: 20, bonus: 50000 },
];

function getReferralTier(totalReferrals) {
  let tier = REFERRAL_TIERS[0];
  for (const t of REFERRAL_TIERS) {
    if (totalReferrals >= t.requiredReferrals) tier = t;
  }
  return tier;
}

// Получить реферальную статистику пользователя
router.get('/stats', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT referral_code, referral_earnings, custom_referral_percent FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    const refResult = await pool.query(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE deposit_count > 0) as active_referrals
      FROM users
      WHERE referred_by = $1
    `, [req.user.id]);
    
    const refStats = refResult.rows[0];
    const totalReferrals = parseInt(refStats.total_referrals);
    const tier = getReferralTier(totalReferrals);
    const effectivePercent = user.custom_referral_percent != null ? parseFloat(user.custom_referral_percent) : tier.commissionPercent;
    
    // GGR рефералов за текущий месяц
    const ggrResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as total_wins
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE u.referred_by = $1 
        AND t.created_at >= date_trunc('month', CURRENT_DATE)
    `, [req.user.id]);
    
    const monthBets = parseFloat(ggrResult.rows[0].total_bets) || 0;
    const monthWins = parseFloat(ggrResult.rows[0].total_wins) || 0;
    const monthGGR = Math.max(0, monthBets - monthWins);
    const monthPotentialEarnings = monthGGR * (effectivePercent / 100);

    // Заработок за текущий месяц (уже начисленный)
    const monthResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as month_earnings
      FROM transactions
      WHERE user_id = $1 AND type = 'referral_commission'
        AND created_at >= date_trunc('month', CURRENT_DATE)
    `, [req.user.id]);

    const totalEarnings = parseFloat(user.referral_earnings) || 0;
    const thisMonthEarnings = parseFloat(monthResult.rows[0].month_earnings) || 0;

    res.json({
      success: true,
      data: {
        referralCode: user.referral_code,
        referralLink: `https://aurex.casino/register?ref=${user.referral_code}`,
        totalReferrals,
        activeReferrals: parseInt(refStats.active_referrals),
        totalEarnings,
        pendingEarnings: totalEarnings,
        availableWithdraw: totalEarnings,
        thisMonthEarnings,
        commissionPercent: effectivePercent,
        isCustomPercent: user.custom_referral_percent != null,
        commissionModel: 'GGR',
        currentTier: tier,
        monthGGR,
        monthPotentialEarnings,
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
    
    // Get referral count + custom percent
    const meResult = await pool.query(
      'SELECT custom_referral_percent, (SELECT COUNT(*) FROM users WHERE referred_by = $1) as ref_count FROM users WHERE id = $1',
      [req.user.id]
    );
    const totalRefs = parseInt(meResult.rows[0].ref_count);
    const tier = getReferralTier(totalRefs);
    const effectivePercent = meResult.rows[0].custom_referral_percent != null
      ? parseFloat(meResult.rows[0].custom_referral_percent)
      : tier.commissionPercent;
    
    const result = await pool.query(`
      SELECT u.id, u.username, u.created_at, u.deposit_count,
        COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as total_wins
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id
      WHERE u.referred_by = $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), offset]);
    
    const referrals = result.rows.map(r => {
      const ggr = Math.max(0, parseFloat(r.total_bets) - parseFloat(r.total_wins));
      return {
        id: r.id,
        username: r.username.substring(0, 2) + '***' + r.username.slice(-1),
        registeredAt: r.created_at,
        depositCount: r.deposit_count,
        ggr,
        earned: ggr * (effectivePercent / 100),
        status: r.deposit_count > 0 ? 'active' : 'inactive',
      };
    });
    
    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalRefs
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
    
    const prelimEarnings = parseFloat(userResult.rows[0]?.referral_earnings) || 0;
    
    if (prelimEarnings < 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Минимальная сумма для вывода: ₽100' 
      });
    }
    
    const { withTransaction } = require('../utils/dbTransaction');
    let claimedAmount = 0;
    await withTransaction(pool, async (client) => {
      const locked = await client.query(
        'SELECT referral_earnings FROM users WHERE id = $1 FOR UPDATE',
        [req.user.id]
      );
      claimedAmount = parseFloat(locked.rows[0]?.referral_earnings) || 0;
      if (claimedAmount < 100) return;
      
      await client.query(
        'UPDATE users SET balance = balance + $1, referral_earnings = 0 WHERE id = $2',
        [claimedAmount, req.user.id]
      );
      
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, description)
         VALUES ($1, 'referral_bonus', $2, 'completed', 'Реферальное вознаграждение')`,
        [req.user.id, claimedAmount]
      );
    });
    
    if (claimedAmount < 100) {
      return res.status(400).json({ success: false, message: 'Минимальная сумма для вывода: ₽100' });
    }
    const earnings = claimedAmount;
    
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

// Еженедельная обработка GGR-комиссий (вызывается по расписанию или вручную)
const { adminAuth } = require('../middleware/auth');

router.post('/process-weekly-ggr', adminAuth, async (req, res) => {
  try {
    const result = await processWeeklyReferralGGR(pool);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Process weekly referral GGR error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

async function processWeeklyReferralGGR(dbPool) {
  const lastWeekStart = new Date();
  lastWeekStart.setHours(0, 0, 0, 0);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);

  // All referrers who have referrals with GGR > 0 last week
  const referrersResult = await dbPool.query(`
    SELECT 
      u_ref.referred_by as referrer_id,
      (SELECT COUNT(*) FROM users WHERE referred_by = u_ref.referred_by) as total_referrals,
      (SELECT custom_referral_percent FROM users WHERE id::text = u_ref.referred_by) as custom_percent,
      COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) as total_bets,
      COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as total_wins
    FROM users u_ref
    JOIN transactions t ON t.user_id = u_ref.id
      AND t.created_at >= $1 AND t.created_at < $2
    WHERE u_ref.referred_by IS NOT NULL
    GROUP BY u_ref.referred_by
    HAVING COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) > 
           COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0)
  `, [lastWeekStart, lastWeekEnd]);

  let processed = 0;
  let totalCommission = 0;

  const { withTransaction } = require('../utils/dbTransaction');

  for (const row of referrersResult.rows) {
    const ggr = parseFloat(row.total_bets) - parseFloat(row.total_wins);
    if (ggr <= 0) continue;

    const tier = getReferralTier(parseInt(row.total_referrals));
    const percent = row.custom_percent != null ? parseFloat(row.custom_percent) : tier.commissionPercent;
    const commission = ggr * (percent / 100);
    
    if (commission < 10) continue; // min 10 RUB

    const referrerId = parseInt(row.referrer_id);
    if (isNaN(referrerId)) continue;

    await withTransaction(dbPool, async (client) => {
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [referrerId]);
      await client.query(
        'UPDATE users SET referral_earnings = referral_earnings + $1 WHERE id = $2',
        [commission, referrerId]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, description)
         VALUES ($1, 'referral_commission', $2, 'completed', $3)`,
        [referrerId, commission, `GGR комиссия за неделю ${lastWeekStart.toISOString().slice(0,10)}`]
      );
    });

    processed++;
    totalCommission += commission;
  }

  return { processed, totalCommission, period: `${lastWeekStart.toISOString()} - ${lastWeekEnd.toISOString()}` };
}

module.exports = router;
module.exports.processWeeklyReferralGGR = processWeeklyReferralGGR;
