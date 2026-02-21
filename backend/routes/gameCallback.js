const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { updateVipLevel } = require('../config/vipLevels');
const { trackDepositBonusWager } = require('../config/bonusConfig');

// Middleware для логирования всех запросов от провайдера
router.use((req, res, next) => {
  console.log('🎮 Callback от провайдера:', {
    method: req.method,
    url: req.url,
    body: req.body
  });
  next();
});

// Обработка do-auth-user-ingame запроса
router.post('/do-auth-user-ingame', async (req, res) => {
  try {
    const { user_id, auth_token, operator_id, game_id, currency, lang, mode } = req.body;
    
    console.log('🔑 Авторизация пользователя в игре:', { user_id, game_id, currency, mode });

    let user = null;
    
    if (auth_token === 'demo') {
      // Демо режим - ищем или создаём демо пользователя
      const demoResult = await pool.query("SELECT * FROM users WHERE username = 'demo_player' LIMIT 1");
      
      if (demoResult.rows.length === 0) {
        // Создаём демо пользователя
        const insertResult = await pool.query(
          `INSERT INTO users (username, email, password, balance, odid)
           VALUES ('demo_player', 'demo@aurex.casino', 'demo_no_login', 10000, 'AUREX-DEMO')
           RETURNING *`
        );
        user = insertResult.rows[0];
      } else {
        user = demoResult.rows[0];
      }
    } else {
      // Реальный режим - ищем пользователя
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1 OR odid = $2',
        [user_id, user_id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      user = userResult.rows[0];
    }

    // Создаем игровую сессию в БД
    const sessionId = `session_${Date.now()}_${user.id}`;
    
    await pool.query(
      `INSERT INTO game_sessions (user_id, game_id, game_name, session_id, provider, currency, status, bet_amount, win_amount)
       VALUES ($1, $2, $3, $4, 'provider', $5, 'active', 0, 0)`,
      [user.id, game_id, game_id, sessionId, currency || 'RUB']
    );

    const totalBalance = parseFloat(user.balance) + parseFloat(user.bonus_balance || 0);
    console.log(`✅ Пользователь ${user.username} авторизован. Баланс: ${totalBalance}₽`);

    res.json({
      success: true,
      user: {
        id: user.odid || user.id.toString(),
        username: user.username,
        balance: totalBalance,
        currency: currency || 'RUB'
      },
      session: {
        session_id: sessionId,
        game_url: `https://int.apichannel.cloud/games/${game_id}`,
        expires_at: Date.now() + (60 * 60 * 1000)
      }
    });

  } catch (error) {
    console.error('❌ Ошибка авторизации:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка get-balance запроса
router.post('/get-balance', async (req, res) => {
  try {
    const { user_id, session_id } = req.body;
    
    console.log('💰 Запрос баланса:', { user_id, session_id });

    // Ищем сессию
    const sessionResult = await pool.query(
      "SELECT * FROM game_sessions WHERE session_id = $1 AND status = 'active'",
      [session_id]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];

    // Ищем пользователя
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    const totalBalance = parseFloat(user.balance) + parseFloat(user.bonus_balance || 0);
    console.log(`💰 Баланс пользователя ${user.username}: ${totalBalance}₽`);
    
    res.json({
      success: true,
      balance: totalBalance,
      currency: session.currency || 'RUB'
    });

  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка make-bet запроса
router.post('/make-bet', async (req, res) => {
  try {
    const { user_id, session_id, amount, bet_id, game_round_id } = req.body;
    
    console.log('🎲 Ставка:', { user_id, session_id, amount, bet_id, game_round_id });

    // Ищем сессию
    const sessionResult = await pool.query(
      "SELECT * FROM game_sessions WHERE session_id = $1 AND status = 'active'",
      [session_id]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];

    // Ищем пользователя
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const { withTransaction } = require('../utils/dbTransaction');
    
    const result = await withTransaction(pool, async (client) => {
      // Блокируем строку пользователя
      const lockedUser = await client.query(
        'SELECT * FROM users WHERE id = $1 FOR UPDATE',
        [session.user_id]
      );
      if (lockedUser.rows.length === 0) {
        throw { status: 404, message: 'User not found' };
      }
      const user = lockedUser.rows[0];
      const mainBal = parseFloat(user.balance);
      const bonusBal = parseFloat(user.bonus_balance || 0);
      const totalAvailable = mainBal + bonusBal;
      
      if (totalAvailable < amount) {
        throw { status: 400, message: 'Insufficient balance', balance: totalAvailable };
      }
      
      // Deduct from main balance first, then bonus_balance
      const fromMain = Math.min(amount, mainBal);
      const fromBonus = amount - fromMain;

      const updatedUser = await client.query(
        `UPDATE users SET balance = balance - $1, bonus_balance = GREATEST(0, bonus_balance - $2),
         total_wagered = total_wagered + $3, games_played = games_played + 1 
         WHERE id = $4 RETURNING balance, bonus_balance`,
        [fromMain, fromBonus, amount, user.id]
      );
      const newBalance = parseFloat(updatedUser.rows[0].balance) + parseFloat(updatedUser.rows[0].bonus_balance);

      // Track deposit bonus wager progress
      await trackDepositBonusWager(client, user.id, amount);
      
      // Обновляем сессию
      await client.query(
        'UPDATE game_sessions SET bet_amount = bet_amount + $1 WHERE id = $2',
        [amount, session.id]
      );
      
      // Создаём транзакцию
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description, round_id)
         VALUES ($1, 'bet', $2, $5, 'completed', $3, $4) RETURNING id`,
        [user.id, -amount, 'Ставка в игре', game_round_id, session.currency || 'RUB']
      );
      
      // VIP очки
      const loyaltyPoints = Math.floor(amount / 100);
      if (loyaltyPoints > 0) {
        await client.query(
          'UPDATE users SET vip_points = COALESCE(vip_points, 0) + $1 WHERE id = $2',
          [loyaltyPoints, user.id]
        );
      }
      
      return { newBalance, txId: txResult.rows[0].id.toString(), username: user.username };
    });
    
    // VIP level update (outside transaction - non-critical)
    try { await updateVipLevel(pool, session.user_id); } catch(e) { console.error('VIP update error:', e); }
    
    console.log(`🎲 Ставка ${amount}₽ от ${result.username}. Новый баланс: ${result.newBalance}₽`);
    
    res.json({
      success: true,
      balance: result.newBalance,
      currency: session.currency || 'RUB',
      transaction_id: result.txId
    });

  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message, balance: error.balance });
    console.error('❌ Ошибка ставки:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка win запроса
router.post('/win', async (req, res) => {
  try {
    const { user_id, session_id, amount, win_id, game_round_id } = req.body;
    
    console.log('🎉 Выигрыш:', { user_id, session_id, amount, win_id, game_round_id });

    // Ищем сессию
    const sessionResult = await pool.query(
      "SELECT * FROM game_sessions WHERE session_id = $1 AND status = 'active'",
      [session_id]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];

    // Ищем пользователя
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const { withTransaction } = require('../utils/dbTransaction');
    
    const result = await withTransaction(pool, async (client) => {
      const lockedUser = await client.query(
        'SELECT * FROM users WHERE id = $1 FOR UPDATE',
        [session.user_id]
      );
      if (lockedUser.rows.length === 0) throw { status: 404, message: 'User not found' };
      const user = lockedUser.rows[0];
      
      // Добавляем выигрыш атомарно
      const updatedUser = await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
        [amount, user.id]
      );
      const newBalance = parseFloat(updatedUser.rows[0].balance);
      
      // Обновляем сессию
      await client.query(
        'UPDATE game_sessions SET win_amount = win_amount + $1 WHERE id = $2',
        [amount, session.id]
      );
      
      // Создаём транзакцию
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description, round_id)
         VALUES ($1, 'win', $2, $5, 'completed', $3, $4) RETURNING id`,
        [user.id, amount, 'Выигрыш в игре', game_round_id, session.currency || 'RUB']
      );
      
      return { newBalance, txId: txResult.rows[0].id.toString(), username: user.username };
    });
    
    console.log(`🎉 Выигрыш ${amount}₽ для ${result.username}. Новый баланс: ${result.newBalance}₽`);
    
    res.json({
      success: true,
      balance: result.newBalance,
      currency: session.currency || 'RUB',
      transaction_id: result.txId
    });

  } catch (error) {
    console.error('❌ Ошибка выигрыша:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка cancel-bet запроса
router.post('/cancel-bet', async (req, res) => {
  try {
    const { user_id, session_id, bet_id, amount } = req.body;
    
    console.log('🔄 Отмена ставки:', { user_id, session_id, bet_id, amount });

    // Ищем сессию
    const sessionResult = await pool.query(
      "SELECT * FROM game_sessions WHERE session_id = $1 AND status = 'active'",
      [session_id]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const session = sessionResult.rows[0];

    // Ищем пользователя
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [session.user_id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const { withTransaction } = require('../utils/dbTransaction');
    
    const result = await withTransaction(pool, async (client) => {
      const lockedUser = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [session.user_id]);
      if (lockedUser.rows.length === 0) throw { status: 404, message: 'User not found' };
      const user = lockedUser.rows[0];
      
      const updatedUser = await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
        [amount, user.id]
      );
      const newBalance = parseFloat(updatedUser.rows[0].balance);
      
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, description)
         VALUES ($1, 'cancel', $2, $3, 'completed', 'Отмена ставки') RETURNING id`,
        [user.id, amount, session.currency || 'RUB']
      );
      
      return { newBalance, txId: txResult.rows[0].id.toString(), username: user.username };
    });

    console.log(`🔄 Отмена ставки ${amount}₽ для ${result.username}. Новый баланс: ${result.newBalance}₽`);
    
    res.json({
      success: true,
      balance: result.newBalance,
      currency: session.currency || 'RUB',
      transaction_id: result.txId
    });

  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message });
    console.error('❌ Ошибка отмены ставки:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка game-end запроса
router.post('/game-end', async (req, res) => {
  try {
    const { user_id, session_id, game_round_id } = req.body;
    
    console.log('🏁 Конец игры:', { user_id, session_id, game_round_id });

    // Закрываем сессию
    if (session_id) {
      await pool.query(
        "UPDATE game_sessions SET status = 'completed', ended_at = CURRENT_TIMESTAMP WHERE session_id = $1",
        [session_id]
      );
    }

    res.json({ success: true, message: 'Game session ended' });

  } catch (error) {
    console.error('❌ Ошибка завершения игры:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Обработка любых других callback запросов
router.all('*', (req, res) => {
  console.log('🤔 Неизвестный callback запрос:', {
    method: req.method,
    url: req.url,
    body: req.body
  });
  
  res.json({ success: true, message: 'Callback received' });
});

module.exports = router;
