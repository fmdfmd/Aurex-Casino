require('dotenv').config();
const { Telegraf, Markup, Input } = require('telegraf');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const db = require('./services/database');
const ai = require('./services/ai');
const keyboards = require('./keyboards');

// Stefani avatar - local file path
const STEFANI_PHOTO_PATH = path.join(__dirname, 'assets', 'stefani_aurex_support.png');

// ==================== INITIALIZE BOT ====================

const bot = new Telegraf(config.botToken);

// User state management (in-memory for speed, tickets in DB)
const userState = new Map(); // { odTelegramId: { state: 'awaiting_ticket_reason' } }
const managerReplies = new Map(); // { managerTelegramId: ticketId }

// ==================== HELPERS ====================

function isAdmin(ctx) {
  return config.adminIds.includes(ctx.from.id);
}

async function isManager(ctx) {
  return await db.isManager(ctx.from.id);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function notifyManagers(ticket, message) {
  const managers = await db.getActiveManagers();
  for (const manager of managers) {
    try {
      await bot.telegram.sendMessage(
        manager.telegram_id,
        message,
        { 
          parse_mode: 'HTML',
          ...keyboards.getTicketActions(ticket.id)
        }
      );
    } catch (e) {
      console.error(`Failed to notify manager ${manager.telegram_id}:`, e.message);
    }
  }
}

// ==================== START COMMAND ====================

bot.start(async (ctx) => {
  const isUserManager = await isManager(ctx);
  const isUserAdmin = isAdmin(ctx);
  const firstName = ctx.from.first_name || 'друг';
  
  let greeting = `Привет, <b>${escapeHtml(firstName)}</b>! 👋

Меня зовут <b>Стефани</b> — я AI-ассистент казино <b>AUREX</b> 💎

<b>Просто напиши свой вопрос прямо сюда</b> — я отвечу моментально!

Например:
• <i>"Как пополнить счёт?"</i>
• <i>"Какие бонусы есть?"</i>
• <i>"Не пришёл депозит"</i>`;

  // Только для менеджеров и админов - скрытое меню
  if (isUserManager && !isUserAdmin) {
    greeting += `\n\n🛡 /manager — панель оператора`;
  }
  
  if (isUserAdmin) {
    greeting += `\n\n👑 /admin — управление`;
  }

  // Send Stefani photo with greeting
  try {
    if (fs.existsSync(STEFANI_PHOTO_PATH)) {
      await ctx.replyWithPhoto(
        { source: STEFANI_PHOTO_PATH },
        {
          caption: greeting,
          parse_mode: 'HTML',
          ...keyboards.linksInline
        }
      );
    } else {
      // Fallback to text if photo not found
      await ctx.replyWithHTML(greeting, keyboards.linksInline);
    }
  } catch (e) {
    console.error('Photo send error:', e.message);
    // Fallback to text if photo fails
    await ctx.replyWithHTML(greeting, keyboards.linksInline);
  }
  
  await ctx.reply('Меню:', keyboards.mainMenu);
});

// ==================== FAQ HANDLERS ====================

bot.hears('❓ FAQ', async (ctx) => {
  const faqText = `📚 <b>Часто задаваемые вопросы</b>

<b>💰 Минимальный депозит:</b> 500 ₽
<b>💳 Минимальный вывод:</b> 1,000 ₽
<b>⏱ Время вывода:</b> до 15 мин (крипта), до 24ч (карты)
<b>📄 Верификация:</b> требуется для вывода от 50,000 ₽

<b>🎁 Бонусы:</b>
• Приветственный бонус до 200%
• Кэшбэк до 20% для VIP
• Еженедельные турниры

<b>🛡 Безопасность:</b>
Все игры от лицензированных провайдеров. RTP контролируется производителем, а не казино.

Остались вопросы? Просто напишите мне! 👇`;

  await ctx.replyWithHTML(faqText);
});

bot.action('faq', async (ctx) => {
  await ctx.answerCbQuery();
  const faqText = `📚 <b>Часто задаваемые вопросы</b>

<b>💰 Минимальный депозит:</b> 500 ₽
<b>💳 Минимальный вывод:</b> 1,000 ₽
<b>⏱ Время вывода:</b> до 15 мин (крипта), до 24ч (карты)
<b>📄 Верификация:</b> требуется для вывода от 50,000 ₽`;
  await ctx.replyWithHTML(faqText);
});

bot.hears('💰 Как пополнить?', async (ctx) => {
  const text = `💰 <b>Как пополнить счет?</b>

1️⃣ Зайдите на сайт и авторизуйтесь
2️⃣ Нажмите кнопку "Депозит" в личном кабинете
3️⃣ Выберите способ оплаты:
   • 💳 Банковская карта (Visa/MC)
   • 🪙 Криптовалюта (USDT, BTC, ETH)
   • 📱 СБП (Быстрые платежи)
4️⃣ Введите сумму (мин. 500 ₽)
5️⃣ Следуйте инструкциям на экране

⚡️ Зачисление моментальное!

🚀 <b>Сайт AUREX Casino скоро откроется! Следи за каналом @aurex_casino</b>`;
  await ctx.replyWithHTML(text, { disable_web_page_preview: true });
});

bot.action('deposit', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(`💰 <b>Способы пополнения:</b>
• Банковская карта (Visa/MC)
• Криптовалюта (USDT, BTC)
• СБП

Минимальный депозит: 500 ₽

🚀 <b>Скоро открытие! Следи за @aurex_casino</b>`, { disable_web_page_preview: true });
});

