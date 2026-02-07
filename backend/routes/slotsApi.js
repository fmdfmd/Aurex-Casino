const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const pool = require('../config/database');
const { updateVipLevel: centralUpdateVipLevel } = require('../config/vipLevels');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Slots API Service Class
class SlotsApiService {
  constructor() {
    this.baseUrl = config.slotsApi.baseUrl;
    this.fallbackUrl = config.slotsApi.fallbackUrl;
    this.operatorId = config.slotsApi.operatorId;
    this.callbackUrl = config.slotsApi.callbackUrl;
  }

  // Get all games list
  async getGamesList() {
    try {
      const cmd = {
        api: "ls-games-by-operator-id-get",
        operator_id: this.operatorId
      };
      
      const response = await axios.get(`${this.baseUrl}/frontendsrv/apihandler.api`, {
        params: { cmd: JSON.stringify(cmd) },
        timeout: 10000
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching games list:', error);
      throw new Error('Failed to fetch games list');
    }
  }

  // Authenticate user with slots provider
  async authenticateUser(userId, gameCode, currency = 'RUB') {
    try {
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) throw new Error('User not found');
      const user = userResult.rows[0];

      const authData = {
        user_id: userId,
        user_ip: '127.0.0.1',
        user_auth_token: this.generateAuthToken(userId),
        currency: currency,
        game_code: gameCode
      };

      const response = await axios.post(`${this.baseUrl}/auth`, authData, {
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Authentication failed');
    }
  }

  // Start game session
  async startGameSession(userId, gameCode, currency = 'RUB', language = 'ru') {
    try {
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) throw new Error('User not found');
      const user = userResult.rows[0];

      // Create game session
      const sessionId = this.generateSessionId();
      
      const result = await pool.query(
        `INSERT INTO game_sessions (user_id, game_id, game_name, session_id, provider, currency, status, bet_amount, win_amount)
         VALUES ($1, $2, $3, $4, 'slots-api', $5, 'active', 0, 0) RETURNING *`,
        [userId, gameCode, gameCode, sessionId, currency]
      );

      // Generate game URL
      const gameUrl = this.generateGameUrl(userId, gameCode, sessionId, currency, language);

      return {
        sessionId: sessionId,
        gameUrl: gameUrl,
        balance: parseFloat(user.balance),
        currency: currency
      };
    } catch (error) {
      console.error('Start game session error:', error);
      throw new Error('Failed to start game session');
    }
  }

  // Generate game URL
  generateGameUrl(userId, gameCode, sessionId, currency, language) {
    const params = new URLSearchParams({
      operator_id: this.operatorId,
      user_id: userId,
      auth_token: this.generateAuthToken(userId),
      currency: currency,
      language: language,
      home_url: config.server.frontendUrl
    });

    return `${this.baseUrl}/games/${gameCode}/game?${params.toString()}`;
  }

  // Generate auth token
  generateAuthToken(userId) {
    const timestamp = Date.now();
    const data = `${userId}:${timestamp}:${config.jwt.secret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate session ID
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Update VIP level based on points (centralized)
  async updateVipLevel(userId) {
    try {
      await centralUpdateVipLevel(pool, userId);
    } catch (error) {
      console.error('Update VIP level error:', error);
    }
  }

  // Process bet transaction
  async processBet(transactionData) {
    const { user_id, session_id, bet_amount, currency, game_code, round_id, transaction_id } = transactionData;

    try {
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
      if (userResult.rows.length === 0) throw new Error('User not found');
      const user = userResult.rows[0];

      const sessionResult = await pool.query(
        "SELECT * FROM game_sessions WHERE session_id = $1 AND status = 'active'",
        [session_id]
      );
      if (sessionResult.rows.length === 0) throw new Error('Game session not found or inactive');
      const gameSession = sessionResult.rows[0];

      // Check balance
      if (parseFloat(user.balance) < bet_amount) {
        throw new Error('Insufficient balance');
      }

      // Update user balance + начисляем VIP очки (1 очко за каждые 100₽ ставки)
      const loyaltyPoints = Math.floor(bet_amount / 100);
      await pool.query(
        `UPDATE users SET 
          balance = balance - $1, 
          total_wagered = total_wagered + $1, 
          games_played = games_played + 1,
          vip_points = COALESCE(vip_points, 0) + $3
        WHERE id = $2`,
        [bet_amount, user_id, loyaltyPoints]
      );
      
      // Обновляем VIP уровень если набрали достаточно очков
      await this.updateVipLevel(user_id);
      
      // Обновляем прогресс вейджера активных бонусов
      await pool.query(
        `UPDATE bonuses 
         SET wagering_completed = wagering_completed + $1
         WHERE user_id = $2 AND status = 'active'`,
        [bet_amount, user_id]
      );
      
      // Проверяем завершённые бонусы (отыгранные)
      await pool.query(
        `UPDATE bonuses 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND status = 'active' AND wagering_completed >= wagering_requirement`,
        [user_id]
      );

      // Update game session
      await pool.query(
        'UPDATE game_sessions SET bet_amount = bet_amount + $1 WHERE id = $2',
        [bet_amount, gameSession.id]
      );

      // Create transaction
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description, game_session_id, round_id)
         VALUES ($1, 'bet', $2, $3, 'completed', $4, $5, $6)`,
        [user_id, -bet_amount, currency, `Ставка в ${game_code}`, gameSession.id, round_id]
      );

      const newBalanceResult = await pool.query('SELECT balance FROM users WHERE id = $1', [user_id]);

      return {
        success: true,
        balance: parseFloat(newBalanceResult.rows[0].balance),
        transaction_id: transaction_id
      };
    } catch (error) {
      console.error('Process bet error:', error);
      throw error;
    }
  }

