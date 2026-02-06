const { Markup } = require('telegraf');
const config = require('./config');

// ==================== USER KEYBOARDS ====================

const mainMenu = Markup.keyboard([
  ['❓ FAQ', '💰 Как пополнить?'],
  ['🎁 Бонусы', '💳 Вывод средств'],
  ['⚠️ Депозит не пришёл', '🔗 Привязать аккаунт'],
  ['🔄 Новый диалог']
]).resize();

const linksInline = Markup.inlineKeyboard([
  [
    Markup.button.url('📢 Канал AUREX', config.channelUrl),
    Markup.button.url('🎁 Розыгрыш', 'https://t.me/aurex_giveaway_bot')
  ]
]);

const cancelTicket = Markup.inlineKeyboard([
  [Markup.button.callback('❌ Отменить запрос', 'cancel_ticket')]
]);

const rateSupport = Markup.inlineKeyboard([
  [
    Markup.button.callback('⭐️', 'rate_1'),
    Markup.button.callback('⭐️⭐️', 'rate_2'),
    Markup.button.callback('⭐️⭐️⭐️', 'rate_3'),
    Markup.button.callback('⭐️⭐️⭐️⭐️', 'rate_4'),
    Markup.button.callback('⭐️⭐️⭐️⭐️⭐️', 'rate_5')
  ]
]);

// ==================== MANAGER KEYBOARDS ====================

const managerMenu = Markup.keyboard([
  ['📋 Мои тикеты', '📊 Статистика'],
  ['🟢 Я онлайн', '🔴 Я офлайн'],
  ['📜 Открытые тикеты']
]).resize();

const getTicketActions = (ticketId) => Markup.inlineKeyboard([
  [
    Markup.button.callback('✅ Взять тикет', `take_ticket:${ticketId}`)
  ]
]);

const getActiveTicketActions = (ticketId) => Markup.inlineKeyboard([
  [
    Markup.button.callback('✅ Закрыть тикет', `close_ticket:${ticketId}`)
  ]
]);

// ==================== ADMIN KEYBOARDS ====================

const adminMenu = Markup.keyboard([
  ['📊 Статистика', '👥 Менеджеры'],
  ['➕ Добавить менеджера', '➖ Удалить менеджера'],
  ['📢 Рассылка', '📋 Все тикеты'],
  ['🔙 Выход из админки']
]).resize();

module.exports = {
  mainMenu,
  linksInline,
  cancelTicket,
  rateSupport,
  managerMenu,
  getTicketActions,
  getActiveTicketActions,
  adminMenu
};