bot.hears('🎁 Бонусы', async (ctx) => {
  const text = `🎁 <b>Бонусная программа AUREX</b>

🎉 <b>Приветственный пакет:</b>
• 1-й депозит: +200% до 50,000 ₽
• 2-й депозит: +150% до 40,000 ₽
• 3-й депозит: +100% до 30,000 ₽
• 4-й депозит: +50% до 20,000 ₽

💎 <b>VIP-программа:</b>
• Bronze: 5% кэшбэк
• Silver: 7% кэшбэк
• Gold: 10% кэшбэк
• Platinum: 15% кэшбэк
• Emperor: 20% кэшбэк + персональный менеджер

🎰 <b>Турниры:</b>
Еженедельные турниры с призовым фондом до 1,000,000 ₽!

📢 Следите за акциями в нашем <a href="${config.channelUrl}">Telegram-канале</a>`;
  await ctx.replyWithHTML(text, { disable_web_page_preview: true });
});

bot.action('bonuses', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(`🎁 <b>Бонусы AUREX:</b>
• Приветственный бонус до 200%
• Кэшбэк до 20% для VIP
• Еженедельные турниры

📢 <a href="${config.channelUrl}">Подробнее в канале</a>`, { disable_web_page_preview: true });
});

bot.hears('💳 Вывод средств', async (ctx) => {
  const text = `💳 <b>Вывод средств</b>

1️⃣ Зайдите в личный кабинет
2️⃣ Нажмите "Вывод"
3️⃣ Выберите способ:
   • 💳 Карта (до 24 часов)
   • 🪙 Крипто (до 15 минут)
4️⃣ Введите сумму (мин. 1,000 ₽)
5️⃣ Укажите реквизиты

⚠️ <b>Важно:</b>
• Отыграйте вейджер перед выводом
• Для вывода от 50,000 ₽ нужна верификация
• Выводить можно только на свои реквизиты

Проблемы с выводом? Нажмите "👤 Позвать оператора"`;
  await ctx.replyWithHTML(text);
});

bot.action('withdraw', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(`💳 <b>Вывод средств:</b>
• Минимум: 1,000 ₽
• Крипто: до 15 минут
• Карты: до 24 часов

Проблемы? Нажмите "👤 Позвать оператора"`);
});

// ==================== CALL OPERATOR ====================

bot.hears('👤 Позвать оператора', async (ctx) => {
  // Check if user already has an open ticket
  const existingTicket = await db.getOpenTicketByUser(ctx.from.id);
  
  if (existingTicket) {
    await ctx.reply(`⏳ У вас уже есть открытый тикет <b>#${existingTicket.ticket_number}</b>.

Статус: ${existingTicket.status === 'assigned' ? '✅ Оператор подключен' : '🔍 Ищем свободного оператора'}

Просто напишите ваше сообщение, и оператор ответит вам.`, { parse_mode: 'HTML' });
    return;
  }
  
  userState.set(ctx.from.id, { state: 'awaiting_ticket_reason' });
  
  await ctx.reply(`👤 <b>Связь с оператором</b>

Пожалуйста, опишите вашу проблему или вопрос одним сообщением.

Оператор ответит вам в ближайшее время.`, { parse_mode: 'HTML', ...keyboards.cancelTicket });
});

bot.action('call_operator', async (ctx) => {
  await ctx.answerCbQuery();
  
  const existingTicket = await db.getOpenTicketByUser(ctx.from.id);
  
  if (existingTicket) {
    await ctx.reply(`⏳ У вас уже есть открытый тикет.`);
    return;
  }
  
  userState.set(ctx.from.id, { state: 'awaiting_ticket_reason' });
  await ctx.reply(`Опишите вашу проблему одним сообщением:`, keyboards.cancelTicket);
});

bot.action('cancel_ticket', async (ctx) => {
  await ctx.answerCbQuery('Отменено');
  userState.delete(ctx.from.id);
  await ctx.reply('❌ Запрос отменен.', keyboards.mainMenu);
});

// ==================== NEW DIALOG ====================

bot.hears('🔄 Новый диалог', async (ctx) => {
  await ai.clearHistory(ctx.from.id);
  await ctx.reply('🔄 История диалога очищена. Можете начать новый разговор!');
});

// ==================== ACCOUNT LINKING ====================

bot.hears('🔗 Привязать аккаунт', async (ctx) => {
  // Check if already linked
  const linkedUser = await db.getLinkedUser(ctx.from.id);
  
  if (linkedUser) {
    await ctx.reply(`✅ <b>Аккаунт уже привязан!</b>

👤 <b>${linkedUser.username}</b>
📧 ${linkedUser.email}
💰 Баланс: ${parseFloat(linkedUser.balance).toLocaleString()} ₽
🎁 Бонусы: ${parseFloat(linkedUser.bonus_balance).toLocaleString()} ₽
⭐️ VIP: Level ${linkedUser.vip_level}

Теперь ты будешь получать уведомления о:
• Ответах на тикеты
• Статусе выводов
• Бонусах и акциях

<i>Чтобы отвязать аккаунт, напиши /unlink</i>`, { parse_mode: 'HTML' });
    return;
  }
  
  userState.set(ctx.from.id, { state: 'awaiting_link_code' });
  
  await ctx.reply(`🔗 <b>Привязка аккаунта AUREX</b>

Чтобы получать уведомления о тикетах и выводах прямо в Telegram:

🚀 <b>Привязка аккаунта будет доступна после открытия AUREX Casino!</b>

Следи за новостями: @aurex_casino`, { 
    parse_mode: 'HTML',
    disable_web_page_preview: true 
  });
});

