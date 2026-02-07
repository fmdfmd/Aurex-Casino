const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { updateVipLevel } = require('../config/vipLevels');

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

    console.log(`✅ Пользователь ${user.username} авторизован. Баланс: ${user.balance}₽`);

    res.json({
      success: true,
      user: {
        id: user.odid || user.id.toString(),
        username: user.username,
        balance: parseFloat(user.balance),
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
    
    console.log(`💰 Баланс пользователя ${user.username}: ${user.balance}₽`);
    
    res.json({
      success: true,
      balance: parseFloat(user.balance),
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
    
    const user = userResult.rows[0];
    const currentBalance = parseFloat(user.balance);
    
    // Проверяем баланс
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        balance: currentBalance
      });
    }

    // Списываем ставку
    const newBalance = currentBalance - amount;
    
    await pool.query(
      'UPDATE users SET balance = $1, total_wagered = total_wagered + $2, games_played = games_played + 1 WHERE id = $3',
      [newBalance, amount, user.id]
    );

    // Обновляем сессию
    await pool.query(
      'UPDATE game_sessions SET bet_amount = bet_amount + $1 WHERE id = $2',
      [amount, session.id]
    );

    // Создаем транзакцию
    const txResult = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, description, round_id)
       VALUES ($1, 'bet', $2, 'RUB', 'completed', $3, $4) RETURNING id`,
      [user.id, -amount, `Ставка в игре`, game_round_id]
    );

    // Начисляем VIP очки: 1 очко за каждые ₽100 ставки
    const loyaltyPoints = Math.floor(amount / 100);
    if (loyaltyPoints > 0) {
      await pool.query(
        'UPDATE users SET vip_points = COALESCE(vip_points, 0) + $1 WHERE id = $2',
        [loyaltyPoints, user.id]
      );
      const levelUp = await updateVipLevel(pool, user.id);
      if (levelUp) {
        console.log(`🏆 ${user.username} повысил VIP до ${levelUp.name}!`);
      }
    }

    console.log(`🎲 Ставка ${amount}₽ от ${user.username}. Новый баланс: ${newBalance}₽`);
    
    res.json({
      success: true,
      balance: newBalance,
      currency: 'RUB',
      transaction_id: txResult.rows[0].id.toString()
    });

  } catch (error) {
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
    
    const user = userResult.rows[0];
    const currentBalance = parseFloat(user.balance);
    
    // Добавляем выигрыш
    const newBalance = currentBalance + amount;
    
    await pool.query(
      'UPDATE users SET balance = $1 WHERE id = $2',
      [newBalance, user.id]
    );

    // Обновляем сессию
    await pool.query(
      'UPDATE game_sessions SET win_amount = win_amount + $1 WHERE id = $2',
      [amount, session.id]
    );

    // Создаем транзакцию
    const txResult = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, description, round_id)
       VALUES ($1, 'win', $2, 'RUB', 'completed', $3, $4) RETURNING id`,
      [user.id, amount, `Выигрыш в игре`, game_round_id]
    );

    console.log(`🎉 Выигрыш ${amount}₽ для ${user.username}. Новый баланс: ${newBalance}₽`);
    
    res.json({
      success: true,
      balance: newBalance,
      currency: 'RUB',
      transaction_id: txResult.rows[0].id.toString()
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
    
    const user = userResult.rows[0];
    const currentBalance = parseFloat(user.balance);
    
    // Возвращаем ставку
    const newBalance = currentBalance + amount;
    
    await pool.query(
      'UPDATE users SET balance = $1 WHERE id = $2',
      [newBalance, user.id]
    );

    // Создаем транзакцию отмены
    const txResult = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, description)
       VALUES ($1, 'cancel', $2, 'RUB', 'completed', 'Отмена ставки') RETURNING id`,
      [user.id, amount]
    );

    console.log(`🔄 Отмена ставки ${amount}₽ для ${user.username}. Новый баланс: ${newBalance}₽`);
    
    res.json({
      success: true,
      balance: newBalance,
      currency: 'RUB',
      transaction_id: txResult.rows[0].id.toString()
    });

  } catch (error) {
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
