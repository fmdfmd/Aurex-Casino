const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const { getCashbackPercent } = require('../config/vipLevels');

// Получить VIP конфиг кэшбэка (централизованно)
async function getVipCashbackPercent(vipLevel) {
  return getCashbackPercent(vipLevel);
}

// Получить доступный кэшбэк
router.get('/available', auth, async (req, res) => {
  try {
    // Получаем VIP уровень пользователя
    const userResult = await pool.query(
      'SELECT vip_level FROM users WHERE id = $1',
      [req.user.id]
    );
    const vipLevel = userResult.rows[0]?.vip_level || 1;
    const cashbackPercent = await getVipCashbackPercent(vipLevel);
    
    // Получаем незаклейменный кэшбэк
    const result = await pool.query(
      `SELECT * FROM cashback_records 
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    const totalAvailable = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    
    res.json({ 
      success: true, 
      data: {
        available: totalAvailable,
        percent: cashbackPercent,
        vipLevel,
        records: result.rows.map(r => ({
          id: r.id,
          amount: parseFloat(r.amount),
          period: r.period,
          createdAt: r.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Get available cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Забрать кэшбэк
router.post('/claim', auth, async (req, res) => {
  try {
    // Получаем все pending кэшбэки
    const result = await pool.query(
      `SELECT * FROM cashback_records 
       WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Нет доступного кэшбэка' });
    }
    
    const totalAmount = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalWager = result.rows.reduce((sum, r) => sum + parseFloat(r.wager_required || 0), 0);
    
    // Обновляем статус
    await pool.query(
      `UPDATE cashback_records 
       SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );
    
    // Добавляем на бонусный баланс
    await pool.query(
      'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
      [totalAmount, req.user.id]
    );
    
    // Создаём бонус с вейджером если нужно
    if (totalWager > 0) {
      await pool.query(
        `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
         VALUES ($1, 'cashback', $2, $3, 0, 'active', NOW() + INTERVAL '7 days')`,
        [req.user.id, totalAmount, totalWager]
      );
    }
    
    res.json({ 
      success: true, 
      message: `Кэшбэк ₽${totalAmount.toFixed(2)} получен!`,
      data: {
        amount: totalAmount,
        wagerRequired: totalWager
      }
    });
  } catch (error) {
    console.error('Claim cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить историю кэшбэка
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(
      `SELECT * FROM cashback_records 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get cashback history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ WEEKLY CASHBACK SYSTEM ============

// Получить еженедельную статистику для кэшбэка
router.get('/weekly-stats', auth, async (req, res) => {
  try {
    // Получаем VIP уровень
    const userResult = await pool.query(
      'SELECT vip_level FROM users WHERE id = $1',
      [req.user.id]
    );
    const vipLevel = userResult.rows[0]?.vip_level || 1;
    const cashbackPercent = await getVipCashbackPercent(vipLevel);
    
    // Начало текущей недели (понедельник)
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
    
    // Считаем проигрыши за неделю (сумма ставок - сумма выигрышей)
    const lossResult = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END), 0) as total_wins
       FROM transactions 
       WHERE user_id = $1 AND created_at >= $2`,
      [req.user.id, weekStart]
    );
    
    const totalBets = parseFloat(lossResult.rows[0]?.total_bets || 0);
    const totalWins = parseFloat(lossResult.rows[0]?.total_wins || 0);
    const netLoss = Math.max(0, totalBets - totalWins);
    
    const potentialCashback = netLoss * (cashbackPercent / 100);
    const wagerRequired = potentialCashback * 5; // x5 вейджер
    
    // Когда можно забрать кэшбэк (следующий понедельник)
    const nextMonday = new Date(weekStart);
    nextMonday.setDate(nextMonday.getDate() + 7);
    
    res.json({
      success: true,
      data: {
        weekStart,
        nextCashbackDate: nextMonday,
        totalBets,
        totalWins,
        netLoss,
        cashbackPercent,
        potentialCashback,
        wagerRequired,
        vipLevel
      }
    });
  } catch (error) {
    console.error('Weekly stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Начислить еженедельный кэшбэк (вызывается по расписанию или вручную админом)
router.post('/process-weekly', adminAuth, async (req, res) => {
  try {
    // Начало прошлой недели
    const lastWeekStart = new Date();
    lastWeekStart.setHours(0, 0, 0, 0);
    lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 6); // Previous Monday
    
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);
    
    // Получаем всех пользователей с проигрышами за прошлую неделю
    const usersResult = await pool.query(`
      SELECT 
        u.id, u.vip_level,
        COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as total_wins
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id 
        AND t.created_at >= $1 AND t.created_at < $2
      GROUP BY u.id
      HAVING COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) > 
             COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0)
    `, [lastWeekStart, lastWeekEnd]);
    
    let processed = 0;
    let totalCashback = 0;
    
    for (const user of usersResult.rows) {
      const netLoss = parseFloat(user.total_bets) - parseFloat(user.total_wins);
      const cashbackPercent = await getVipCashbackPercent(user.vip_level || 1);
      const cashbackAmount = netLoss * (cashbackPercent / 100);
      const wagerRequired = cashbackAmount * 5;
      
      if (cashbackAmount >= 10) { // Минимум 10₽
        await pool.query(
          `INSERT INTO cashback_records (user_id, amount, period, wager_required, status)
           VALUES ($1, $2, 'weekly', $3, 'pending')`,
          [user.id, cashbackAmount, wagerRequired]
        );
        processed++;
        totalCashback += cashbackAmount;
      }
    }
    
    res.json({
      success: true,
      message: `Еженедельный кэшбэк начислен`,
      data: {
        usersProcessed: processed,
        totalCashbackAmount: totalCashback,
        period: `${lastWeekStart.toISOString()} - ${lastWeekEnd.toISOString()}`
      }
    });
  } catch (error) {
    console.error('Process weekly cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ LEGACY SYSTEM ROUTE ============

// Начислить кэшбэк (для совместимости)
router.post('/accrue', auth, async (req, res) => {
  try {
    const { lossAmount, period = 'weekly' } = req.body;
    
    if (!lossAmount || lossAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    }
    
    // Получаем VIP уровень
    const userResult = await pool.query(
      'SELECT vip_level FROM users WHERE id = $1',
      [req.user.id]
    );
    const vipLevel = userResult.rows[0]?.vip_level || 1;
    const cashbackPercent = await getVipCashbackPercent(vipLevel);
    
    const cashbackAmount = lossAmount * (cashbackPercent / 100);
    const wagerRequired = cashbackAmount * 5; // x5 вейджер на кэшбэк
    
    await pool.query(
      `INSERT INTO cashback_records (user_id, amount, period, wager_required, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [req.user.id, cashbackAmount, period, wagerRequired]
    );
    
    res.json({ 
      success: true, 
      data: {
        cashbackAmount,
        percent: cashbackPercent
      }
    });
  } catch (error) {
    console.error('Accrue cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все записи кэшбэка (для админки)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT cr.*, u.username, u.email 
      FROM cashback_records cr
      LEFT JOIN users u ON cr.user_id = u.id
    `;
    const params = [];
    
    if (status) {
      query += ` WHERE cr.status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY cr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      data: { 
        cashbacks: result.rows 
      } 
    });
  } catch (error) {
    console.error('Get all cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обработать еженедельный кэшбэк (алиас для process-weekly)
router.post('/admin/process', adminAuth, async (req, res) => {
  // Перенаправляем на process-weekly
  try {
    const lastWeekStart = new Date();
    lastWeekStart.setHours(0, 0, 0, 0);
    lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 6);
    
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);
    
    const usersResult = await pool.query(`
      SELECT 
        u.id, u.vip_level,
        COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0) as total_wins
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id 
        AND t.created_at >= $1 AND t.created_at < $2
      GROUP BY u.id
      HAVING COALESCE(SUM(CASE WHEN t.type = 'bet' THEN t.amount ELSE 0 END), 0) > 
             COALESCE(SUM(CASE WHEN t.type = 'win' THEN t.amount ELSE 0 END), 0)
    `, [lastWeekStart, lastWeekEnd]);
    
    let processed = 0;
    let totalCashback = 0;
    
    for (const user of usersResult.rows) {
      const netLoss = parseFloat(user.total_bets) - parseFloat(user.total_wins);
      const cashbackPercent = await getVipCashbackPercent(user.vip_level || 1);
      const cashbackAmount = netLoss * (cashbackPercent / 100);
      const wagerRequired = cashbackAmount * 5;
      
      if (cashbackAmount >= 10) {
        await pool.query(
          `INSERT INTO cashback_records (user_id, amount, period, wager_required, status)
           VALUES ($1, $2, 'weekly', $3, 'pending')`,
          [user.id, cashbackAmount, wagerRequired]
        );
        processed++;
        totalCashback += cashbackAmount;
      }
    }
    
    res.json({
      success: true,
      message: `Еженедельный кэшбэк начислен`,
      data: {
        usersProcessed: processed,
        totalCashbackAmount: totalCashback
      }
    });
  } catch (error) {
    console.error('Process cashback error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика кэшбэка
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'claimed'), 0) as claimed_amount
      FROM cashback_records
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Cashback stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