bot.command('unlink', async (ctx) => {
  const linkedUser = await db.getLinkedUser(ctx.from.id);
  
  if (!linkedUser) {
    await ctx.reply('❌ Аккаунт не привязан.');
    return;
  }
  
  await db.unlinkAccount(ctx.from.id);
  await ctx.reply(`✅ Аккаунт <b>${linkedUser.username}</b> отвязан от Telegram.

Ты больше не будешь получать уведомления.`, { parse_mode: 'HTML' });
});

bot.command('account', async (ctx) => {
  const linkedUser = await db.getLinkedUser(ctx.from.id);
  
  if (!linkedUser) {
    await ctx.reply('❌ Аккаунт не привязан. Нажми "🔗 Привязать аккаунт"');
    return;
  }
  
  await ctx.reply(`👤 <b>Твой аккаунт AUREX</b>

🆔 ${linkedUser.username}
📧 ${linkedUser.email}
💰 Баланс: <b>${parseFloat(linkedUser.balance).toLocaleString()} ₽</b>
🎁 Бонусы: <b>${parseFloat(linkedUser.bonus_balance).toLocaleString()} ₽</b>
⭐️ VIP Level: ${linkedUser.vip_level}

🚀 <b>Сайт скоро откроется! Следи за @aurex_casino</b>`, { 
    parse_mode: 'HTML',
    disable_web_page_preview: true 
  });
});

// ==================== DEPOSIT NOT RECEIVED ====================

bot.hears('⚠️ Депозит не пришёл', async (ctx) => {
  userState.set(ctx.from.id, { 
    state: 'awaiting_deposit_account_id',
    depositData: {}
  });
  
  await ctx.reply(`⚠️ <b>Депозит не поступил?</b>

Не переживай, сейчас разберёмся! 

<b>Шаг 1 из 2:</b>
Напиши свой <b>ID аккаунта</b> или <b>email</b>, на который регистрировался на сайте.`, { parse_mode: 'HTML' });
});

// ==================== MANAGER PANEL ====================

bot.command('manager', async (ctx) => {
  if (!await isManager(ctx)) {
    await ctx.reply('❌ У вас нет прав менеджера.');
    return;
  }
  
  await ctx.reply('🛡 <b>Панель менеджера</b>\n\nВыберите действие:', {
    parse_mode: 'HTML',
    ...keyboards.managerMenu
  });
});

bot.hears('🟢 Я онлайн', async (ctx) => {
  if (!await isManager(ctx)) return;
  await db.setManagerOnline(ctx.from.id, true);
  await ctx.reply('✅ Вы теперь онлайн. Вам будут приходить новые тикеты.');
});

bot.hears('🔴 Я офлайн', async (ctx) => {
  if (!await isManager(ctx)) return;
  await db.setManagerOnline(ctx.from.id, false);
  await ctx.reply('🔴 Вы офлайн. Новые тикеты не будут приходить.');
});

bot.hears('📋 Мои тикеты', async (ctx) => {
  if (!await isManager(ctx)) return;
  
  const tickets = await db.getManagerActiveTickets(ctx.from.id);
  
  if (tickets.length === 0) {
    await ctx.reply('📋 У вас нет активных тикетов.');
    return;
  }
  
  let text = '📋 <b>Ваши активные тикеты:</b>\n\n';
  for (const t of tickets) {
    text += `<b>#${t.ticket_number}</b>\n`;
    text += `👤 @${t.user_username || 'Unknown'}\n`;
    text += `📝 ${t.subject?.substring(0, 50) || 'Без темы'}...\n\n`;
  }
  
  await ctx.replyWithHTML(text);
});

bot.hears('📜 Открытые тикеты', async (ctx) => {
  if (!await isManager(ctx)) return;
  
  const tickets = await db.getOpenTickets();
  
  if (tickets.length === 0) {
    await ctx.reply('✅ Нет открытых тикетов.');
    return;
  }
  
  for (const t of tickets) {
    const text = `🆕 <b>Тикет #${t.ticket_number}</b>\n\n👤 @${t.user_username || 'Unknown'}\n📝 ${t.subject || 'Без темы'}`;
    await ctx.replyWithHTML(text, keyboards.getTicketActions(t.id));
  }
});