  // Process win transaction
  async processWin(transactionData) {
    const { user_id, session_id, win_amount, currency, game_code, round_id, transaction_id } = transactionData;

    try {
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
      if (userResult.rows.length === 0) throw new Error('User not found');

      const sessionResult = await pool.query(
        "SELECT * FROM game_sessions WHERE session_id = $1 AND status = 'active'",
        [session_id]
      );
      if (sessionResult.rows.length === 0) throw new Error('Game session not found or inactive');
      const gameSession = sessionResult.rows[0];

      // Update user balance
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [win_amount, user_id]
      );

      // Update game session
      await pool.query(
        'UPDATE game_sessions SET win_amount = win_amount + $1 WHERE id = $2',
        [win_amount, gameSession.id]
      );

      // Create transaction
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description, game_session_id, round_id)
         VALUES ($1, 'win', $2, $3, 'completed', $4, $5, $6)`,
        [user_id, win_amount, currency, `Выигрыш в ${game_code}`, gameSession.id, round_id]
      );

      const newBalanceResult = await pool.query('SELECT balance FROM users WHERE id = $1', [user_id]);

      return {
        success: true,
        balance: parseFloat(newBalanceResult.rows[0].balance),
        transaction_id: transaction_id
      };
    } catch (error) {
      console.error('Process win error:', error);
      throw error;
    }
  }
}

const slotsService = new SlotsApiService();

// Routes

// Get games list
router.get('/games', async (req, res) => {
  try {
    const apiData = await slotsService.getGamesList();
    
    const processedGames = [];
    
    if (apiData && apiData.locator && apiData.locator.groups) {
      apiData.locator.groups.forEach(group => {
        if (group.games && Array.isArray(group.games)) {
          group.games.forEach(game => {
            processedGames.push({
              id: game.gm_bk_id,
              name: game.gm_title,
              provider: group.gr_title,
              image: game.icons && game.icons[0] ? 
                `https://icdnchannel.com${apiData.locator.ico_baseurl}${game.icons[0].ic_name}` : 
                null,
              gameUrl: game.gm_url,
              category: 'slots',
              lines: game.gm_ln,
              isNew: game.gm_new || false,
              isHot: (game.gm_bk_id % 4 === 0),
              rtp: 90 + (game.gm_bk_id % 10),
              popularity: 70 + (game.gm_bk_id % 30)
            });
          });
        }
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        games: processedGames,
        total: processedGames.length,
        groups: apiData.locator ? apiData.locator.groups : []
      }
    });
  } catch (error) {
    console.error('Error in /games endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start game session
router.post('/start-game', auth, async (req, res) => {
  try {
    const { gameCode, currency = 'RUB', language = 'ru' } = req.body;
    const userId = req.user.id;

    const gameData = await slotsService.startGameSession(userId, gameCode, currency, language);
    
    res.json({ success: true, data: gameData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Callback endpoints for slots provider

// Auth callback
router.post('/callback/auth', async (req, res) => {
  try {
    const { user_id, user_auth_token } = req.body;
    
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    res.json({
      api: 'do-auth-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        user_id: user_id,
        user_nickname: user.username,
        balance: parseFloat(user.balance),
        bonus_balance: parseFloat(user.bonus_balance),
        auth_token: user_auth_token,
        game_token: slotsService.generateAuthToken(user_id),
        error_code: 0,
        error_description: 'ok',
        currency: 'RUB',
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed', error_code: 1 });
  }
});

// Bet callback
router.post('/callback/bet', async (req, res) => {
  try {
    const result = await slotsService.processBet(req.body);
    
    res.json({
      api: 'do-debit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        user_id: req.body.user_id,
        user_nickname: 'Player',
        balance: result.balance,
        error_code: 0,
        error_description: 'ok',
        currency: req.body.currency,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(400).json({
      api: 'do-debit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        error_code: 2,
        error_description: error.message,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: false
    });
  }
});

// Win callback
router.post('/callback/win', async (req, res) => {
  try {
    const result = await slotsService.processWin(req.body);
    
    res.json({
      api: 'do-credit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        user_id: req.body.user_id,
        user_nickname: 'Player',
        balance: result.balance,
        error_code: 0,
        error_description: 'ok',
        currency: req.body.currency,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(400).json({
      api: 'do-credit-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        transaction_id: req.body.transaction_id,
        error_code: 2,
        error_description: error.message,
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: false
    });
  }
});

// Get user balance
router.post('/callback/balance', async (req, res) => {
  try {
    const { user_id } = req.body;
    
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];

    res.json({
      api: 'do-get-balance-user-ingame',
      answer: {
        operator_id: slotsService.operatorId,
        user_id: user_id,
        user_nickname: user.username,
        balance: parseFloat(user.balance),
        bonus_balance: parseFloat(user.bonus_balance),
        error_code: 0,
        error_description: 'ok',
        currency: 'RUB',
        timestamp: Math.floor(Date.now() / 1000)
      },
      success: true
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance', error_code: 1 });
  }
});

module.exports = router;
