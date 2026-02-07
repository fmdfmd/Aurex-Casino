const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// ============ USER ROUTES ============

// Активировать промокод
router.post('/activate', auth, async (req, res) => {
  try {
    const { code } = req.body;
    
    // Найти промокод
    const promoResult = await pool.query(
      'SELECT * FROM promocodes WHERE UPPER(code) = UPPER($1)',
      [code]
    );
    
    if (promoResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    const promo = promoResult.rows[0];
    
    if (!promo.is_active) {
      return res.status(400).json({ success: false, message: 'Промокод неактивен' });
    }
    
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Промокод истёк' });
    }
    
    if (promo.used_count >= promo.usage_limit) {
      return res.status(400).json({ success: false, message: 'Лимит использования исчерпан' });
    }
    
    // Проверяем, не использовал ли уже этот пользователь
    const usageResult = await pool.query(
      'SELECT * FROM promocode_usages WHERE promocode_id = $1 AND user_id = $2',
      [promo.id, req.user.id]
    );
    
    if (usageResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Вы уже использовали этот промокод' });
    }
    
    const { withTransaction } = require('../utils/dbTransaction');
    await withTransaction(pool, async (client) => {
      await client.query(
        'INSERT INTO promocode_usages (promocode_id, user_id) VALUES ($1, $2)',
        [promo.id, req.user.id]
      );
      
      await client.query(
        'UPDATE promocodes SET used_count = used_count + 1 WHERE id = $1',
        [promo.id]
      );
      
      let creditedAmount = 0;
      
      if (promo.type === 'bonus') {
        if (promo.value_type === 'fixed') {
          creditedAmount = parseFloat(promo.value);
        } else if (promo.value_type === 'percent') {
          // Процент от баланса — для промокодов процент не имеет смысла без депозита
          // Зачислим как фиксированную сумму value
          creditedAmount = parseFloat(promo.value);
        }
        
        if (creditedAmount > 0) {
          if (promo.max_bonus && creditedAmount > parseFloat(promo.max_bonus)) {
            creditedAmount = parseFloat(promo.max_bonus);
          }
          await client.query(
            'UPDATE users SET bonus_balance = bonus_balance + $1 WHERE id = $2',
            [creditedAmount, req.user.id]
          );
          
          // Создаём запись бонуса с вейджером
          const wagerMultiplier = promo.wager || 20;
          const wagerRequired = creditedAmount * wagerMultiplier;
          await client.query(
            `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
             VALUES ($1, $2, $3, $4, 0, 'active', NOW() + INTERVAL '30 days')`,
            [req.user.id, `promo_${promo.code}`, creditedAmount, wagerRequired]
          );
        }
      } else if (promo.type === 'freespins') {
        // Добавляем фриспины
        const spinsCount = parseInt(promo.value) || 0;
        if (spinsCount > 0) {
          await client.query(
            'UPDATE users SET freespins = freespins + $1 WHERE id = $2',
            [spinsCount, req.user.id]
          );
        }
        creditedAmount = spinsCount;
      } else if (promo.type === 'deposit_bonus') {
        // Процент к следующему депозиту — сохраняем в used_bonuses
        await client.query(
          `UPDATE users SET used_bonuses = used_bonuses || $1 WHERE id = $2`,
          [JSON.stringify({ promoBonus: { percent: parseFloat(promo.value), maxBonus: promo.max_bonus ? parseFloat(promo.max_bonus) : null, wager: promo.wager || 20, code: promo.code } }), req.user.id]
        );
        creditedAmount = parseFloat(promo.value);
      } else if (promo.type === 'balance') {
        // Прямо на основной баланс
        creditedAmount = parseFloat(promo.value);
        if (promo.max_bonus && creditedAmount > parseFloat(promo.max_bonus)) {
          creditedAmount = parseFloat(promo.max_bonus);
        }
        if (creditedAmount > 0) {
          await client.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [creditedAmount, req.user.id]
          );
          // Создаём вейджер если задан
          const balanceWager = promo.wager || 0;
          if (balanceWager > 0) {
            await client.query(
              `INSERT INTO bonuses (user_id, bonus_type, amount, wagering_requirement, wagering_completed, status, expires_at)
               VALUES ($1, $2, $3, $4, 0, 'active', NOW() + INTERVAL '30 days')`,
              [req.user.id, `promo_${promo.code}`, creditedAmount, creditedAmount * balanceWager]
            );
          }
        }
      }
    });
    
    res.json({ 
      success: true, 
      message: `Промокод ${promo.code} активирован!`,
      data: {
        type: promo.type,
        value: parseFloat(promo.value),
        valueType: promo.value_type,
        creditedAmount: promo.type === 'freespins' ? parseInt(promo.value) : parseFloat(promo.value),
        maxBonus: promo.max_bonus ? parseFloat(promo.max_bonus) : null,
        wager: promo.wager,
      }
    });
  } catch (error) {
    console.error('Activate promo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Получить все промокоды
router.get('/', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promocodes ORDER BY created_at DESC');
    
    const promocodes = result.rows.map(p => ({
      id: p.id.toString(),
      code: p.code,
      type: p.type,
      value: parseFloat(p.value),
      valueType: p.value_type,
      maxBonus: p.max_bonus ? parseFloat(p.max_bonus) : null,
      minDeposit: p.min_deposit ? parseFloat(p.min_deposit) : null,
      wager: p.wager,
      usageLimit: p.usage_limit,
      usedCount: p.used_count,
      isActive: p.is_active,
      expiresAt: p.expires_at,
      createdAt: p.created_at,
    }));
    
    res.json({ success: true, data: promocodes });
  } catch (error) {
    console.error('Get promocodes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Создать промокод
router.post('/', adminAuth, async (req, res) => {
  try {
    const { code, type, value, valueType, maxBonus, minDeposit, wager, usageLimit, expiresAt } = req.body;
    
    const result = await pool.query(
      `INSERT INTO promocodes (code, type, value, value_type, max_bonus, min_deposit, wager, usage_limit, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [code, type, value, valueType || 'percent', maxBonus, minDeposit, wager || 35, usageLimit || 1000, expiresAt]
    );
    
    const p = result.rows[0];
    res.json({ 
      success: true, 
      message: 'Промокод создан', 
      data: {
        id: p.id.toString(),
        code: p.code,
        type: p.type,
        value: parseFloat(p.value),
        valueType: p.value_type,
        isActive: p.is_active,
      }
    });
  } catch (error) {
    console.error('Create promo error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'Промокод с таким кодом уже существует' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обновить промокод
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { code, type, value, valueType, maxBonus, minDeposit, wager, usageLimit, isActive, expiresAt } = req.body;
    
    const result = await pool.query(
      `UPDATE promocodes SET 
        code = COALESCE($1, code),
        type = COALESCE($2, type),
        value = COALESCE($3, value),
        value_type = COALESCE($4, value_type),
        max_bonus = COALESCE($5, max_bonus),
        min_deposit = COALESCE($6, min_deposit),
        wager = COALESCE($7, wager),
        usage_limit = COALESCE($8, usage_limit),
        is_active = COALESCE($9, is_active),
        expires_at = COALESCE($10, expires_at)
       WHERE id = $11 RETURNING *`,
      [code, type, value, valueType, maxBonus, minDeposit, wager, usageLimit, isActive, expiresAt, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    res.json({ success: true, message: 'Промокод обновлён', data: result.rows[0] });
  } catch (error) {
    console.error('Update promo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Переключить статус
router.patch('/:id/toggle', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE promocodes SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    const p = result.rows[0];
    res.json({ 
      success: true, 
      message: `Промокод ${p.is_active ? 'активирован' : 'деактивирован'}`, 
      data: { id: p.id, isActive: p.is_active }
    });
  } catch (error) {
    console.error('Toggle promo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Удалить промокод
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM promocodes WHERE id = $1 RETURNING id', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Промокод не найден' });
    }
    
    res.json({ success: true, message: 'Промокод удалён' });
  } catch (error) {
    console.error('Delete promo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика промокодов
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        SUM(used_count) as total_usages
      FROM promocodes
    `);
    
    const stats = result.rows[0];
    res.json({ 
      success: true, 
      data: {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        totalUsages: parseInt(stats.total_usages) || 0,
      }
    });
  } catch (error) {
    console.error('Promo stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