// Take ticket (ATOMIC - prevents double-take)
bot.action(/take_ticket:(\d+)/, async (ctx) => {
  if (!await isManager(ctx)) {
    await ctx.answerCbQuery('Вы не менеджер');
    return;
  }
  
  const ticketId = parseInt(ctx.match[1]);
  
  // ATOMIC: Only assigns if still open, returns null if already taken
  const ticket = await db.tryAssignTicket(ticketId, ctx.from.id);
  
  if (!ticket) {
    await ctx.answerCbQuery('❌ Тикет уже взят другим менеджером!');
    try {
      await ctx.editMessageText('❌ Этот тикет уже взят другим менеджером.');
    } catch (e) {}
    return;
  }
  
  await db.incrementManagerTickets(ctx.from.id);
  managerReplies.set(ctx.from.id, ticketId);
  
  await ctx.answerCbQuery('✅ Тикет ваш!');
  await ctx.editMessageText(
    `✅ <b>Тикет #${ticket.ticket_number}</b> назначен вам.\n\n👤 @${ticket.user_username || 'Unknown'}\n📝 ${ticket.subject || ''}\n\n<i>Просто напишите ответ — он уйдёт пользователю.</i>`,
    { parse_mode: 'HTML', ...keyboards.getActiveTicketActions(ticketId) }
  );
  
  // Notify user
  try {
    await bot.telegram.sendMessage(
      ticket.user_telegram_id,
      `✅ Оператор <b>${ctx.from.first_name}</b> подключился к вашему тикету <b>#${ticket.ticket_number}</b>.\n\nНапишите ваш вопрос!`,
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    console.error('Failed to notify user:', e.message);
  }
});

// Close ticket
bot.action(/close_ticket:(\d+)/, async (ctx) => {
  if (!await isManager(ctx)) {
    await ctx.answerCbQuery('Вы не менеджер');
    return;
  }
  
  const ticketId = parseInt(ctx.match[1]);
  const ticket = await db.closeTicket(ticketId, ctx.from.id);
  
  if (!ticket) {
    await ctx.answerCbQuery('Тикет не найден');
    return;
  }
  
  managerReplies.delete(ctx.from.id);
  
  await ctx.answerCbQuery('Тикет закрыт');
  await ctx.editMessageText(`✅ Тикет <b>#${ticket.ticket_number}</b> закрыт.`, { parse_mode: 'HTML' });
  
  // Notify user
  try {
    await bot.telegram.sendMessage(
      ticket.user_telegram_id,
      `✅ Ваш тикет <b>#${ticket.ticket_number}</b> закрыт.\n\nСпасибо, что обратились в поддержку AUREX! 💎\n\nОцените качество обслуживания:`,
      { parse_mode: 'HTML', ...keyboards.rateSupport }
    );
  } catch (e) {
    console.error('Failed to notify user:', e.message);
  }
});

// ==================== ADMIN PANEL ====================

bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.reply('❌ У вас нет прав администратора.');
    return;
  }
  
  // Show stats immediately
  const stats = await db.getStats();
  
  const text = `👑 <b>Админ-панель AUREX</b>

📊 <b>Быстрая статистика:</b>
• Тикетов всего: <b>${stats.totalTickets}</b>
• Открытых: <b>${stats.openTickets}</b>
• В работе: <b>${stats.assignedTickets}</b>
• Менеджеров: <b>${stats.totalManagers}</b> (🟢 ${stats.onlineManagers} онлайн)
• AI-диалогов: <b>${stats.totalConversations}</b>

Выберите действие:`;
  
  await ctx.replyWithHTML(text, keyboards.adminMenu);
});

bot.hears('📊 Статистика', async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  const stats = await db.getStats();
  const managers = await db.getActiveManagers();
  
  let text = `📊 <b>Полная статистика AUREX Bot</b>

<b>📋 Тикеты:</b>
• Всего: ${stats.totalTickets}
• 🟡 Открытых (ждут): ${stats.openTickets}
• 🔵 В работе: ${stats.assignedTickets}
• ✅ Закрытых: ${stats.closedTickets}

<b>👥 Менеджеры:</b>
• Всего активных: ${stats.totalManagers}
• 🟢 Онлайн сейчас: ${stats.onlineManagers}

<b>🤖 AI Стефани:</b>
• Уникальных диалогов: ${stats.totalConversations}

<b>👥 Топ менеджеров:</b>`;

  const sortedManagers = managers.sort((a, b) => b.tickets_handled - a.tickets_handled).slice(0, 5);
  for (let i = 0; i < sortedManagers.length; i++) {
    const m = sortedManagers[i];
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
    text += `\n${medal} @${m.username || 'ID:' + m.telegram_id}: ${m.tickets_handled} тикетов`;
  }
  
  await ctx.replyWithHTML(text);
});

bot.hears('👥 Менеджеры', async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  const managers = await db.getActiveManagers();
  
  if (managers.length === 0) {
    await ctx.reply('📋 Нет активных менеджеров.\n\nНажми "➕ Добавить менеджера" чтобы добавить.');
    return;
  }
  
  let text = '👥 <b>Менеджеры поддержки:</b>\n\n';
  for (const m of managers) {
    const status = m.is_online ? '🟢 ОНЛАЙН' : '🔴 офлайн';
    text += `<b>@${m.username || 'ID:' + m.telegram_id}</b>\n`;
    text += `   ${status}\n`;
    text += `   📋 Тикетов обработано: ${m.tickets_handled}\n`;
    text += `   🆔 ID: <code>${m.telegram_id}</code>\n\n`;
  }
  
  await ctx.replyWithHTML(text);
});

bot.hears('➕ Добавить менеджера', async (ctx) => {
  if (!isAdmin(ctx)) return;
  userState.set(ctx.from.id, { state: 'awaiting_manager_add' });
  await ctx.reply(`➕ <b>Добавление менеджера</b>

Два способа:
1️⃣ Перешли мне любое сообщение от человека
2️⃣ Отправь его Telegram ID (число)

<i>Человек получит уведомление и доступ к /manager</i>`, { parse_mode: 'HTML' });
});

bot.hears('➖ Удалить менеджера', async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  const managers = await db.getActiveManagers();
  if (managers.length === 0) {
    await ctx.reply('Нет менеджеров для удаления.');
    return;
  }
  
  let text = '➖ <b>Удаление менеджера</b>\n\nОтправь Telegram ID менеджера:\n\n';
  for (const m of managers) {
    text += `• @${m.username || 'Unknown'} — <code>${m.telegram_id}</code>\n`;
  }
  
  userState.set(ctx.from.id, { state: 'awaiting_manager_remove' });
  await ctx.replyWithHTML(text);
});

bot.hears('📢 Рассылка', async (ctx) => {
  if (!isAdmin(ctx)) return;
  userState.set(ctx.from.id, { state: 'awaiting_broadcast_message' });
  await ctx.reply(`📢 <b>Рассылка всем пользователям</b>

Напиши сообщение, которое получат все пользователи бота.

<i>Поддерживается HTML-разметка:
&lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;a href="url"&gt;ссылка&lt;/a&gt;</i>

Отправь /cancel для отмены.`, { parse_mode: 'HTML' });
});

