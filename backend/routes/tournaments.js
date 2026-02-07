const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

// ============ PUBLIC ROUTES ============

// Получить активные турниры
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
      FROM tournaments t
      WHERE t.status = 'active' AND t.end_date > NOW()
      ORDER BY t.prize_pool DESC
    `);
    
    const tournaments = result.rows.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.status,
      status: t.status,
      prizePool: parseFloat(t.prize_pool),
      currency: t.currency,
      startDate: t.start_date,
      endDate: t.end_date,
      minBet: parseFloat(t.min_bet),
      participantCount: parseInt(t.participant_count),
      gameIds: t.game_ids || []
    }));
    
    res.json({ success: true, data: tournaments });
  } catch (error) {
    console.error('Get active tournaments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить все турниры
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let query = `
      SELECT t.*,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
      FROM tournaments t
    `;
    const conditions = [];
    const values = [];
    
    if (status && status !== 'all') {
      values.push(status);
      conditions.push(`t.status = $${values.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY t.start_date DESC';
    
    const result = await pool.query(query, values);
    
    const tournaments = result.rows.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type || 'daily',
      status: t.status,
      prizePool: parseFloat(t.prize_pool),
      currency: t.currency,
      startDate: t.start_date,
      endDate: t.end_date,
      minBet: parseFloat(t.min_bet),
      participantCount: parseInt(t.participant_count),
      gameIds: t.game_ids || []
    }));
    
    res.json({ success: true, data: tournaments });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить турнир по ID с лидербордом
router.get('/:id', async (req, res) => {
  try {
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [req.params.id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    const t = tournamentResult.rows[0];
    
    // Получаем лидерборд
    const leaderboardResult = await pool.query(`
      SELECT tp.*, u.username, u.odid
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = $1
      ORDER BY tp.points DESC
      LIMIT 100
    `, [req.params.id]);
    
    res.json({
      success: true,
      data: {
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type || 'daily',
        status: t.status,
        prizePool: parseFloat(t.prize_pool),
        currency: t.currency,
        startDate: t.start_date,
        endDate: t.end_date,
        minBet: parseFloat(t.min_bet),
        gameIds: t.game_ids || [],
        leaderboard: leaderboardResult.rows.map((p, idx) => ({
          rank: idx + 1,
          odid: p.odid,
          username: p.username,
          points: p.points,
          totalWagered: parseFloat(p.total_wagered),
          prizeWon: p.prize_won ? parseFloat(p.prize_won) : null
        }))
      }
    });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ USER ROUTES ============

// Присоединиться к турниру
router.post('/:id/join', auth, async (req, res) => {
  try {
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [req.params.id]
    );
    
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    const t = tournamentResult.rows[0];
    
    if (t.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Турнир неактивен' });
    }
    
    // Проверяем не участвует ли уже
    const existing = await pool.query(
      'SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Вы уже участвуете в турнире' });
    }
    
    await pool.query(
      `INSERT INTO tournament_participants (tournament_id, user_id, points, total_wagered)
       VALUES ($1, $2, 0, 0)`,
      [req.params.id, req.user.id]
    );
    
    res.json({ success: true, message: 'Вы присоединились к турниру' });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить мои турниры
router.get('/user/my', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, tp.points, tp.total_wagered, tp.rank, tp.prize_won
      FROM tournament_participants tp
      JOIN tournaments t ON tp.tournament_id = t.id
      WHERE tp.user_id = $1
      ORDER BY t.end_date DESC
    `, [req.user.id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get my tournaments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============ ADMIN ROUTES ============

// Создать турнир
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, prizePool, startDate, endDate, minBet, gameIds, type } = req.body;
    
    if (!name || !prizePool || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Заполните обязательные поля' });
    }
    
    const result = await pool.query(
      `INSERT INTO tournaments (name, description, prize_pool, currency, min_bet, status, start_date, end_date, game_ids)
       VALUES ($1, $2, $3, 'RUB', $4, 'upcoming', $5, $6, $7) RETURNING *`,
      [name, description, prizePool, minBet || 10, startDate, endDate, gameIds || []]
    );
    
    res.json({ success: true, message: 'Турнир создан', data: result.rows[0] });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Обновить турнир
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, prizePool, startDate, endDate, minBet, status, gameIds } = req.body;
    
    const result = await pool.query(
      `UPDATE tournaments SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        prize_pool = COALESCE($3, prize_pool),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        min_bet = COALESCE($6, min_bet),
        status = COALESCE($7, status),
        game_ids = COALESCE($8, game_ids)
       WHERE id = $9 RETURNING *`,
      [name, description, prizePool, startDate, endDate, minBet, status, gameIds, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }
    
    res.json({ success: true, message: 'Турнир обновлён', data: result.rows[0] });
  } catch (error) {
    console.error('Update tournament error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Удалить турнир
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM tournaments WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Турнир удалён' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Статистика турниров
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM(prize_pool), 0) as total_prize_pool,
        (SELECT COUNT(*) FROM tournament_participants) as total_participants
      FROM tournaments
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Tournament stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Лидерборд турнира
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const leaderboardResult = await pool.query(`
      SELECT tp.*, u.username, u.odid
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = $1
      ORDER BY tp.points DESC
      LIMIT 100
    `, [req.params.id]);
    
    res.json({
      success: true,
      data: leaderboardResult.rows.map((p, idx) => ({
        rank: idx + 1,
        odid: p.odid,
        username: p.username,
        points: p.points,
        totalWagered: parseFloat(p.total_wagered || 0),
        prizeWon: p.prize_won ? parseFloat(p.prize_won) : null
      }))
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Лидерборд турнира
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const tournamentResult = await pool.query('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Турнир не найден' });
    }

    const leaderboardResult = await pool.query(`
      SELECT tp.*, u.username, u.odid
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = $1
      ORDER BY tp.points DESC
      LIMIT 100
    `, [req.params.id]);

    res.json({
      success: true,
      data: leaderboardResult.rows.map((p, idx) => ({
        rank: idx + 1,
        position: idx + 1,
        odid: p.odid,
        username: p.username,
        name: p.username,
        points: p.points,
        score: p.points,
        totalWagered: parseFloat(p.total_wagered || '0'),
        wagered: parseFloat(p.total_wagered || '0'),
        prize: p.prize_won ? `${parseFloat(p.prize_won).toLocaleString('ru-RU')} ₽` : '—',
        prizeWon: p.prize_won ? parseFloat(p.prize_won) : null
      }))
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Расписание турниров
router.get('/schedule', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, start_date, prize_pool, currency
      FROM tournaments
      WHERE status IN ('active', 'upcoming')
      ORDER BY start_date ASC
      LIMIT 10
    `);
    
    const schedule = result.rows.map(t => ({
      type: t.name,
      time: new Date(t.start_date).toLocaleString('ru-RU'),
      prize: `${t.currency}${parseFloat(t.prize_pool).toLocaleString('ru-RU')}`
    }));
    
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
