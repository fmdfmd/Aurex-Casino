const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// VIP уровни и их названия
const VIP_LEVELS = {
  1: { name: 'Bronze', pointsRequired: 0, cashbackPercent: 5 },
  2: { name: 'Silver', pointsRequired: 5000, cashbackPercent: 7 },
  3: { name: 'Gold', pointsRequired: 25000, cashbackPercent: 10 },
  4: { name: 'Platinum', pointsRequired: 100000, cashbackPercent: 12 },
  5: { name: 'Emperor', pointsRequired: 500000, cashbackPercent: 15 }
};

// Магазин бонусов (что можно купить за очки)
const LOYALTY_SHOP = [
  {
    id: 'freespins_10',
    name: '10 Фриспинов',
    description: '10 бесплатных вращений в любом слоте',
    pointsCost: 500,
    type: 'freespins',
    value: 10,
    icon: '🎰'
  },
  {
    id: 'freespins_50',
    name: '50 Фриспинов',
    description: '50 бесплатных вращений в любом слоте',
    pointsCost: 2000,
    type: 'freespins',
    value: 50,
    icon: '🎰'
  },
  {
    id: 'bonus_500',
    name: 'Бонус 500₽',
    description: 'Бонусные деньги (вейджер x10)',
    pointsCost: 1000,
    type: 'bonus',
    value: 500,
    wager: 10,
    icon: '💰'
  },
  {
    id: 'bonus_2000',
    name: 'Бонус 2000₽',
    description: 'Бонусные деньги (вейджер x8)',
    pointsCost: 3500,
    type: 'bonus',
    value: 2000,
    wager: 8,
    icon: '💰'
  },
  {
    id: 'bonus_5000',
    name: 'Бонус 5000₽',
    description: 'Бонусные деньги (вейджер x5)',
    pointsCost: 7500,
    type: 'bonus',
    value: 5000,
    wager: 5,
    icon: '💎'
  },
  {
    id: 'cashback_boost',
    name: 'Кэшбэк +5%',
    description: 'Увеличение кэшбэка на неделю',
    pointsCost: 5000,
    type: 'boost',
    value: 5,
    duration: '7 days',
    icon: '🚀'
  },
  {
    id: 'wager_reduction',
    name: 'Снижение вейджера',
    description: '-5x к требованию отыгрыша на неделю',
    pointsCost: 10000,
    type: 'wager_reduction',
    value: 5,
    duration: '7 days',
    icon: '⚡'
  },
  {
    id: 'vip_points_x2',
    name: 'Очки x2',
    description: 'Удвоенные VIP очки на неделю',
    pointsCost: 8000,
    type: 'multiplier',
    value: 2,
    duration: '7 days',
    icon: '✨'
  }
];

