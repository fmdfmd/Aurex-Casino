const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// Получить активные бонусы пользователя
router.get('/active', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM bonuses 
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    const bonuses = result.rows.map(b => ({
      id: b.id,
      type: b.bonus_type,
      amount: parseFloat(b.amount),
      wageringRequired: parseFloat(b.wagering_requirement),
      wageringCompleted: parseFloat(b.wagering_completed),
      progress: b.wagering_requirement > 0 
        ? Math.min(100, (parseFloat(b.wagering_completed) / parseFloat(b.wagering_requirement)) * 100)
        : 100,
      status: b.status,
      expiresAt: b.expires_at,
      activatedAt: b.activated_at
    }));
    
    res.json({ success: true, data: bonuses });
  } catch (error) {
    console.error('Get active bonuses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить историю бонусов
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const result = await pool.query(
      `SELECT * FROM bonuses 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), offset]
    );
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM bonuses WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({ 
      success: true, 
      data: {
        bonuses: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get bonus history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Активировать депозитный бонус
router.post('/activate-deposit', auth, async (req, res) => {
  try {
    const { depositNumber, amount } = req.body;
    
    // Конфигурация бонусов на депозит
    const depositBonuses = {
      1: { percent: 200, maxBonus: 70000, wager: 35 },
      2: { percent: 150, maxBonus: 50000, wager: 30 },
      3: { percent: 100, maxBonus: 30000, wager: 25 },
      4: { percent: 75, maxBonus: 20000, wager: 20 }
    };
    
    const bonusConfig = depositBonuses[depositNumber];
    if (!bonusConfig) {
      return res.status(400).json({ success: false, message: 'Неверный номер депозита' });
    }
    
    const bonusAmount = Math.min(amount * (bonusConfig.percent / 100), bonusConfig.maxBonus);
    const wagerRequired = (amount + bonusAmount) * bonusConfig.wager;
    
    const { withTransaction } = require('../utils/dbTransaction');
    const result = await withTransaction(pool, async (client) => {
      const bonusResult = await client.query(
        `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
         VALUES ($1, $2, $3, $4, 0, 'active', NOW() + INTERVAL '30 days') RETURNING *`,
        [req.user.id, `deposit_${depositNumber}`, bonusAmount, wagerRequired]
      );
      
      await client.query(
        'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
        [bonusAmount, req.user.id]
      );
      
      return bonusResult.rows[0];
    });
    
    res.json({ 
      success: true, 
      message: `Бонус ${bonusConfig.percent}% активирован!`,
      data: {
        bonusAmount,
        wagerRequired,
        bonus: result
      }
    });
  } catch (error) {
    console.error('Activate deposit bonus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обновить прогресс отыгрыша (вызывается при ставках)
router.post('/update-wager', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Обновляем прогресс всех активных бонусов
    await pool.query(
      `UPDATE bonuses 
       SET wagering_completed = wagering_completed + $1
       WHERE user_id = $2 AND status = 'active'`,
      [amount, req.user.id]
    );
    
    // Проверяем завершённые бонусы
    await pool.query(
      `UPDATE bonuses 
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'active' AND wagering_completed >= wagering_requirement`,
      [req.user.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update wager error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reload бонус - ОТКЛЮЧЕНО (слишком щедрый)
// TODO: Пересмотреть условия и включить позже
// router.post('/activate-reload', auth, async (req, res) => { ... });

// Получить доступные бонусы для пользователя
router.get('/available', auth, async (req, res) => {
  try {
    const user = await pool.query('SELECT deposit_count FROM users WHERE id = $1', [req.user.id]);
    const depositCount = user.rows[0]?.deposit_count || 0;
    
    const available = [];
    
    // Приветственные бонусы (депозиты 1-4)
    const depositBonuses = [
      { depositNumber: 1, percent: 200, maxBonus: 70000, wager: 35, title: '1-й депозит' },
      { depositNumber: 2, percent: 150, maxBonus: 50000, wager: 30, title: '2-й депозит' },
      { depositNumber: 3, percent: 100, maxBonus: 30000, wager: 25, title: '3-й депозит' },
      { depositNumber: 4, percent: 75, maxBonus: 20000, wager: 20, title: '4-й депозит' }
    ];
    
    for (const bonus of depositBonuses) {
      if (depositCount < bonus.depositNumber) {
        available.push({
          type: `deposit_${bonus.depositNumber}`,
          title: bonus.title,
          percent: bonus.percent,
          maxBonus: bonus.maxBonus,
          wager: bonus.wager,
          available: depositCount + 1 === bonus.depositNumber,
          locked: depositCount + 1 < bonus.depositNumber
        });
      }
    }
    
    // Reload бонус - ОТКЛЮЧЕНО
    // if (depositCount >= 4) { ... }
    
    res.json({ success: true, data: available });
  } catch (error) {
    console.error('Get available bonuses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Активировать бонус (пометить как выбранный для следующего депозита)
router.post('/:id/activate', auth, async (req, res) => {
  try {
    const bonusId = req.params.id;
    
    // Сохраняем выбранный бонус в used_bonuses пользователя
    await pool.query(
      `UPDATE users SET used_bonuses = used_bonuses || $1 WHERE id = $2`,
      [JSON.stringify({ selectedBonus: bonusId }), req.user.id]
    );
    
    res.json({ 
      success: true, 
      message: 'Бонус активирован! Он будет применён при следующем депозите.' 
    });
  } catch (error) {
    console.error('Activate bonus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Деактивировать выбранный бонус
router.post('/:id/deactivate', auth, async (req, res) => {
  try {
    // Убираем selectedBonus из used_bonuses
    await pool.query(
      `UPDATE users SET used_bonuses = used_bonuses - 'selectedBonus' WHERE id = $1`,
      [req.user.id]
    );
    
    res.json({ success: true, message: 'Бонус деактивирован' });
  } catch (error) {
    console.error('Deactivate bonus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Отменить бонус
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const { withTransaction } = require('../utils/dbTransaction');
    await withTransaction(pool, async (client) => {
      const result = await client.query(
        `UPDATE bonuses SET status = 'cancelled'
         WHERE id = $1 AND user_id = $2 AND status = 'active' RETURNING *`,
        [req.params.id, req.user.id]
      );
      
      if (result.rows.length === 0) {
        throw { status: 404, message: 'Бонус не найден или уже неактивен' };
      }
      
      await client.query(
        'UPDATE users SET bonus_balance = GREATEST(0, bonus_balance - $1) WHERE id = $2',
        [result.rows[0].amount, req.user.id]
      );
    });
    
    res.json({ success: true, message: 'Бонус отменён' });
  } catch (error) {
    console.error('Cancel bonus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все бонусы (для админки)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT b.*, u.username, u.email 
      FROM bonuses b
      LEFT JOIN users u ON b.user_id = u.id
    `;
    const params = [];
    
    if (status) {
      query += ` WHERE b.status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);
    
    const result = await pool.query(query, params);
    
    res.json({ 
      success: true, 
      data: { 
        bonuses: result.rows 
      } 
    });
  } catch (error) {
    console.error('Get all bonuses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Выдать бонус пользователю
router.post('/admin/grant', adminAuth, async (req, res) => {
  try {
    const { userId, type, amount, wager } = req.body;
    
    const { withTransaction } = require('../utils/dbTransaction');
    const bonus = await withTransaction(pool, async (client) => {
      const bonusResult = await client.query(
        `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
         VALUES ($1, $2, $3, $4, 0, 'active', NOW() + INTERVAL '30 days') RETURNING *`,
        [userId, type || 'admin_bonus', amount, (amount * (wager || 1))]
      );
      
      await client.query(
        'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
        [amount, userId]
      );
      
      return bonusResult.rows[0];
    });
    
    res.json({ success: true, message: 'Бонус выдан', data: bonus });
  } catch (error) {
    console.error('Grant bonus error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика бонусов
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as active_amount
      FROM bonuses
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Bonus stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
