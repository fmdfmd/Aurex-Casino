const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { auth, optionalAuth } = require('../middleware/auth');

// Получить игровые сессии пользователя
router.get('/sessions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM game_sessions WHERE user_id = $1';
    const values = [req.user.id];
    
    if (status && status !== 'all') {
      values.push(status);
      query += ` AND status = $${values.length}`;
    }
    
    values.push(parseInt(limit));
    query += ` ORDER BY started_at DESC LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows.map(s => ({
        id: s.id,
        gameId: s.game_id,
        gameName: s.game_name,
        provider: s.provider,
        betAmount: parseFloat(s.bet_amount),
        winAmount: parseFloat(s.win_amount),
        status: s.status,
        startedAt: s.started_at,
        endedAt: s.ended_at
      }))
    });
  } catch (error) {
    console.error('Get game sessions error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить историю ставок
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, gameType } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM game_sessions WHERE user_id = $1';
    const values = [req.user.id];
    
    if (gameType && gameType !== 'all') {
      values.push(gameType);
      query += ` AND game_type = $${values.length}`;
    }
    
    values.push(parseInt(limit));
    query += ` ORDER BY started_at DESC LIMIT $${values.length}`;
    values.push(offset);
    query += ` OFFSET $${values.length}`;
    
    const result = await pool.query(query, values);
    
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM game_sessions WHERE user_id = $1',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: {
        sessions: result.rows.map(s => ({
          id: s.id,
          gameId: s.game_id,
          gameName: s.game_name,
          provider: s.provider,
          betAmount: parseFloat(s.bet_amount),
          winAmount: parseFloat(s.win_amount),
          profit: parseFloat(s.win_amount) - parseFloat(s.bet_amount),
          status: s.status,
          startedAt: s.started_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count)
        }
      }
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить статистику игр пользователя
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(bet_amount), 0) as total_wagered,
        COALESCE(SUM(win_amount), 0) as total_won,
        COALESCE(SUM(win_amount - bet_amount), 0) as net_profit,
        COALESCE(MAX(win_amount), 0) as biggest_win,
        COUNT(DISTINCT game_id) as games_played
      FROM game_sessions
      WHERE user_id = $1
    `, [req.user.id]);
    
    const stats = result.rows[0];
    
    // Топ игр пользователя
    const topGamesResult = await pool.query(`
      SELECT 
        game_id, game_name, provider,
        COUNT(*) as sessions,
        COALESCE(SUM(bet_amount), 0) as wagered,
        COALESCE(SUM(win_amount), 0) as won
      FROM game_sessions
      WHERE user_id = $1
      GROUP BY game_id, game_name, provider
      ORDER BY sessions DESC
      LIMIT 5
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        totalSessions: parseInt(stats.total_sessions),
        totalWagered: parseFloat(stats.total_wagered),
        totalWon: parseFloat(stats.total_won),
        netProfit: parseFloat(stats.net_profit),
        biggestWin: parseFloat(stats.biggest_win),
        gamesPlayed: parseInt(stats.games_played),
        topGames: topGamesResult.rows.map(g => ({
          gameId: g.game_id,
          gameName: g.game_name,
          provider: g.provider,
          sessions: parseInt(g.sessions),
          wagered: parseFloat(g.wagered),
          won: parseFloat(g.won)
        }))
      }
    });
  } catch (error) {
    console.error('Get game stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Запустить игру
router.post('/launch', auth, async (req, res) => {
  try {
    const { gameId, gameName, provider, demo = false } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ success: false, message: 'Game ID required' });
    }
    
    // Создаём сессию
    const result = await pool.query(
      `INSERT INTO game_sessions (user_id, game_id, game_name, provider, status, is_demo, bet_amount, win_amount)
       VALUES ($1, $2, $3, $4, 'active', $5, 0, 0) RETURNING *`,
      [req.user.id, gameId, gameName || gameId, provider || 'unknown', demo]
    );
    
    const session = result.rows[0];
    
    // Получаем баланс
    const userResult = await pool.query('SELECT balance, bonus_balance FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        gameUrl: `/games/play/${gameId}?session=${session.id}`,
        balance: parseFloat(user.balance),
        bonusBalance: parseFloat(user.bonus_balance)
      }
    });
  } catch (error) {
    console.error('Launch game error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Завершить сессию
router.post('/sessions/:id/end', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE game_sessions SET status = 'completed', ended_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Получить последние крупные выигрыши (публичный)
router.get('/big-wins', optionalAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT gs.*, u.username
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      WHERE gs.win_amount >= 10000
      ORDER BY gs.win_amount DESC
      LIMIT 20
    `);
    
    res.json({
      success: true,
      data: result.rows.map(w => ({
        username: w.username.substring(0, 2) + '***',
        gameName: w.game_name,
        winAmount: parseFloat(w.win_amount),
        timestamp: w.started_at
      }))
    });
  } catch (error) {
    console.error('Get big wins error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
