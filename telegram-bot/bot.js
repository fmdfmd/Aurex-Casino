require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const db = require('./services/database');
const ai = require('./services/ai');
const keyboards = require('./keyboards');

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
• <i>"Не пришёл депозит"</i>

Или выбери готовый вопрос из меню ниже 👇`;

  // Только для менеджеров и админов - скрытое меню
  if (isUserManager && !isUserAdmin) {
    greeting += `\n\n🛡 /manager — панель оператора`;
  }
  
  if (isUserAdmin) {
    greeting += `\n\n👑 /admin — управление`;
  }

  await ctx.replyWithHTML(greeting, keyboards.linksInline);
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

🌐 <a href="${config.websiteUrl}">Перейти на сайт</a>`;
  await ctx.replyWithHTML(text, { disable_web_page_preview: true });
});

bot.action('deposit', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(`💰 <b>Способы пополнения:</b>
• Банковская карта (Visa/MC)
• Криптовалюта (USDT, BTC)
• СБП

Минимальный депозит: 500 ₽
🌐 <a href="${config.websiteUrl}">Пополнить на сайте</a>`, { disable_web_page_preview: true });
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

// Take ticket
bot.action(/take_ticket:(\d+)/, async (ctx) => {
  if (!await isManager(ctx)) {
    await ctx.answerCbQuery('Вы не менеджер');
    return;
  }
  
  const ticketId = parseInt(ctx.match[1]);
  const ticket = await db.getTicketById(ticketId);
  
  if (!ticket || ticket.status !== 'open') {
    await ctx.answerCbQuery('Тикет уже взят или закрыт');
    return;
  }
  
  await db.assignTicket(ticketId, ctx.from.id);
  await db.incrementManagerTickets(ctx.from.id);
  managerReplies.set(ctx.from.id, ticketId);
  
  await ctx.answerCbQuery('Тикет назначен вам!');
  await ctx.editMessageText(
    `✅ <b>Тикет #${ticket.ticket_number}</b> назначен вам.\n\nОтвечайте на это сообщение, чтобы отправить ответ пользователю.`,
    { parse_mode: 'HTML', ...keyboards.getActiveTicketActions(ticketId) }
  );
  
  // Notify user
  try {
    await bot.telegram.sendMessage(
      ticket.user_telegram_id,
      `✅ Оператор подключился к вашему тикету <b>#${ticket.ticket_number}</b>.\n\nНапишите ваш вопрос, и оператор ответит вам.`,
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
  
  await ctx.reply('👑 <b>Админ-панель AUREX</b>\n\nВыберите действие:', {
    parse_mode: 'HTML',
    ...keyboards.adminMenu
  });
});

bot.hears('👥 Менеджеры', async (ctx) => {
  if (!isAdmin(ctx)) return;
  
  const managers = await db.getActiveManagers();
  
  if (managers.length === 0) {
    await ctx.reply('📋 Нет активных менеджеров.');
    return;
  }
  
  let text = '👥 <b>Менеджеры поддержки:</b>\n\n';
  for (const m of managers) {
    const status = m.is_online ? '🟢' : '🔴';
    text += `${status} @${m.username || 'ID:' + m.telegram_id}\n`;
    text += `   Тикетов: ${m.tickets_handled}\n\n`;
  }
  
  await ctx.replyWithHTML(text);
});

bot.hears('➕ Добавить менеджера', async (ctx) => {
  if (!isAdmin(ctx)) return;
  userState.set(ctx.from.id, { state: 'awaiting_manager_add' });
  await ctx.reply('Перешлите мне сообщение от пользователя, которого хотите назначить менеджером.\n\nИли отправьте его Telegram ID.');
});

bot.hears('➖ Удалить менеджера', async (ctx) => {
  if (!isAdmin(ctx)) return;
  userState.set(ctx.from.id, { state: 'awaiting_manager_remove' });
  await ctx.reply('Перешлите мне сообщение менеджера или отправьте его Telegram ID.');
});

bot.hears('🔙 Выход из админки', async (ctx) => {
  if (!isAdmin(ctx)) return;
  userState.delete(ctx.from.id);
  await ctx.reply('👋 Вы вышли из админки.', keyboards.mainMenu);
});

// ==================== PHOTO HANDLER (for deposit screenshots) ====================

bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const state = userState.get(userId);
  
  if (state?.state === 'awaiting_deposit_screenshot') {
    const depositData = state.depositData;
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Largest photo
    
    // Create ticket with deposit issue
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

⏳ Оператор проверит платёж и свяжется с тобой в ближайшее время.

<i>Обычно это занимает 5-15 минут.</i>`, { parse_mode: 'HTML' });
    
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
  
  // If photo received but not in deposit flow - just acknowledge
  await ctx.reply('📷 Фото получено! Если у тебя вопрос — просто напиши его текстом.');
});

// ==================== DOCUMENT HANDLER (for deposit screenshots as files) ====================

bot.on('document', async (ctx) => {
  const userId = ctx.from.id;
  const state = userState.get(userId);
  
  if (state?.state === 'awaiting_deposit_screenshot') {
    const depositData = state.depositData;
    const doc = ctx.message.document;
    
    // Create ticket with deposit issue
    const subject = `💰 Депозит не поступил | Аккаунт: ${depositData.accountId}`;
    const ticket = await db.createTicket(
      userId,
      ctx.from.username,
      ctx.from.first_name,
      subject
    );
    
    await db.addTicketMessage(ticket.id, userId, 'user', `Аккаунт: ${depositData.accountId}\n[Документ прикреплён: ${doc.file_name}]`);
    userState.delete(userId);
    
    await ctx.reply(`✅ <b>Заявка #${ticket.ticket_number} создана!</b>

Мы получили:
• Аккаунт: <b>${escapeHtml(depositData.accountId)}</b>
• Документ: ✅

⏳ Оператор проверит платёж и свяжется с тобой.`, { parse_mode: 'HTML' });
    
    // Notify managers with document
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
});

// ==================== MESSAGE HANDLER ====================

bot.on('message', async (ctx) => {
  if (!ctx.message.text) return;
  
  const text = ctx.message.text;
  const userId = ctx.from.id;
  const state = userState.get(userId);
  
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
