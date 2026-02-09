require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const referral = require('./referral');
const giveaway = require('./giveaway');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID || '@aurex_casino';
const CHANNEL_LINK = process.env.CHANNEL_LINK || 'https://t.me/aurex_casino';
const BOOST_LINK = process.env.BOOST_LINK || 'https://t.me/boost/aurex_casino';
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean);
const BOT_USERNAME = process.env.BOT_USERNAME || 'aurex_giveaway_bot';

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не указан в .env!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Делаем начальных админов
ADMIN_IDS.forEach(id => {
  const user = referral.findByTelegramId(id);
  if (user) referral.setAdmin(id, true);
});

// =============================================
// ХЕЛПЕРЫ
// =============================================

function getUserName(user) {
  if (user.username) return `@${user.username}`;
  return user.first_name || 'Участник';
}

function formatTickets(count) {
  return `🎫 ${count} ${declOfNum(count, ['билет', 'билета', 'билетов'])}`;
}

function declOfNum(n, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[(n % 100 > 4 && n % 100 < 20) ? 2 : cases[Math.min(n % 10, 5)]];
}

function getReferralLink(code) {
  return `https://t.me/${BOT_USERNAME}?start=ref_${code}`;
}

function isAdmin(ctx) {
  return ADMIN_IDS.includes(ctx.from.id) || referral.isAdmin(ctx.from.id);
}

/** Безопасная отправка с HTML */
async function safeReply(ctx, text, extra = {}) {
  try {
    return await ctx.reply(text, { parse_mode: 'HTML', ...extra });
  } catch (e) {
    console.error('Reply error:', e.message);
    // Фоллбэк — отправляем без форматирования
    return await ctx.reply(text.replace(/<[^>]+>/g, ''), extra).catch(() => {});
  }
}

// =============================================
// ПРОВЕРКА ПОДПИСКИ НА КАНАЛ
// =============================================

async function checkChannelSubscription(ctx) {
  try {
    const member = await ctx.telegram.getChatMember(CHANNEL_ID, ctx.from.id);
    const isSubscribed = ['creator', 'administrator', 'member', 'restricted'].includes(member.status);
    return isSubscribed;
  } catch (e) {
    console.log('Ошибка проверки подписки:', e.message);
    return true;
  }
}

async function sendSubscribeMessage(ctx) {
  await ctx.reply(
    `⛔ <b>Для участия нужно подписаться на канал!</b>\n\n` +
    `1️⃣ Подпишись на наш канал 👇\n` +
    `2️⃣ Вернись сюда и нажми <b>«✅ Я подписался»</b>\n\n` +
    `Без подписки участие в розыгрыше невозможно.`,
    {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📢 Подписаться на канал', CHANNEL_LINK)],
        [Markup.button.callback('✅ Я подписался', 'check_subscription')]
      ])
    }
  );
}

// Кнопка «Я подписался» — повторная проверка
bot.action('check_subscription', async (ctx) => {
  const isSubscribed = await checkChannelSubscription(ctx);

  if (isSubscribed) {
    const user = referral.findByTelegramId(ctx.from.id);
    if (user) {
      const db = require('./database');
      db.prepare(`UPDATE users SET joined_channel = 1 WHERE telegram_id = ?`).run(ctx.from.id);
    }

    await ctx.answerCbQuery('✅ Подписка подтверждена!');
    await ctx.deleteMessage().catch(() => {});

    await ctx.reply(
      `✅ <b>Отлично! Подписка подтверждена!</b>\n\n` +
      `🎫 Теперь ты полноценный участник.\n` +
      `Выбирай действие 👇`,
      { parse_mode: 'HTML', ...mainKeyboard(ctx.from.id) }
    );
  } else {
    await ctx.answerCbQuery('❌ Ты ещё не подписался!', { show_alert: true });
  }
});

// =============================================
// ПРОВЕРКА БУСТА КАНАЛА (Реальная через API)
// =============================================

async function checkUserBoost(ctx) {
  try {
    const result = await ctx.telegram.callApi('getUserChatBoosts', {
      chat_id: CHANNEL_ID,
      user_id: ctx.from.id
    });

    if (result && result.boosts && result.boosts.length > 0) {
      return { boosted: true, boostCount: result.boosts.length };
    }
    return { boosted: false, boostCount: 0 };
  } catch (e) {
    console.log('Ошибка проверки буста:', e.message);
    return { boosted: false, boostCount: 0, error: true };
  }
}

// =============================================
// /START — Регистрация с проверкой подписки
// =============================================

bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const payload = ctx.startPayload;

  const isSubscribed = await checkChannelSubscription(ctx);

  let refCode = null;
  if (payload && payload.startsWith('ref_')) {
    refCode = payload.replace('ref_', '');
  }

  const { user, isNew, referrerId } = referral.registerUser({
    telegramId,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
    referralCode: refCode
  });

  if (ADMIN_IDS.includes(telegramId) && !user.is_admin) {
    referral.setAdmin(telegramId, true);
  }

  // Если НЕ подписан — требуем подписку
  if (!isSubscribed) {
    if (isNew && referrerId) {
      const referrer = require('./database').prepare(`SELECT * FROM users WHERE id = ?`).get(referrerId);
      if (referrer) {
        try {
          await ctx.telegram.sendMessage(referrer.telegram_id,
            `🔔 <b>Новый друг!</b>\n\n` +
            `${getUserName(ctx.from)} зашёл по твоей ссылке!\n\n` +
            `🎫 <b>Тебе начислено: +1 билет</b>\n` +
            `💰 <b>Твой баланс: ${formatTickets(referrer.tickets)}</b>\n\n` +
            `<i>Твои шансы на iPhone 17 Pro Max выросли!</i>`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.log('Не удалось уведомить реферера:', e.message);
        }
      }
    }

    await ctx.reply(
      `🎰 <b>Добро пожаловать в AUREX GIVEAWAY!</b>\n\n` +
      `💎 Мы разыгрываем:\n` +
      `🥇 iPhone 17 Pro Max\n` +
      `🥈 PlayStation 5 Pro\n` +
      `🥉 $500 USDT\n\n` +
      `⚠️ <b>Для участия подпишись на наш канал:</b>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.url('📢 Подписаться на AUREX', CHANNEL_LINK)],
          [Markup.button.callback('✅ Я подписался', 'check_subscription')]
        ])
      }
    );
    return;
  }

  // Подписан — обновляем статус и показываем меню
  const db = require('./database');
  db.prepare(`UPDATE users SET joined_channel = 1 WHERE telegram_id = ?`).run(telegramId);

  if (isNew) {
    if (referrerId) {
      const referrer = db.prepare(`SELECT * FROM users WHERE id = ?`).get(referrerId);
      if (referrer) {
        try {
          await ctx.telegram.sendMessage(referrer.telegram_id,
            `🔔 <b>Новый друг!</b>\n\n` +
            `${getUserName(ctx.from)} зашёл по твоей ссылке!\n\n` +
            `🎫 <b>Тебе начислено: +1 билет</b>\n` +
            `💰 <b>Твой баланс: ${formatTickets(referrer.tickets)}</b>\n\n` +
            `<i>Твои шансы на iPhone 17 Pro Max только что выросли! Зови ещё!</i>`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.log('Не удалось уведомить реферера:', e.message);
        }
      }
    }

    await ctx.reply(
      `🎰 <b>Добро пожаловать в AUREX GIVEAWAY!</b>\n\n` +
      `✅ Подписка подтверждена!\n` +
      `🎫 Ты получил свой первый <b>билет</b>!\n\n` +
      `💎 <b>Чем больше билетов — тем выше шанс выиграть:</b>\n` +
      `🥇 iPhone 17 Pro Max\n` +
      `🥈 PlayStation 5 Pro\n` +
      `🥉 $500 USDT\n\n` +
      `📊 <b>Как заработать ещё билеты:</b>\n` +
      `• Пригласи друга → <b>+1 🎫</b>\n` +
      `• Репост в сторис → <b>+5 🎫</b>\n` +
      `• Буст канала → <b>+5 🎫</b>\n\n` +
      `👇 Жми кнопки ниже!`,
      { parse_mode: 'HTML', ...mainKeyboard(telegramId) }
    );
  } else {
    const updatedUser = referral.findByTelegramId(telegramId);
    await ctx.reply(
      `С возвращением, <b>${updatedUser.first_name || ctx.from.first_name}</b>! 🎰\n\n` +
      `${formatTickets(updatedUser.tickets)}\n\n` +
      `👇 Выбери действие:`,
      { parse_mode: 'HTML', ...mainKeyboard(telegramId) }
    );
  }
});

// =============================================
// MIDDLEWARE: Проверка подписки на каждое действие
// =============================================

async function subscriptionGuard(ctx, next) {
  if (isAdmin(ctx)) return next();

  const isSubscribed = await checkChannelSubscription(ctx);
  if (!isSubscribed) {
    await sendSubscribeMessage(ctx);
    return;
  }

  return next();
}

// =============================================
// ГЛАВНОЕ МЕНЮ (Клавиатура)
// =============================================

function mainKeyboard(telegramId) {
  const rows = [
    ['🎫 Мои билеты', '🔗 Пригласить друга'],
    ['🎁 Розыгрыш', '🏆 ТОП участников'],
    ['⚡ Буст канала', '📱 Репост в сторис'],
    ['📜 История билетов', '📢 Канал AUREX']
  ];

  if (ADMIN_IDS.includes(telegramId) || referral.isAdmin(telegramId)) {
    rows.push(['👑 Админ-панель']);
  }

  return Markup.keyboard(rows).resize();
}

function adminKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Статистика', 'admin_stats')],
    [Markup.button.callback('🎁 Создать розыгрыш', 'admin_create_giveaway')],
    [Markup.button.callback('🚀 Запустить розыгрыш', 'admin_start_giveaway')],
    [Markup.button.callback('🏆 Выбрать победителей', 'admin_pick_winners')],
    [Markup.button.callback('📨 Рассылка', 'admin_broadcast')],
    [Markup.button.callback('🎫 Начислить билеты', 'admin_add_tickets')]
  ]);
}

// =============================================
// МОИ БИЛЕТЫ
// =============================================

bot.hears('🎫 Мои билеты', subscriptionGuard, (ctx) => {
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.reply('Нажми /start для регистрации');

  const refCount = referral.getReferralCount(user.id);
  const refLink = getReferralLink(user.referral_code);

  safeReply(ctx,
    `🎫 <b>ТВОИ БИЛЕТЫ</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🎫 Баланс: <b>${user.tickets} ${declOfNum(user.tickets, ['билет', 'билета', 'билетов'])}</b>\n` +
    `👥 Друзей приведено: <b>${refCount}</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 <b>Как заработать ещё:</b>\n` +
    `├ 👤 Пригласи друга → <b>+1 🎫</b>\n` +
    `├ 📱 Репост в сторис → <b>+5 🎫</b>\n` +
    `└ ⚡ Забусти канал → <b>+5 🎫</b>\n\n` +
    `🔗 <b>Твоя ссылка:</b>\n` +
    `<code>${refLink}</code>\n\n` +
    `<i>Каждый друг — это +1 билет к твоему шансу!</i>`
  );
});

// =============================================
// ПРИГЛАСИТЬ ДРУГА
// =============================================

bot.hears('🔗 Пригласить друга', subscriptionGuard, (ctx) => {
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.reply('Нажми /start для регистрации');

  const refLink = getReferralLink(user.referral_code);
  const refCount = referral.getReferralCount(user.id);

  safeReply(ctx,
    `🔗 <b>ПРИГЛАСИ ДРУГА — ПОЛУЧИ БИЛЕТ!</b>\n\n` +
    `За каждого друга ты получаешь <b>+1 🎫 билет</b>.\n\n` +
    `👥 Ты уже привёл: <b>${refCount}</b> друзей\n` +
    `🎫 Заработано с рефералов: <b>${refCount}</b> билетов\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `📎 <b>Твоя личная ссылка (жми и копируй):</b>\n\n` +
    `<code>${refLink}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `<i>Кинь в чат друзьям, в сторис, в комменты — каждый переход = билет!</i>`,
    Markup.inlineKeyboard([
      [Markup.button.url('📢 Поделиться', `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('🎰 AUREX Casino разыгрывает iPhone 17 Pro Max! Заходи, бесплатно участвуй 👇')}`)]
    ])
  );
});

// =============================================
// РОЗЫГРЫШ — УЧАСТВОВАТЬ
// =============================================

bot.hears('🎁 Розыгрыш', subscriptionGuard, (ctx) => {
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.reply('Нажми /start для регистрации');

  const active = giveaway.getActiveGiveaway();
  if (!active) {
    return safeReply(ctx,
      `🎁 <b>Сейчас нет активных розыгрышей</b>\n\n` +
      `Следи за каналом — скоро запустим!\n` +
      `А пока — собирай билеты! 🎫`
    );
  }

  const prizes = JSON.parse(active.prizes);
  const participantCount = giveaway.getParticipantCount(active.id);

  let prizesText = prizes.map((p, i) => {
    const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
    return `${medals[i] || '🎁'} <b>${i + 1} место:</b> ${p}`;
  }).join('\n');

  safeReply(ctx,
    `🎁 <b>${active.title}</b>\n\n` +
    `${active.description || ''}\n\n` +
    `🏆 <b>Призы:</b>\n${prizesText}\n\n` +
    `👥 Участников: <b>${participantCount}</b>\n` +
    `🎫 Твоих билетов: <b>${user.tickets}</b>\n\n` +
    `👇 Нажми кнопку, чтобы участвовать!`,
    Markup.inlineKeyboard([
      [Markup.button.callback('🎰 УЧАСТВУЮ!', `join_giveaway_${active.id}`)],
      [Markup.button.callback('📊 Мои шансы', `my_chances_${active.id}`)]
    ])
  );
});

// Кнопка "Участвую"
bot.action(/join_giveaway_(\d+)/, async (ctx) => {
  const isSubscribed = await checkChannelSubscription(ctx);
  if (!isSubscribed) {
    return ctx.answerCbQuery('❌ Сначала подпишись на канал!', { show_alert: true });
  }

  const giveawayId = parseInt(ctx.match[1]);
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.answerCbQuery('Нажми /start для регистрации');

  const result = giveaway.joinGiveaway(giveawayId, user.id);

  if (result.success) {
    ctx.answerCbQuery('✅ Ты участвуешь!');
    safeReply(ctx,
      `✅ <b>Ты в деле!</b>\n\n` +
      `🎫 Твоих билетов: <b>${user.tickets}</b>\n` +
      `Чем больше билетов — тем выше шанс победить!\n\n` +
      `🔗 Приглашай друзей, чтобы увеличить шансы!`
    );
  } else {
    ctx.answerCbQuery(result.error);
  }
});

// Кнопка "Мои шансы"
bot.action(/my_chances_(\d+)/, (ctx) => {
  const giveawayId = parseInt(ctx.match[1]);
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.answerCbQuery('Нажми /start для регистрации');

  const participants = giveaway.getParticipants(giveawayId);
  const totalTickets = participants.reduce((sum, p) => sum + p.tickets, 0);
  const myChance = totalTickets > 0 ? ((user.tickets / totalTickets) * 100).toFixed(2) : 0;
  const myRank = participants.findIndex(p => p.telegram_id === ctx.from.id) + 1;

  ctx.answerCbQuery();
  safeReply(ctx,
    `📊 <b>ТВОИ ШАНСЫ</b>\n\n` +
    `🎫 Твоих билетов: <b>${user.tickets}</b>\n` +
    `🎰 Шанс на главный приз: <b>${myChance}%</b>\n` +
    `📈 Место в рейтинге: <b>${myRank || '—'}</b> из ${participants.length}\n` +
    `🎫 Всего билетов в пуле: <b>${totalTickets}</b>\n\n` +
    `<i>Пригласи ещё друзей, чтобы поднять шансы!</i>`
  );
});

// =============================================
// ТОП УЧАСТНИКОВ
// =============================================

bot.hears('🏆 ТОП участников', subscriptionGuard, (ctx) => {
  const top = referral.getTopUsers(10);
  const user = referral.findByTelegramId(ctx.from.id);

  if (top.length === 0) {
    return ctx.reply('Пока нет участников с билетами. Будь первым! 🔥');
  }

  let text = `🏆 <b>ТОП-10 УЧАСТНИКОВ (по билетам)</b>\n\n`;
  const medals = ['🥇', '🥈', '🥉'];

  top.forEach((t, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const name = t.username ? `@${t.username}` : (t.first_name || 'User');
    text += `${medal} ${name} — <b>${t.tickets}</b> 🎫 (${t.referrals} друзей)\n`;
  });

  if (user) {
    const myRank = top.findIndex(t => t.telegram_id === ctx.from.id);
    text += `\n━━━━━━━━━━━━━━━━━━\n`;
    text += `📍 <b>Ты:</b> ${formatTickets(user.tickets)}`;
    if (myRank === -1) text += ` (не в ТОП-10)`;
    text += `\n\n<i>Приглашай друзей, чтобы подняться в топе!</i>`;
  }

  safeReply(ctx, text);
});

// =============================================
// ИСТОРИЯ БИЛЕТОВ
// =============================================

bot.hears('📜 История билетов', subscriptionGuard, (ctx) => {
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.reply('Нажми /start для регистрации');

  const history = referral.getTicketHistory(user.id);

  if (history.length === 0) {
    return safeReply(ctx,
      `📜 <b>История билетов</b>\n\n` +
      `У тебя пока только стартовый билет.\n` +
      `Приглашай друзей, чтобы заработать ещё! 🔗`
    );
  }

  const reasonNames = {
    registration: '📝 Регистрация',
    referral: '👤 Друг пришёл',
    boost: '⚡ Буст канала',
    bonus: '🎁 Бонус',
    admin: '👑 От админа',
    screenshot: '📱 Скриншот сторис'
  };

  let text = `📜 <b>ИСТОРИЯ БИЛЕТОВ</b>\n\n`;
  text += `💰 Баланс: <b>${formatTickets(user.tickets)}</b>\n\n`;

  history.forEach(h => {
    const reason = reasonNames[h.reason] || h.reason;
    const relatedName = h.related_username ? ` (@${h.related_username})` : (h.related_first_name ? ` (${h.related_first_name})` : '');
    const date = new Date(h.created_at).toLocaleDateString('ru-RU');
    text += `${reason} → <b>+${h.amount}</b> 🎫${relatedName} <i>(${date})</i>\n`;
  });

  safeReply(ctx, text);
});

// =============================================
// КАНАЛ
// =============================================

bot.hears('📢 Канал AUREX', (ctx) => {
  safeReply(ctx,
    `📢 <b>Официальный канал AUREX Casino</b>\n\n` +
    `Следи за новостями, розыгрышами и акциями!\n` +
    `Подписчики первыми узнают о запуске 🚀`,
    Markup.inlineKeyboard([
      [Markup.button.url('📢 Открыть канал', CHANNEL_LINK)]
    ])
  );
});

// =============================================
// ⚡ БУСТ КАНАЛА (кнопка + команда)
// =============================================

async function handleBoost(ctx) {
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.reply('Нажми /start для регистрации');

  const db = require('./database');
  const existingBoost = db.prepare(`SELECT * FROM channel_boosts WHERE user_id = ?`).get(user.id);
  if (existingBoost) {
    return safeReply(ctx,
      `⚡ Ты уже получил бонус за буст!\n` +
      `🎫 Твой баланс: ${formatTickets(user.tickets)}`
    );
  }

  const boostResult = await checkUserBoost(ctx);

  if (boostResult.error) {
    return safeReply(ctx,
      `⚡ <b>БОНУС ЗА БУСТ КАНАЛА (+5 🎫)</b>\n\n` +
      `Нажми кнопку ниже, чтобы забустить канал.\n` +
      `После буста отправь сюда <b>скриншот</b> с подписью: <b>буст</b>\n\n` +
      `Модерация проверит и начислит +5 билетов.`,
      Markup.inlineKeyboard([
        [Markup.button.url('🚀 Забустить канал', BOOST_LINK)],
        [Markup.button.callback('🔄 Я забустил — проверить', 'recheck_boost')]
      ])
    );
  }

  if (boostResult.boosted) {
    const result = referral.processBoost(ctx.from.id);
    safeReply(ctx,
      `⚡ <b>БУСТ ПОДТВЕРЖДЁН АВТОМАТИЧЕСКИ!</b> ✅\n\n` +
      `Мы проверили через Telegram — ты реально забустил канал!\n\n` +
      `🎫 Тебе начислено: <b>+${result.bonus} билетов</b>\n` +
      `💰 Твой баланс: <b>${formatTickets(result.tickets)}</b>\n\n` +
      `<i>Спасибо за буст!</i> 💎`
    );
  } else {
    safeReply(ctx,
      `❌ <b>Буст не найден!</b>\n\n` +
      `Мы проверили — ты ещё не бустил канал.\n` +
      `Нажми кнопку ниже, чтобы забустить 👇\n\n` +
      `<i>После буста нажми «Я забустил — проверить»</i>`,
      Markup.inlineKeyboard([
        [Markup.button.url('🚀 Забустить канал', BOOST_LINK)],
        [Markup.button.callback('🔄 Я забустил — проверить', 'recheck_boost')]
      ])
    );
  }
}

bot.command('boost', (ctx) => handleBoost(ctx));
bot.hears('⚡ Буст канала', subscriptionGuard, (ctx) => handleBoost(ctx));

// Повторная проверка буста
bot.action('recheck_boost', async (ctx) => {
  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.answerCbQuery('Нажми /start');

  const db = require('./database');
  const existingBoost = db.prepare(`SELECT * FROM channel_boosts WHERE user_id = ?`).get(user.id);
  if (existingBoost) {
    return ctx.answerCbQuery('✅ Ты уже получил бонус за буст!');
  }

  const boostResult = await checkUserBoost(ctx);

  if (boostResult.boosted) {
    const result = referral.processBoost(ctx.from.id);
    ctx.answerCbQuery('✅ Буст подтверждён! +5 билетов');
    safeReply(ctx,
      `⚡ <b>БУСТ ПОДТВЕРЖДЁН!</b> ✅\n\n` +
      `🎫 Тебе начислено: <b>+${result.bonus} билетов</b>\n` +
      `💰 Твой баланс: <b>${formatTickets(result.tickets)}</b>`
    );
  } else {
    ctx.answerCbQuery('❌ Буст пока не найден. Попробуй позже.', { show_alert: true });
  }
});

// =============================================
// 📱 СКРИНШОТ СТОРИС (кнопка + команда)
// =============================================

function handleScreenshot(ctx) {
  safeReply(ctx,
    `📱 <b>БОНУС ЗА РЕПОСТ В СТОРИС (+5 🎫)</b>\n\n` +
    `📝 <b>Инструкция:</b>\n` +
    `1. Сделай репост нашего поста из канала @aurex_casino в свои <b>сторис</b>\n` +
    `2. Подожди пока сторис опубликуется\n` +
    `3. Сделай <b>скриншот</b> своего сторис\n` +
    `4. Отправь скриншот <b>прямо сюда</b> в чат бота\n\n` +
    `⚠️ <b>Требования:</b>\n` +
    `• На скриншоте должен быть виден ваш ник\n` +
    `• Сторис должна быть публичной\n` +
    `• Один бонус на человека\n\n` +
    `👨‍💼 <b>Как проходит проверка:</b>\n` +
    `Модератор получит ваш скриншот, перейдёт в ваш профиль, проверит сторис и начислит <b>+5 билетов</b> ✅`
  );
}

bot.command('screenshot', subscriptionGuard, (ctx) => handleScreenshot(ctx));
bot.hears('📱 Репост в сторис', subscriptionGuard, (ctx) => handleScreenshot(ctx));

// Обработка фото (скриншоты)
bot.on('photo', async (ctx) => {
  if (isAdmin(ctx)) return;

  const isSubscribed = await checkChannelSubscription(ctx);
  if (!isSubscribed) {
    return sendSubscribeMessage(ctx);
  }

  const user = referral.findByTelegramId(ctx.from.id);
  if (!user) return ctx.reply('Нажми /start для регистрации');

  const caption = (ctx.message.caption || '').toLowerCase();
  const isBoostScreenshot = caption.includes('буст') || caption.includes('boost');
  const ticketAmount = 5;
  const ticketReason = isBoostScreenshot ? 'boost' : 'screenshot';
  const typeLabel = isBoostScreenshot ? '⚡ Буст канала' : '📱 Скриншот сторис';

  const profileLink = ctx.from.username
    ? `https://t.me/${ctx.from.username}`
    : null;

  // Уведомляем всех админов
  for (const adminId of ADMIN_IDS) {
    try {
      const adminButtons = [];

      if (profileLink) {
        adminButtons.push([Markup.button.url('👁 Проверить сторис → @' + ctx.from.username, profileLink)]);
      }

      adminButtons.push([
        Markup.button.callback(`✅ Одобрить (+${ticketAmount} 🎫)`, `approve_${ticketReason}_${ctx.from.id}`),
        Markup.button.callback('❌ Отклонить', `reject_${ticketReason}_${ctx.from.id}`)
      ]);

      await ctx.telegram.sendPhoto(adminId, ctx.message.photo[ctx.message.photo.length - 1].file_id, {
        caption:
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `${typeLabel} — <b>МОДЕРАЦИЯ</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `👤 <b>Пользователь:</b> ${ctx.from.first_name || 'Без имени'}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}\n` +
          `🆔 <b>Telegram ID:</b> <code>${ctx.from.id}</code>\n` +
          `📎 <b>Username:</b> ${ctx.from.username ? '@' + ctx.from.username : '❌ нет username'}\n` +
          `🎫 <b>Текущий баланс:</b> ${user.tickets} билетов\n` +
          `📝 <b>Подпись к фото:</b> ${ctx.message.caption || '(без подписи)'}\n\n` +
          `${profileLink ? '👆 <b>Нажми кнопку выше, перейди в профиль и проверь сторис!</b>' : '⚠️ <b>У пользователя нет username — проверка сторис невозможна, решай по скриншоту.</b>'}\n\n` +
          `Если всё ок — нажми «Одобрить»`,
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(adminButtons)
      });
    } catch (e) {
      console.log('Не удалось отправить скрин админу:', e.message);
    }
  }

  safeReply(ctx,
    `📱 <b>Скриншот получен!</b>\n\n` +
    `📋 Тип: <b>${typeLabel}</b>\n` +
    `⏳ Модерация проверит ваш скриншот и начислит билеты.\n\n` +
    `Обычно это занимает несколько минут. Мы пришлём уведомление! 🔔`
  );
});

// Одобрение скриншота сторис
bot.action(/approve_screenshot_(\d+)/, (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');

  const targetId = parseInt(ctx.match[1]);
  const user = referral.findByTelegramId(targetId);
  if (!user) return ctx.answerCbQuery('Пользователь не найден');

  const db = require('./database');
  const alreadyGot = db.prepare(
    `SELECT * FROM ticket_log WHERE user_id = ? AND reason = 'screenshot'`
  ).get(user.id);

  if (alreadyGot) {
    ctx.answerCbQuery('⚠️ Этот пользователь уже получал бонус за сторис!', { show_alert: true });
    ctx.editMessageCaption(`⚠️ ДУБЛИКАТ! Пользователь ${targetId} уже получал +5 за сторис ранее. Повторно не начислено.`);
    return;
  }

  const newTotal = referral.addTicketsByTelegramId(targetId, 5, 'screenshot');

  ctx.answerCbQuery('✅ Начислено +5 билетов');
  ctx.editMessageCaption(`✅ ОДОБРЕНО!\n+5 🎫 → пользователю ${targetId}\nНовый баланс: ${newTotal} 🎫`);

  ctx.telegram.sendMessage(targetId,
    `🎉 <b>Сторис проверена и одобрена!</b>\n\n` +
    `🎫 Вам начислено: <b>+5 билетов</b>\n` +
    `💰 Ваш баланс: <b>${formatTickets(newTotal)}</b>\n\n` +
    `<i>Спасибо за репост! Продолжай собирать билеты!</i> 💎`,
    { parse_mode: 'HTML' }
  ).catch(() => {});
});

// Одобрение буста (ручное)
bot.action(/approve_boost_(\d+)/, (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');

  const targetId = parseInt(ctx.match[1]);
  const user = referral.findByTelegramId(targetId);
  if (!user) return ctx.answerCbQuery('Пользователь не найден');

  const result = referral.processBoost(targetId);
  if (!result) return ctx.answerCbQuery('Ошибка');

  if (result.alreadyBoosted) {
    return ctx.answerCbQuery('Уже получал бонус за буст');
  }

  ctx.answerCbQuery('✅ Начислено');
  ctx.editMessageCaption(`✅ Буст одобрен! +5 билетов → ${targetId}\nНовый баланс: ${result.tickets} 🎫`);

  ctx.telegram.sendMessage(targetId,
    `⚡ <b>Буст канала подтверждён!</b>\n\n` +
    `🎫 Тебе начислено: <b>+5 билетов</b>\n` +
    `💰 Твой баланс: <b>${formatTickets(result.tickets)}</b>\n\n` +
    `<i>Спасибо за поддержку!</i> 💎`,
    { parse_mode: 'HTML' }
  ).catch(() => {});
});

// Отклонение (универсальное)
bot.action(/reject_(screenshot|boost)_(\d+)/, (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');
  const type = ctx.match[1];
  const targetId = parseInt(ctx.match[2]);
  const typeLabel = type === 'boost' ? 'буст' : 'скриншот сторис';

  ctx.answerCbQuery('❌ Отклонено');
  ctx.editMessageCaption(`❌ ${typeLabel} отклонён (${targetId})`);

  ctx.telegram.sendMessage(targetId,
    `😔 К сожалению, ваш ${typeLabel} не прошёл модерацию.\n\n` +
    `<b>Возможные причины:</b>\n` +
    `• Не виден ваш ник на скриншоте\n` +
    `• Скриншот нечитаемый\n` +
    `• Повторная отправка\n\n` +
    `Попробуйте отправить новый скриншот.`,
    { parse_mode: 'HTML' }
  ).catch(() => {});
});

// =============================================
// АДМИН ПАНЕЛЬ
// =============================================

bot.command('admin', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Нет доступа');

  ctx.reply(
    `👑 <b>АДМИН-ПАНЕЛЬ AUREX GIVEAWAY</b>\n\nВыбери действие:`,
    { parse_mode: 'HTML', ...adminKeyboard() }
  );
});

bot.hears('👑 Админ-панель', (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('❌ Нет доступа');

  ctx.reply(
    `👑 <b>АДМИН-ПАНЕЛЬ AUREX GIVEAWAY</b>\n\nВыбери действие:`,
    { parse_mode: 'HTML', ...adminKeyboard() }
  );
});

// Статистика
bot.action('admin_stats', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');

  try {
    const stats = giveaway.getStats();
    const db = require('./database');
    const subscribedCount = db.prepare(`SELECT COUNT(*) as c FROM users WHERE joined_channel = 1`).get().c;
    ctx.answerCbQuery();

    let text = `📊 <b>СТАТИСТИКА</b>\n\n` +
      `👥 Всего пользователей: <b>${stats.totalUsers}</b>\n` +
      `✅ Подписаны на канал: <b>${subscribedCount}</b>\n` +
      `🎫 Всего билетов выдано: <b>${stats.totalTickets}</b>\n`;

    if (stats.activeGiveaway) {
      text += `\n🎁 Активный розыгрыш: <b>${stats.activeGiveaway.title}</b>\n`;
      text += `👥 Участников: <b>${stats.activeParticipants}</b>\n`;
    } else {
      text += `\n🎁 Нет активных розыгрышей\n`;
    }

    if (stats.topUsers.length > 0) {
      text += `\n🏆 <b>ТОП участников (по билетам):</b>\n`;
      stats.topUsers.slice(0, 10).forEach((t, i) => {
        const name = t.username ? `@${t.username}` : (t.first_name || 'User');
        text += `${i + 1}. ${name} — <b>${t.tickets} 🎫</b> (${t.referrals} друзей)\n`;
      });
    }

    await ctx.reply(text, { parse_mode: 'HTML' });
  } catch (e) {
    console.error('Stats error:', e.message);
    ctx.reply('❌ Ошибка загрузки статистики: ' + e.message);
  }
});

// Создание розыгрыша
bot.action('admin_create_giveaway', (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');
  ctx.answerCbQuery();

  ctx.reply(
    `🎁 <b>СОЗДАНИЕ РОЗЫГРЫША</b>\n\n` +
    `Отправь данные в формате:\n\n` +
    `/newgiveaway Название\n` +
    `Описание розыгрыша\n` +
    `Приз 1\n` +
    `Приз 2\n` +
    `Приз 3\n\n` +
    `<b>Пример:</b>\n` +
    `/newgiveaway AUREX GENESIS\n` +
    `Главный розыгрыш в честь открытия!\n` +
    `iPhone 17 Pro Max 1TB\n` +
    `PlayStation 5 Pro\n` +
    `$500 USDT`,
    { parse_mode: 'HTML' }
  );
});

bot.command('newgiveaway', (ctx) => {
  if (!isAdmin(ctx)) return;

  const lines = ctx.message.text.split('\n');
  const titleLine = lines[0].replace('/newgiveaway ', '').trim();
  const description = lines[1] || '';
  const prizes = lines.slice(2).filter(l => l.trim());

  if (!titleLine || prizes.length === 0) {
    return ctx.reply('❌ Неверный формат. Нужно название + минимум 1 приз.');
  }

  const id = giveaway.createGiveaway({
    title: titleLine,
    description,
    prizes,
    channelId: CHANNEL_ID,
    endDate: null,
    maxParticipants: null
  });

  ctx.reply(
    `✅ <b>Розыгрыш создан!</b>\n\n` +
    `📝 Название: <b>${titleLine}</b>\n` +
    `🎁 Призов: <b>${prizes.length}</b>\n` +
    `🆔 ID: <b>${id}</b>\n` +
    `📌 Статус: <b>Черновик</b>\n\n` +
    `Чтобы запустить: /startgiveaway ${id}`,
    { parse_mode: 'HTML' }
  );
});

// Запуск розыгрыша
bot.action('admin_start_giveaway', (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');
  ctx.answerCbQuery();

  const all = giveaway.getAllGiveaways();
  const drafts = all.filter(g => g.status === 'draft');

  if (drafts.length === 0) {
    return ctx.reply('Нет черновиков. Сначала создай розыгрыш.');
  }

  let text = `🚀 <b>Черновики:</b>\n\n`;
  drafts.forEach(d => {
    text += `🆔 ${d.id} — <b>${d.title}</b>\nЗапустить: /startgiveaway ${d.id}\n\n`;
  });

  ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('startgiveaway', (ctx) => {
  if (!isAdmin(ctx)) return;
  const id = parseInt(ctx.message.text.split(' ')[1]);
  if (!id) return ctx.reply('Укажи ID: /startgiveaway 1');

  const g = giveaway.getGiveaway(id);
  if (!g) return ctx.reply('Розыгрыш не найден');
  if (g.status === 'active') return ctx.reply('Уже запущен!');

  giveaway.startGiveaway(id);
  ctx.reply(`🚀 <b>Розыгрыш "${g.title}" ЗАПУЩЕН!</b>\n\nТеперь участники могут нажать «🎁 Розыгрыш» для участия.`, { parse_mode: 'HTML' });
});

// Выбор победителей
bot.action('admin_pick_winners', (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');
  ctx.answerCbQuery();

  const active = giveaway.getActiveGiveaway();
  if (!active) return ctx.reply('Нет активного розыгрыша');

  const prizes = JSON.parse(active.prizes);
  ctx.reply(
    `🏆 <b>Выбор победителей</b>\n\n` +
    `Розыгрыш: <b>${active.title}</b>\n` +
    `Призов: <b>${prizes.length}</b>\n` +
    `Участников: <b>${giveaway.getParticipantCount(active.id)}</b>\n\n` +
    `Отправь: /pickwinners ${active.id} ${prizes.length}`,
    { parse_mode: 'HTML' }
  );
});

bot.command('pickwinners', async (ctx) => {
  if (!isAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const giveawayId = parseInt(args[1]);
  const count = parseInt(args[2]) || 3;

  if (!giveawayId) return ctx.reply('Укажи: /pickwinners [ID] [Кол-во]');

  const g = giveaway.getGiveaway(giveawayId);
  if (!g) return ctx.reply('Розыгрыш не найден');

  const prizes = JSON.parse(g.prizes);
  const winners = giveaway.pickWinners(giveawayId, count);

  if (winners.length === 0) return ctx.reply('Нет участников!');

  giveaway.finishGiveaway(giveawayId);

  const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
  let text = `🏆 <b>ПОБЕДИТЕЛИ "${g.title}"</b>\n\n`;

  for (let i = 0; i < winners.length; i++) {
    const w = winners[i];
    const name = w.username ? `@${w.username}` : (w.first_name || 'User');
    const prize = prizes[i] || 'Утешительный приз';
    text += `${medals[i] || '🎁'} <b>${prize}</b>\n`;
    text += `└ ${name} (${w.tickets} 🎫)\n\n`;

    try {
      await ctx.telegram.sendMessage(w.telegram_id,
        `🎉🎉🎉 <b>ПОЗДРАВЛЯЕМ!</b> 🎉🎉🎉\n\n` +
        `Ты выиграл в розыгрыше <b>"${g.title}"</b>!\n\n` +
        `🏆 <b>Твой приз:</b> ${prize}\n\n` +
        `Напиши нам для получения приза! 💎`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      console.log(`Не удалось уведомить победителя ${w.telegram_id}:`, e.message);
    }
  }

  ctx.reply(text, { parse_mode: 'HTML' });
});

// Рассылка
bot.action('admin_broadcast', (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');
  ctx.answerCbQuery();
  ctx.reply(
    `📨 <b>РАССЫЛКА</b>\n\n` +
    `Отправь текст сообщения командой:\n` +
    `/broadcast Текст сообщения\n\n` +
    `⚠️ Сообщение уйдёт ВСЕМ пользователям бота.`,
    { parse_mode: 'HTML' }
  );
});

bot.command('broadcast', async (ctx) => {
  if (!isAdmin(ctx)) return;

  const text = ctx.message.text.replace('/broadcast ', '').trim();
  if (!text) return ctx.reply('Укажи текст: /broadcast Привет всем!');

  const db = require('./database');
  const users = db.prepare(`SELECT telegram_id FROM users WHERE is_banned = 0`).all();
  let sent = 0;
  let failed = 0;

  await ctx.reply(`📨 Начинаю рассылку на ${users.length} пользователей...`);

  for (const u of users) {
    try {
      await ctx.telegram.sendMessage(u.telegram_id, text);
      sent++;
    } catch (e) {
      failed++;
    }
    if (sent % 30 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  ctx.reply(`✅ <b>Рассылка завершена!</b>\n\n📨 Отправлено: ${sent}\n❌ Ошибок: ${failed}`, { parse_mode: 'HTML' });
});

// Начисление билетов
bot.action('admin_add_tickets', (ctx) => {
  if (!isAdmin(ctx)) return ctx.answerCbQuery('Нет доступа');
  ctx.answerCbQuery();
  ctx.reply(
    `🎫 <b>Начисление билетов</b>\n\n` +
    `Формат: /addtickets [telegram_id] [кол-во]\n\n` +
    `Пример: /addtickets 123456789 10`,
    { parse_mode: 'HTML' }
  );
});

bot.command('addtickets', (ctx) => {
  if (!isAdmin(ctx)) return;

  const args = ctx.message.text.split(' ');
  const targetId = parseInt(args[1]);
  const amount = parseInt(args[2]) || 1;

  if (!targetId) return ctx.reply('Укажи: /addtickets [telegram_id] [кол-во]');

  const newTotal = referral.addTicketsByTelegramId(targetId, amount, 'admin');
  if (newTotal === null) return ctx.reply('❌ Пользователь не найден');

  ctx.reply(`✅ Начислено <b>${amount}</b> 🎫 пользователю ${targetId}\nНовый баланс: <b>${newTotal}</b> 🎫`, { parse_mode: 'HTML' });

  ctx.telegram.sendMessage(targetId,
    `🎁 <b>Бонус от администрации!</b>\n\n🎫 Тебе начислено: <b>+${amount} билетов</b>\n💰 Твой баланс: <b>${formatTickets(newTotal)}</b>`,
    { parse_mode: 'HTML' }
  ).catch(() => {});
});

// =============================================
// HEALTH CHECK (для Railway)
// =============================================

const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      bot: 'AUREX Giveaway Bot',
      uptime: Math.floor(process.uptime()) + 's'
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Health check server on port ${PORT}`);
});

// =============================================
// ЗАПУСК
// =============================================

bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err.message);
  if (ctx) {
    ctx.reply('⚠️ Произошла ошибка, попробуйте ещё раз.').catch(() => {});
  }
});

// Глобальная защита от крашей
process.on('uncaughtException', (err) => {
  console.error('💀 Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
  console.error('💀 Unhandled Rejection:', err.message || err);
});

bot.launch()
  .then(() => console.log('🎰 AUREX Giveaway Bot запущен!'))
  .catch(err => console.error('❌ Ошибка запуска:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
