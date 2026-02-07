const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

// Создать дефолтные бонусы для пользователя
async function createDefaultBonuses(userId, vipLevel = 1) {
  const defaultBonuses = [
    {
      type: 'freespins',
      name: 'Ежедневные фриспины',
      description: '25 бесплатных вращений каждый день',
      value: '25 FS',
      value_amount: 25,
      icon: '🎰',
      gradient: 'from-purple-500 to-pink-500',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      is_locked: false,
      wager_required: 30
    },
    {
      type: 'cashback',
      name: 'Недельный кэшбэк',
      description: 'Возврат 10% от проигрышей за неделю',
      value: '10%',
      value_amount: 0,
      icon: '💰',
      gradient: 'from-green-500 to-emerald-500',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      is_locked: false,
      wager_required: 5
    },
    {
      type: 'reload',
      name: 'Бонус на депозит',
      description: '50% бонус на следующий депозит',
      value: '50%',
      value_amount: 50,
      icon: '🎁',
      gradient: 'from-blue-500 to-cyan-500',
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      is_locked: false,
      wager_required: 25
    },
    {
      type: 'vip',
      name: 'VIP Бонус',
      description: 'Эксклюзивный бонус для VIP игроков',
      value: '₽5,000',
      value_amount: 5000,
      icon: '👑',
      gradient: 'from-aurex-gold-500 to-amber-500',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_locked: vipLevel < 3,
      unlock_condition: vipLevel < 3 ? 'Достигните VIP уровня Gold (3+)' : null,
      wager_required: 15
    }
  ];

  for (const bonus of defaultBonuses) {
    await pool.query(
      `INSERT INTO vault_bonuses (user_id, type, name, description, value, value_amount, icon, gradient, expires_at, is_locked, unlock_condition, wager_required, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'available')`,
      [userId, bonus.type, bonus.name, bonus.description, bonus.value, bonus.value_amount, bonus.icon, bonus.gradient, bonus.expires_at, bonus.is_locked, bonus.unlock_condition, bonus.wager_required]
    );
  }
}

// Получить бонусы пользователя
router.get('/bonuses', auth, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Получаем VIP уровень пользователя
    const userResult = await pool.query('SELECT vip_level FROM users WHERE id = $1', [req.user.id]);
    const vipLevel = userResult.rows[0]?.vip_level || 1;
    
    // Проверяем есть ли бонусы у пользователя
    let result = await pool.query(
      'SELECT * FROM vault_bonuses WHERE user_id = $1',
      [req.user.id]
    );
    
    // Если бонусов нет - создаём дефолтные
    if (result.rows.length === 0) {
      await createDefaultBonuses(req.user.id, vipLevel);
      result = await pool.query(
        'SELECT * FROM vault_bonuses WHERE user_id = $1',
        [req.user.id]
      );
    }
    
    // Обновляем статус VIP бонуса на основе текущего VIP уровня
    await pool.query(
      `UPDATE vault_bonuses 
       SET is_locked = $1, unlock_condition = $2
       WHERE user_id = $3 AND type = 'vip' AND status = 'available'`,
      [vipLevel < 3, vipLevel < 3 ? 'Достигните VIP уровня Gold (3+)' : null, req.user.id]
    );
    
    // Повторно получаем обновлённые бонусы
    let query = 'SELECT * FROM vault_bonuses WHERE user_id = $1';
    const values = [req.user.id];
    
    if (status === 'available') {
      query += " AND status = 'available' AND is_locked = false";
    } else if (status === 'locked') {
      query += " AND is_locked = true AND status = 'available'";
    } else if (status === 'used') {
      query += " AND status IN ('used', 'activated')";
    }
    
    query += ' ORDER BY created_at DESC';
    
    result = await pool.query(query, values);
    
    const bonuses = result.rows.map(b => ({
      id: b.id.toString(),
      type: b.type,
      name: b.name,
      description: b.description,
      value: b.value,
      valueAmount: parseFloat(b.value_amount) || 0,
      icon: b.icon,
      gradient: b.gradient,
      expiresAt: b.expires_at,
      isLocked: b.is_locked,
      unlockCondition: b.unlock_condition,
      wagerRequired: b.wager_required,
      wagerCompleted: b.wager_completed,
      status: b.status,
      activatedAt: b.activated_at
    }));
    
    res.json({ success: true, data: bonuses });
  } catch (error) {
    console.error('Get vault bonuses error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Активировать бонус
router.post('/activate/:bonusId', auth, async (req, res) => {
  try {
    const { bonusId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM vault_bonuses WHERE id = $1 AND user_id = $2',
      [bonusId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Бонус не найден' });
    }
    
    const bonus = result.rows[0];
    
    if (bonus.is_locked) {
      return res.status(400).json({ success: false, error: bonus.unlock_condition || 'Бонус заблокирован' });
    }
    
    if (bonus.status === 'used' || bonus.status === 'activated') {
      return res.status(400).json({ success: false, error: 'Бонус уже активирован' });
    }
    
    if (new Date(bonus.expires_at) < new Date()) {
      await pool.query(
        "UPDATE vault_bonuses SET status = 'expired' WHERE id = $1",
        [bonusId]
      );
      return res.status(400).json({ success: false, error: 'Срок действия бонуса истёк' });
    }
    
    const { withTransaction } = require('../utils/dbTransaction');
    await withTransaction(pool, async (client) => {
      await client.query(
        "UPDATE vault_bonuses SET status = 'used', activated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [bonusId]
      );
      
      if (bonus.value_amount > 0 && ['reload', 'vip', 'special'].includes(bonus.type)) {
        await client.query(
          'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
          [bonus.value_amount, req.user.id]
        );
      }
    });
    
    res.json({ 
      success: true, 
      message: `Бонус "${bonus.name}" активирован!`,
      data: {
        bonusId: bonus.id,
        type: bonus.type,
        value: bonus.value,
        valueAmount: parseFloat(bonus.value_amount)
      }
    });
  } catch (error) {
    console.error('Activate bonus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить сводку хранилища
router.get('/summary', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'available' AND is_locked = false) as available,
        COUNT(*) FILTER (WHERE is_locked = true AND status = 'available') as locked,
        COUNT(*) FILTER (WHERE status IN ('used', 'activated')) as used,
        COUNT(*) as total
      FROM vault_bonuses
      WHERE user_id = $1
    `, [req.user.id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get vault summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