bot.hears('📋 Все тикеты', async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  const openTickets = await db.getOpenTickets();
  
  if (openTickets.length === 0) {
    await ctx.reply('✅ Нет открытых тикетов.');
    return;
  }
  
  await ctx.reply(`📋 <b>Открытые тикеты (${openTickets.length}):</b>`, { parse_mode: 'HTML' });
  
  for (const t of openTickets) {
    const text = `🆕 <b>#${t.ticket_number}</b>\n👤 @${t.user_username || 'Unknown'}\n📝 ${t.subject?.substring(0, 100) || 'Без темы'}`;
    await ctx.replyWithHTML(text, keyboards.getTicketActions(t.id));
  }
});

bot.hears('🔙 Выход из админки', async (ctx) => {
  if (!isAdmin(ctx)) return;
  userState.delete(ctx.from.id);
  await ctx.reply('👋 Вы вышли из админки.', keyboards.mainMenu);
});

bot.command('cancel', async (ctx) => {
  userState.delete(ctx.from.id);
  await ctx.reply('❌ Действие отменено.');
});

// ==================== PHOTO HANDLER ====================

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const state = userState.get(userId);
  const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Largest photo
  const caption = ctx.message.caption || '';
  
  // Deposit screenshot flow
  if (state?.state === 'awaiting_deposit_screenshot') {
    const depositData = state.depositData;
    
    const subject = `💰 Депозит не поступил | Аккаунт: ${depositData.accountId}`;
    const ticket = await db.createTicket(
      userId,
      ctx.from.username,
      ctx.from.first_name,
      subject
    );
    
    await db.addTicketMessage(ticket.id, userId, 'user', `Аккаунт: ${depositData.accountId}\n[Скриншот прикреплён]`);
    userState.delete(userId);
    
    await ctx.reply(`✅ <b>Заявка #${ticket.ticket_number} создана!</b>

Мы получили:
• Аккаунт: <b>${escapeHtml(depositData.accountId)}</b>
• Скриншот оплаты: ✅

⏳ Оператор проверит платёж и свяжется с тобой.`, { parse_mode: 'HTML' });
    
    // Notify managers with photo
    const managers = await db.getActiveManagers();
    for (const manager of managers) {
      try {
        await bot.telegram.sendPhoto(manager.telegram_id, photo.file_id, {
          caption: `🆕 <b>Тикет #${ticket.ticket_number}</b>\n\n💰 <b>Депозит не поступил</b>\n👤 ${ctx.from.first_name} (@${ctx.from.username || 'нет'})\n🔑 Аккаунт: ${depositData.accountId}`,
          parse_mode: 'HTML',
          ...keyboards.getTicketActions(ticket.id)
        });
      } catch (e) {
        console.error(`Failed to notify manager ${manager.telegram_id}:`, e.message);
      }
    }
    return;
  }
  
  // Check if user has active ticket - forward photo to manager
  const userTicket = await db.getOpenTicketByUser(userId);
  if (userTicket && userTicket.status === 'assigned') {
    await db.addTicketMessage(userTicket.id, userId, 'user', '[📷 Фото]' + (caption ? ': ' + caption : ''));
    
    try {
      await bot.telegram.sendPhoto(userTicket.manager_telegram_id, photo.file_id, {
        caption: `📷 <b>Тикет #${userTicket.ticket_number}</b>\n👤 @${ctx.from.username || ctx.from.first_name}${caption ? '\n\n' + escapeHtml(caption) : ''}`,
        parse_mode: 'HTML',
        ...keyboards.getActiveTicketActions(userTicket.id)
      });
      await ctx.reply('📷 Фото отправлено оператору!');
    } catch (e) {
      await ctx.reply('❌ Не удалось отправить фото оператору.');
    }
    return;
  }
  
  // Check if manager is replying with photo
  if (await isManager(ctx)) {
    const managerTicketId = managerReplies.get(userId);
    if (managerTicketId) {
      const ticket = await db.getTicketById(managerTicketId);
      if (ticket && ticket.status === 'assigned') {
        await db.addTicketMessage(managerTicketId, userId, 'manager', '[📷 Фото]' + (caption ? ': ' + caption : ''));
        
        try {
          await bot.telegram.sendPhoto(ticket.user_telegram_id, photo.file_id, {
            caption: `📷 <b>Оператор:</b>${caption ? '\n\n' + escapeHtml(caption) : ''}`,
            parse_mode: 'HTML'
          });
          await ctx.reply('📷 Фото отправлено пользователю!');
        } catch (e) {
          await ctx.reply('❌ Не удалось отправить фото пользователю.');
        }
        return;
      }
    }
  }
  
  await ctx.reply('📷 Фото получено! Если нужна помощь — нажми "👤 Позвать оператора".');
});

// ==================== DOCUMENT HANDLER (PDF, files) ====================

