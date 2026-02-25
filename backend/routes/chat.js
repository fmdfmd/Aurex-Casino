const express = require('express');
const router = express.Router();
const axios = require('axios');
const { auth } = require('../middleware/auth');
const pool = require('../config/database');
const telegramNotify = require('../services/telegramNotify');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'aurex-internal-key-2026';
const AI_MODEL = 'anthropic/claude-3.5-sonnet';
const MAX_HISTORY = 10;

function internalAuth(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (key !== INTERNAL_API_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

const SYSTEM_PROMPT = `Ты — Стефани, официальный AI-ассистент премиального онлайн-казино AUREX.

СТАТУС КАЗИНО:
Казино AUREX запущено и работает! Сайт доступен по адресу aurex.casino.
Игроки могут регистрироваться, играть и выигрывать.

ТВОЙ ХАРАКТЕР:
- Ты дружелюбная, умная и профессиональная девушка-ассистент.
- Общаешься легко и непринужденно, но всегда по делу.
- Используешь эмодзи уместно, но не перебарщиваешь.
- Отвечаешь на русском языке (если пользователь пишет на другом языке — отвечай на его языке).
- Ты гордишься тем, что работаешь в AUREX — лучшем казино.

ВАЖНЫЕ ПРАВИЛА:
1. НИКОГДА не давай финансовых советов и не гарантируй выигрыши.
2. Не обсуждай конкурентов и другие казино.
3. Если не знаешь точного ответа — предложи создать тикет в поддержку или написать в Telegram: @aurex_support_bot.
4. Будь краткой, но информативной. Отвечай в 2-4 предложения.
5. Не используй markdown форматирование (жирный, курсив) — только обычный текст и эмодзи.

ИНФОРМАЦИЯ О КАЗИНО AUREX:
- Лицензионные слоты от топовых провайдеров (Pragmatic Play, Evolution, Push Gaming, EvoPlay и др.)
- Мгновенные выплаты на карты (СБП, P2P) и криптовалюту (USDT, BTC, ETH)
- VIP-программа с кэшбэком до 20%
- Честные бонусы без скрытых условий
- Лицензионный софт
- Поддержка 24/7

ЧАСТЫЕ ВОПРОСЫ:
- Минимальный депозит: 500 рублей
- Минимальный вывод: 1000 рублей
- Время вывода: до 15 минут на крипту, до 24 часов на карты
- Верификация нужна для вывода от 50,000 рублей
- Вейджер на бонусы: x35
- Регистрация: через номер телефона, Google или Telegram

КОНТАКТЫ:
- Telegram бот поддержки: @aurex_support_bot
- Telegram канал: @aurex_casino
- Email: support@aurex.casino

Если не можешь помочь — предложи создать тикет в разделе "Поддержка" на сайте или написать в Telegram @aurex_support_bot.`;

const chatHistoryCache = new Map();

function getSessionHistory(sessionId) {
  if (!chatHistoryCache.has(sessionId)) {
    chatHistoryCache.set(sessionId, []);
  }
  return chatHistoryCache.get(sessionId);
}

function addToHistory(sessionId, role, content) {
  const history = getSessionHistory(sessionId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, history.length - MAX_HISTORY * 2);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of chatHistoryCache.entries()) {
    if (value._lastAccess && now - value._lastAccess > 30 * 60 * 1000) {
      chatHistoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Сообщение не может быть пустым' });
    }

    if (!OPENROUTER_API_KEY) {
      return res.json({
        success: true,
        response: 'Извините, AI-ассистент временно недоступен. Пожалуйста, создайте тикет в разделе "Поддержка" или напишите нам в Telegram: @aurex_support_bot'
      });
    }

    const sid = sessionId || `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    addToHistory(sid, 'user', message.trim());

    const history = getSessionHistory(sid);
    history._lastAccess = Date.now();

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.filter(h => typeof h === 'object' && h.role).map(h => ({
        role: h.role,
        content: h.content
      }))
    ];

    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: AI_MODEL,
      messages,
      max_tokens: 400,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aurex.casino',
        'X-Title': 'AUREX Live Chat'
      },
      timeout: 15000
    });

    const aiResponse = response.data.choices[0].message.content;

    addToHistory(sid, 'assistant', aiResponse);

    res.json({
      success: true,
      response: aiResponse,
      sessionId: sid
    });

  } catch (error) {
    console.error('Chat AI Error:', error.response?.data || error.message);
    res.json({
      success: true,
      response: 'Извините, я временно не могу обработать ваш запрос 😔 Пожалуйста, создайте тикет в разделе "Поддержка" или напишите в Telegram: @aurex_support_bot',
      sessionId: req.body.sessionId
    });
  }
});

// ===== LIVE SUPPORT: Create ticket from chat widget =====
router.post('/ticket', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const subject = 'Чат: запрос оператора';
    const text = message || 'Пользователь запросил оператора из чата';

    const ticketResult = await pool.query(
      `INSERT INTO tickets (user_id, subject, message, category, priority, status)
       VALUES ($1, $2, $3, 'live_chat', 'high', 'open') RETURNING *`,
      [req.user.id, subject, text]
    );
    const ticket = ticketResult.rows[0];

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, $2, $3, false)`,
      [ticket.id, req.user.id, text]
    );

    const userInfo = await pool.query(
      `SELECT u.id, u.username, u.email, u.phone, u.balance, u.vip_level,
              u.is_verified, u.created_at,
              (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = u.id AND type = 'deposit' AND status = 'completed') as total_deposits,
              (SELECT COUNT(*) FROM transactions WHERE user_id = u.id AND type = 'deposit' AND status = 'completed') as deposit_count,
              (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = u.id AND type = 'withdrawal' AND status = 'completed') as total_withdrawals
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    const info = userInfo.rows[0];

    telegramNotify.notifyNewChatTicket(ticket, info).catch(err => {
      console.error('Telegram chat ticket notify error:', err.message);
    });

    res.json({ success: true, ticketId: ticket.id, ticketNumber: ticket.id });
  } catch (error) {
    console.error('Create chat ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== LIVE SUPPORT: Get ticket messages (polling) =====
router.get('/ticket/:id/messages', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const after = req.query.after || '1970-01-01';

    const ticketCheck = await pool.query(
      'SELECT id, status, assigned_to, assigned_operator_name FROM tickets WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }

    const ticket = ticketCheck.rows[0];

    let operatorName = ticket.assigned_operator_name || null;
    if (!operatorName && ticket.assigned_to) {
      const opResult = await pool.query('SELECT username FROM users WHERE id = $1', [ticket.assigned_to]);
      operatorName = opResult.rows[0]?.username || 'Оператор';
    }

    const messagesResult = await pool.query(
      `SELECT id, message, is_staff, created_at FROM ticket_messages
       WHERE ticket_id = $1 AND created_at > $2
       ORDER BY created_at ASC`,
      [id, after]
    );

    res.json({
      success: true,
      status: ticket.status,
      operatorName,
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== LIVE SUPPORT: User sends message in operator mode =====
router.post('/ticket/:id/message', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Сообщение обязательно' });

    const ticketCheck = await pool.query(
      'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Тикет не найден' });
    }

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, $2, $3, false)`,
      [id, req.user.id, message]
    );

    const ticket = ticketCheck.rows[0];
    telegramNotify.notifyChatMessage(ticket, req.user, message).catch(err => {
      console.error('Telegram chat message notify error:', err.message);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== INTERNAL: Operator reply from Telegram bot =====
router.post('/internal/ticket/:id/reply', internalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, operatorName } = req.body;

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, NULL, $2, true)`,
      [id, message]
    );

    await pool.query(
      'UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Internal reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== INTERNAL: Operator takes ticket from Telegram bot =====
router.patch('/internal/ticket/:id/assign', internalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { operatorName } = req.body;

    const result = await pool.query(
      `UPDATE tickets SET status = 'in_progress', assigned_operator_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'open' RETURNING *`,
      [id, operatorName || 'Оператор']
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Тикет уже взят' });
    }

    const ticket = result.rows[0];
    const userResult = await pool.query(
      `SELECT u.id, u.username, u.email, u.phone, u.balance, u.vip_level,
              u.is_verified, u.created_at,
              (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = u.id AND type = 'deposit' AND status = 'completed') as total_deposits,
              (SELECT COUNT(*) FROM transactions WHERE user_id = u.id AND type = 'deposit' AND status = 'completed') as deposit_count
       FROM users u WHERE u.id = $1`,
      [ticket.user_id]
    );

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, NULL, $2, true)`,
      [id, `Оператор ${operatorName || 'поддержки'} подключился к чату.`]
    );

    res.json({ success: true, ticket: result.rows[0], userInfo: userResult.rows[0] });
  } catch (error) {
    console.error('Internal assign error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== INTERNAL: Close ticket =====
router.patch('/internal/ticket/:id/close', internalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE tickets SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff)
       VALUES ($1, NULL, $2, true)`,
      [id, 'Оператор завершил чат. Спасибо за обращение!']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Internal close error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