// Получить статус лояльности пользователя
router.get('/status', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT vip_points, vip_level, total_wagered FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    const currentLevel = VIP_LEVELS[user.vip_level] || VIP_LEVELS[1];
    const nextLevel = VIP_LEVELS[user.vip_level + 1];
    
    const progress = nextLevel 
      ? Math.min(100, ((user.vip_points - currentLevel.pointsRequired) / (nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100)
      : 100;
    
    res.json({
      success: true,
      data: {
        points: user.vip_points || 0,
        level: user.vip_level || 1,
        levelName: currentLevel.name,
        cashbackPercent: currentLevel.cashbackPercent,
        totalWagered: parseFloat(user.total_wagered || 0),
        nextLevel: nextLevel ? {
          name: nextLevel.name,
          pointsRequired: nextLevel.pointsRequired,
          pointsNeeded: nextLevel.pointsRequired - (user.vip_points || 0),
          cashbackPercent: nextLevel.cashbackPercent
        } : null,
        progress,
        allLevels: Object.entries(VIP_LEVELS).map(([level, data]) => ({
          level: parseInt(level),
          ...data,
          current: parseInt(level) === user.vip_level
        }))
      }
    });
  } catch (error) {
    console.error('Get loyalty status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить магазин бонусов
router.get('/shop', auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT vip_points, vip_level FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const userPoints = userResult.rows[0]?.vip_points || 0;
    const userLevel = userResult.rows[0]?.vip_level || 1;
    
    // Добавляем информацию о доступности для пользователя
    const shopItems = LOYALTY_SHOP.map(item => ({
      ...item,
      canAfford: userPoints >= item.pointsCost,
      userPoints
    }));
    
    res.json({
      success: true,
      data: {
        items: shopItems,
        userPoints,
        userLevel
      }
    });
  } catch (error) {
    console.error('Get loyalty shop error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Купить товар в магазине
router.post('/purchase', auth, async (req, res) => {
  try {
    const { itemId } = req.body;
    
    const item = LOYALTY_SHOP.find(i => i.id === itemId);
    if (!item) {
      return res.status(400).json({ success: false, message: 'Товар не найден' });
    }
    
    // Проверяем баланс очков
    const userResult = await pool.query(
      'SELECT vip_points FROM users WHERE id = $1',
      [req.user.id]
    );
    
    const userPoints = userResult.rows[0]?.vip_points || 0;
    
    if (userPoints < item.pointsCost) {
      return res.status(400).json({ 
        success: false, 
        message: `Недостаточно очков. Нужно: ${item.pointsCost}, у вас: ${userPoints}` 
      });
    }
    
    // Списываем очки
    await pool.query(
      'UPDATE users SET vip_points = vip_points - $1 WHERE id = $2',
      [item.pointsCost, req.user.id]
    );
    
    // Записываем покупку
    await pool.query(
      `INSERT INTO loyalty_purchases (user_id, item_id, item_name, points_spent, item_type, item_value)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, item.id, item.name, item.pointsCost, item.type, item.value]
    );
    
    // Выдаём награду в зависимости от типа
    let rewardMessage = '';
    
    switch (item.type) {
      case 'freespins':
        // Добавляем фриспины пользователю
        await pool.query(
          'UPDATE users SET freespins = COALESCE(freespins, 0) + $1 WHERE id = $2',
          [item.value, req.user.id]
        );
        rewardMessage = `${item.value} фриспинов добавлены на ваш счёт!`;
        break;
        
      case 'bonus':
        // Создаём бонус с вейджером
        const wagerRequired = item.value * (item.wager || 10);
        await pool.query(
          `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
           VALUES ($1, 'loyalty_shop', $2, $3, 0, 'active', NOW() + INTERVAL '7 days')`,
          [req.user.id, item.value, wagerRequired]
        );
        await pool.query(
          'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
          [item.value, req.user.id]
        );
        rewardMessage = `${item.value}₽ добавлены на бонусный баланс! Вейджер: x${item.wager}`;
        break;
        
      case 'boost':
      case 'wager_reduction':
      case 'multiplier':
        // Создаём активный буст
        await pool.query(
          `INSERT INTO user_boosts (user_id, boost_type, boost_value, expires_at)
           VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
          [req.user.id, item.type, item.value]
        );
        rewardMessage = `${item.name} активирован на 7 дней!`;
        break;
    }
    
    // Получаем обновлённый баланс очков
    const newPointsResult = await pool.query(
      'SELECT vip_points FROM users WHERE id = $1',
      [req.user.id]
    );
    
    res.json({
      success: true,
      message: rewardMessage,
      data: {
        item: item.name,
        pointsSpent: item.pointsCost,
        remainingPoints: newPointsResult.rows[0]?.vip_points || 0
      }
    });
  } catch (error) {
    console.error('Purchase loyalty item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// История покупок
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(
      `SELECT * FROM loyalty_purchases 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM loyalty_purchases WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: {
        purchases: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get loyalty history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Статистика программы лояльности
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COALESCE(SUM(vip_points), 0) as total_points_in_circulation,
        COUNT(*) FILTER (WHERE vip_level >= 2) as silver_plus_users,
        COUNT(*) FILTER (WHERE vip_level >= 3) as gold_plus_users,
        COUNT(*) FILTER (WHERE vip_level >= 4) as platinum_plus_users,
        COUNT(*) FILTER (WHERE vip_level = 5) as emperor_users
      FROM users
    `);
    
    const purchaseStats = await pool.query(`
      SELECT 
        COUNT(*) as total_purchases,
        COALESCE(SUM(points_spent), 0) as total_points_spent,
        item_type,
        COUNT(*) as count_by_type
      FROM loyalty_purchases
      GROUP BY item_type
    `);
    
    res.json({
      success: true,
      data: {
        users: stats.rows[0],
        purchases: purchaseStats.rows
      }
    });
  } catch (error) {
    console.error('Loyalty admin stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Выдать очки пользователю (админ)
router.post('/admin/grant-points', adminAuth, async (req, res) => {
  try {
    const { userId, points, reason } = req.body;
    
    if (!userId || !points || points <= 0) {
      return res.status(400).json({ success: false, message: 'Укажите userId и points' });
    }
    
    await pool.query(
      'UPDATE users SET vip_points = COALESCE(vip_points, 0) + $1 WHERE id = $2',
      [points, userId]
    );
    
    // Логируем
    await pool.query(
      `INSERT INTO admin_actions (admin_id, action, target_user_id, details)
       VALUES ($1, 'grant_loyalty_points', $2, $3)`,
      [req.user.id, userId, JSON.stringify({ points, reason })]
    );
    
    res.json({
      success: true,
      message: `${points} очков начислено пользователю #${userId}`
    });
  } catch (error) {
    console.error('Grant points error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