bot.on('document', async (ctx) => {
  const userId = ctx.from.id;
  const state = userState.get(userId);
  const doc = ctx.message.document;
  const caption = ctx.message.caption || '';
  
  // Deposit screenshot flow
  if (state?.state === 'awaiting_deposit_screenshot') {
    const depositData = state.depositData;
    
    const subject = `💰 Депозит не поступил | Аккаунт: ${depositData.accountId}`;
    const ticket = await db.createTicket(
      userId,
      ctx.from.username,
      ctx.from.first_name,
      subject
    );
    
    await db.addTicketMessage(ticket.id, userId, 'user', `Аккаунт: ${depositData.accountId}\n[Документ: ${doc.file_name}]`);
    userState.delete(userId);
    
    await ctx.reply(`✅ <b>Заявка #${ticket.ticket_number} создана!</b>

Мы получили:
• Аккаунт: <b>${escapeHtml(depositData.accountId)}</b>
• Документ: ✅

⏳ Оператор проверит платёж и свяжется с тобой.`, { parse_mode: 'HTML' });
    
    const managers = await db.getActiveManagers();
    for (const manager of managers) {
      try {
        await bot.telegram.sendDocument(manager.telegram_id, doc.file_id, {
          caption: `🆕 <b>Тикет #${ticket.ticket_number}</b>\n\n💰 <b>Депозит не поступил</b>\n👤 ${ctx.from.first_name} (@${ctx.from.username || 'нет'})\n🔑 Аккаунт: ${depositData.accountId}`,
          parse_mode: 'HTML',
          ...keyboards.getTicketActions(ticket.id)
        });
      } catch (e) {
        console.error(`Failed to notify manager ${manager.telegram_id}:`, e.message);
      }
    }
    return;
  }
  
  // Check if user has active ticket - forward document to manager
  const userTicket = await db.getOpenTicketByUser(userId);
  if (userTicket && userTicket.status === 'assigned') {
    await db.addTicketMessage(userTicket.id, userId, 'user', `[📎 ${doc.file_name}]` + (caption ? ': ' + caption : ''));
    
    try {
      await bot.telegram.sendDocument(userTicket.manager_telegram_id, doc.file_id, {
        caption: `📎 <b>Тикет #${userTicket.ticket_number}</b>\n👤 @${ctx.from.username || ctx.from.first_name}\n📄 ${doc.file_name}${caption ? '\n\n' + escapeHtml(caption) : ''}`,
        parse_mode: 'HTML',
        ...keyboards.getActiveTicketActions(userTicket.id)
      });
      await ctx.reply('📎 Файл отправлен оператору!');
    } catch (e) {
      await ctx.reply('❌ Не удалось отправить файл оператору.');
    }
    return;
  }
  
  // Check if manager is replying with document
  if (await isManager(ctx)) {
    const managerTicketId = managerReplies.get(userId);
    if (managerTicketId) {
      const ticket = await db.getTicketById(managerTicketId);
      if (ticket && ticket.status === 'assigned') {
        await db.addTicketMessage(managerTicketId, userId, 'manager', `[📎 ${doc.file_name}]` + (caption ? ': ' + caption : ''));
        
        try {
          await bot.telegram.sendDocument(ticket.user_telegram_id, doc.file_id, {
            caption: `📎 <b>Оператор:</b>\n📄 ${doc.file_name}${caption ? '\n\n' + escapeHtml(caption) : ''}`,
            parse_mode: 'HTML'
          });
          await ctx.reply('📎 Файл отправлен пользователю!');
        } catch (e) {
          await ctx.reply('❌ Не удалось отправить файл пользователю.');
        }
        return;
      }
    }
  }
  
  await ctx.reply('📎 Файл получен! Если нужна помощь — нажми "👤 Позвать оператора".');
});

// ==================== VIDEO HANDLER ====================

bot.on('video', async (ctx) => {
  const userId = ctx.from.id;
  const video = ctx.message.video;
  const caption = ctx.message.caption || '';
  
  // Check if user has active ticket - forward video to manager
  const userTicket = await db.getOpenTicketByUser(userId);
  if (userTicket && userTicket.status === 'assigned') {
    await db.addTicketMessage(userTicket.id, userId, 'user', '[🎥 Видео]' + (caption ? ': ' + caption : ''));
    
    try {
      await bot.telegram.sendVideo(userTicket.manager_telegram_id, video.file_id, {
        caption: `🎥 <b>Тикет #${userTicket.ticket_number}</b>\n👤 @${ctx.from.username || ctx.from.first_name}${caption ? '\n\n' + escapeHtml(caption) : ''}`,
        parse_mode: 'HTML',
        ...keyboards.getActiveTicketActions(userTicket.id)
      });
      await ctx.reply('🎥 Видео отправлено оператору!');
    } catch (e) {
      await ctx.reply('❌ Не удалось отправить видео оператору.');
    }
    return;
  }
  
  // Check if manager is replying with video
  if (await isManager(ctx)) {
    const managerTicketId = managerReplies.get(userId);
    if (managerTicketId) {
      const ticket = await db.getTicketById(managerTicketId);
      if (ticket && ticket.status === 'assigned') {
        await db.addTicketMessage(managerTicketId, userId, 'manager', '[🎥 Видео]' + (caption ? ': ' + caption : ''));
        
        try {
          await bot.telegram.sendVideo(ticket.user_telegram_id, video.file_id, {
            caption: `🎥 <b>Оператор:</b>${caption ? '\n\n' + escapeHtml(caption) : ''}`,
            parse_mode: 'HTML'
          });
          await ctx.reply('🎥 Видео отправлено пользователю!');
        } catch (e) {
          await ctx.reply('❌ Не удалось отправить видео пользователю.');
        }
        return;
      }
    }
  }
  
  await ctx.reply('🎥 Видео получено! Если нужна помощь — нажми "👤 Позвать оператора".');
});

// ==================== VIDEO NOTE (круглые видео) ====================

