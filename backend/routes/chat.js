const express = require('express');
const router = express.Router();
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = 'anthropic/claude-3.5-sonnet';
const MAX_HISTORY = 10;

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
- Email: support@aurex.io

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

module.exports = router;