bot.on('video_note', async (ctx) => {
  const userId = ctx.from.id;
  const videoNote = ctx.message.video_note;
  
  // Check if user has active ticket
  const userTicket = await db.getOpenTicketByUser(userId);
  if (userTicket && userTicket.status === 'assigned') {
    await db.addTicketMessage(userTicket.id, userId, 'user', '[🔴 Видеосообщение]');
    
    try {
      await bot.telegram.sendVideoNote(userTicket.manager_telegram_id, videoNote.file_id);
      await bot.telegram.sendMessage(userTicket.manager_telegram_id, 
        `🔴 <b>Тикет #${userTicket.ticket_number}</b>\n👤 @${ctx.from.username || ctx.from.first_name}\n<i>Видеосообщение выше</i>`,
        { parse_mode: 'HTML', ...keyboards.getActiveTicketActions(userTicket.id) }
      );
      await ctx.reply('🔴 Видеосообщение отправлено оператору!');
    } catch (e) {
      await ctx.reply('❌ Не удалось отправить видеосообщение.');
    }
    return;
  }
  
  // Check if manager is replying
  if (await isManager(ctx)) {
    const managerTicketId = managerReplies.get(userId);
    if (managerTicketId) {
      const ticket = await db.getTicketById(managerTicketId);
      if (ticket && ticket.status === 'assigned') {
        await db.addTicketMessage(managerTicketId, userId, 'manager', '[🔴 Видеосообщение]');
        
        try {
          await bot.telegram.sendVideoNote(ticket.user_telegram_id, videoNote.file_id);
          await bot.telegram.sendMessage(ticket.user_telegram_id, 
            `🔴 <b>Видеосообщение от оператора</b>`,
            { parse_mode: 'HTML' }
          );
          await ctx.reply('🔴 Видеосообщение отправлено пользователю!');
        } catch (e) {
          await ctx.reply('❌ Не удалось отправить видеосообщение.');
        }
        return;
      }
    }
  }
  
  await ctx.reply('🔴 Видеосообщение получено!');
});

// ==================== VOICE MESSAGE ====================

bot.on('voice', async (ctx) => {
  const userId = ctx.from.id;
  const voice = ctx.message.voice;
  
  // Check if user has active ticket
  const userTicket = await db.getOpenTicketByUser(userId);
  if (userTicket && userTicket.status === 'assigned') {
    await db.addTicketMessage(userTicket.id, userId, 'user', '[🎤 Голосовое сообщение]');
    
    try {
      await bot.telegram.sendVoice(userTicket.manager_telegram_id, voice.file_id, {
        caption: `🎤 <b>Тикет #${userTicket.ticket_number}</b>\n👤 @${ctx.from.username || ctx.from.first_name}`,
        parse_mode: 'HTML'
      });
      await ctx.reply('🎤 Голосовое отправлено оператору!');
    } catch (e) {
      await ctx.reply('❌ Не удалось отправить голосовое.');
    }
    return;
  }
  
  // Check if manager is replying
  if (await isManager(ctx)) {
    const managerTicketId = managerReplies.get(userId);
    if (managerTicketId) {
      const ticket = await db.getTicketById(managerTicketId);
      if (ticket && ticket.status === 'assigned') {
        await db.addTicketMessage(managerTicketId, userId, 'manager', '[🎤 Голосовое сообщение]');
        
        try {
          await bot.telegram.sendVoice(ticket.user_telegram_id, voice.file_id, {
            caption: `🎤 <b>Голосовое от оператора</b>`,
            parse_mode: 'HTML'
          });
          await ctx.reply('🎤 Голосовое отправлено пользователю!');
        } catch (e) {
          await ctx.reply('❌ Не удалось отправить голосовое.');
        }
        return;
      }
    }
  }
  
  await ctx.reply('🎤 Голосовое получено! Если нужна помощь — напиши текстом или нажми "👤 Позвать оператора".');
});

// ==================== MESSAGE HANDLER ====================

bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;
  
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const state = userState.get(userId);
  
  // ===== Account linking code =====
  if (state?.state === 'awaiting_link_code') {
    const code = text.trim();
    
    if (code.length < 10) {
      await ctx.reply('❌ Неверный формат кода. Скопируй код полностью с сайта.');
      return;
    }
    
    const result = await db.linkAccountByCode(ctx.from.id, code);
    userState.delete(userId);
    
    if (result.success) {
      await ctx.reply(`✅ <b>Аккаунт успешно привязан!</b>

👤 ${result.user.username}
📧 ${result.user.email}

Теперь ты будешь получать уведомления о:
• Ответах на тикеты поддержки
• Статусе выводов
• Персональных бонусах

Напиши /account чтобы посмотреть баланс.`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ <b>Ошибка привязки</b>

${result.error}

Попробуй получить новый код на сайте.`, { parse_mode: 'HTML' });
    }
    return;
  }
  
  // ===== Broadcast message =====
  if (state?.state === 'awaiting_broadcast_message' && isAdmin(ctx)) {
    userState.delete(userId);
    
    const users = await db.getAllBotUsers();
    let sent = 0;
    let failed = 0;
    
    await ctx.reply(`📢 Начинаю рассылку на ${users.length} пользователей...`);
    
    for (const userTgId of users) {
      try {
        await bot.telegram.sendMessage(userTgId, text, { parse_mode: 'HTML' });
        sent++;
      } catch (e) {
        failed++;
      }
      // Небольшая задержка чтобы не словить rate limit
      if (sent % 25 === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    await ctx.reply(`✅ <b>Рассылка завершена!</b>\n\n📤 Доставлено: ${sent}\n❌ Ошибок: ${failed}`, { parse_mode: 'HTML' });
    return;
  }
  
  // ===== Admin adding manager =====
  if (state?.state === 'awaiting_manager_add' && isAdmin(ctx)) {
    let targetId, targetUsername, targetName;
    
    if (ctx.message.forward_from) {
      targetId = ctx.message.forward_from.id;
      targetUsername = ctx.message.forward_from.username;
      targetName = ctx.message.forward_from.first_name;
    } else if (/^\d+$/.test(text)) {
      targetId = parseInt(text);
    } else {
      await ctx.reply('❌ Не удалось определить пользователя. Перешлите сообщение или отправьте ID.');
      return;
    }
    
    await db.addManager(targetId, targetUsername, targetName);
    userState.delete(userId);
    await ctx.reply(`✅ Менеджер ${targetUsername ? '@' + targetUsername : 'ID:' + targetId} добавлен!`, keyboards.adminMenu);
    
    // Notify new manager
    try {
      await bot.telegram.sendMessage(targetId, `🎉 Вы назначены менеджером поддержки AUREX!\n\nНапишите /manager для доступа к панели.`);
    } catch (e) {}
    return;
  }
  
  // ===== Admin removing manager =====
  if (state?.state === 'awaiting_manager_remove' && isAdmin(ctx)) {
    let targetId;
    
    if (ctx.message.forward_from) {
      targetId = ctx.message.forward_from.id;
    } else if (/^\d+$/.test(text)) {
      targetId = parseInt(text);
    } else {
      await ctx.reply('❌ Не удалось определить пользователя.');
      return;
    }
    
    await db.removeManager(targetId);
    userState.delete(userId);
    await ctx.reply(`✅ Менеджер удален.`, keyboards.adminMenu);
    return;
  }
  
  // ===== Deposit issue - step 1: account ID =====
  if (state?.state === 'awaiting_deposit_account_id') {
    userState.set(userId, {
      state: 'awaiting_deposit_screenshot',
      depositData: { accountId: text }
    });
    
    await ctx.reply(`✅ Аккаунт: <b>${escapeHtml(text)}</b>

<b>Шаг 2 из 2:</b>
Теперь отправь <b>скриншот оплаты</b> (чек из банка или криптокошелька).

📎 Просто прикрепи фото или файл.`, { parse_mode: 'HTML' });
    return;
  }
  
  // ===== User creating ticket =====
  if (state?.state === 'awaiting_ticket_reason') {
    const ticket = await db.createTicket(
      userId,
      ctx.from.username,
      ctx.from.first_name,
      text
    );
    
    await db.addTicketMessage(ticket.id, userId, 'user', text);
    userState.delete(userId);
    
    await ctx.reply(`✅ Тикет <b>#${ticket.ticket_number}</b> создан!

Ожидайте ответа оператора. Как только он подключится, вы получите уведомление.

Вы можете продолжать писать сообщения — они будут добавлены к тикету.`, { parse_mode: 'HTML' });
    
    // Notify managers
    const managerMsg = `🆕 <b>Новый тикет #${ticket.ticket_number}</b>

👤 ${ctx.from.first_name} (@${ctx.from.username || 'нет юзернейма'})
📝 ${escapeHtml(text.substring(0, 200))}${text.length > 200 ? '...' : ''}`;
    
    await notifyManagers(ticket, managerMsg);
    return;
  }
  
  // ===== Check if user has open ticket (message to operator) =====
  const userTicket = await db.getOpenTicketByUser(userId);
  if (userTicket && userTicket.status === 'assigned') {
    await db.addTicketMessage(userTicket.id, userId, 'user', text);
    
    // Forward to manager
    try {
      await bot.telegram.sendMessage(
        userTicket.manager_telegram_id,
        `💬 <b>Тикет #${userTicket.ticket_number}</b>\n👤 @${ctx.from.username || ctx.from.first_name}:\n\n${escapeHtml(text)}`,
        { parse_mode: 'HTML', ...keyboards.getActiveTicketActions(userTicket.id) }
      );
    } catch (e) {
      console.error('Failed to forward to manager:', e.message);
    }
    return;
  }
  
  // ===== Check if manager is replying to ticket =====
  if (await isManager(ctx)) {
    const managerTicketId = managerReplies.get(userId);
    if (managerTicketId) {
      const ticket = await db.getTicketById(managerTicketId);
      if (ticket && ticket.status === 'assigned') {
        await db.addTicketMessage(managerTicketId, userId, 'manager', text);
        
        // Forward to user
        try {
          await bot.telegram.sendMessage(
            ticket.user_telegram_id,
            `💬 <b>Оператор:</b>\n\n${escapeHtml(text)}`,
            { parse_mode: 'HTML' }
          );
          await ctx.reply('✅ Сообщение отправлено пользователю.');
        } catch (e) {
          await ctx.reply('❌ Не удалось отправить сообщение пользователю.');
        }
        return;
      }
    }
  }
  
  // ===== AI Response =====
  await ctx.sendChatAction('typing');
  
  const aiResponse = await ai.chat(userId, ctx.from.username, text);
  await ctx.replyWithHTML(aiResponse);
});

// ==================== RATING ====================

bot.action(/rate_(\d)/, async (ctx) => {
  const rating = ctx.match[1];
  await ctx.answerCbQuery(`Спасибо за оценку ${rating}⭐️!`);
  await ctx.editMessageText(`✅ Спасибо за оценку <b>${'⭐️'.repeat(parseInt(rating))}</b>!\n\nМы ценим ваше мнение и стараемся становиться лучше для вас! 💎`, { parse_mode: 'HTML' });
});

// ==================== ERROR HANDLING ====================

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже или обратитесь к оператору.');
});

// ==================== LAUNCH ====================

bot.launch().then(() => {
  console.log('🤖 AUREX Support Bot started!');
  console.log('📊 Admin IDs:', config.adminIds);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
