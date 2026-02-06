const db = require('./database');
const crypto = require('crypto');

class ReferralService {
  // =============================================
  // ПОЛЬЗОВАТЕЛИ
  // =============================================

  /** Генерация уникального реферального кода */
  generateCode() {
    return crypto.randomBytes(4).toString('hex'); // 8 символов
  }

  /** Найти пользователя по telegram_id */
  findByTelegramId(telegramId) {
    return db.prepare(`SELECT * FROM users WHERE telegram_id = ?`).get(telegramId);
  }

  /** Найти пользователя по реферальному коду */
  findByReferralCode(code) {
    return db.prepare(`SELECT * FROM users WHERE referral_code = ?`).get(code);
  }

  /** Регистрация пользователя */
  registerUser({ telegramId, username, firstName, lastName, referralCode }) {
    const existing = this.findByTelegramId(telegramId);
    if (existing) return { user: existing, isNew: false };

    const myCode = this.generateCode();
    let referrerId = null;

    // Если пришел по рефералке
    if (referralCode) {
      const referrer = this.findByReferralCode(referralCode);
      if (referrer && referrer.telegram_id !== telegramId) {
        referrerId = referrer.id;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, last_name, referral_code, referred_by, tickets)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(telegramId, username || null, firstName || 'User', lastName || null, myCode, referrerId);
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(result.lastInsertRowid);

    // Начисляем билеты рефереру
    if (referrerId) {
      this.addTickets(referrerId, 1, 'referral', user.id);

      // Логируем билет новому пользователю тоже
      this.logTickets(user.id, 1, 'registration', null);
    } else {
      this.logTickets(user.id, 1, 'registration', null);
    }

    return { user, isNew: true, referrerId };
  }

  // =============================================
  // БИЛЕТЫ
  // =============================================

  /** Добавить билеты пользователю */
  addTickets(userId, amount, reason, relatedUserId = null) {
    db.prepare(`UPDATE users SET tickets = tickets + ? WHERE id = ?`).run(amount, userId);
    this.logTickets(userId, amount, reason, relatedUserId);
    return db.prepare(`SELECT tickets FROM users WHERE id = ?`).get(userId).tickets;
  }

  /** Добавить билеты по telegram_id */
  addTicketsByTelegramId(telegramId, amount, reason) {
    const user = this.findByTelegramId(telegramId);
    if (!user) return null;
    return this.addTickets(user.id, amount, reason);
  }

  /** Логирование начисления */
  logTickets(userId, amount, reason, relatedUserId) {
    db.prepare(`
      INSERT INTO ticket_log (user_id, amount, reason, related_user_id)
      VALUES (?, ?, ?, ?)
    `).run(userId, amount, reason, relatedUserId);
  }

  /** История билетов пользователя */
  getTicketHistory(userId) {
    return db.prepare(`
      SELECT tl.*, u.username as related_username, u.first_name as related_first_name
      FROM ticket_log tl
      LEFT JOIN users u ON u.id = tl.related_user_id
      WHERE tl.user_id = ?
      ORDER BY tl.created_at DESC
      LIMIT 20
    `).all(userId);
  }

  /** Получить реферальный счетчик */
  getReferralCount(userId) {
    const row = db.prepare(`SELECT COUNT(*) as count FROM users WHERE referred_by = ?`).get(userId);
    return row.count;
  }

  /** Рефералы пользователя */
  getReferrals(userId) {
    return db.prepare(`
      SELECT telegram_id, username, first_name, created_at
      FROM users WHERE referred_by = ?
      ORDER BY created_at DESC
    `).all(userId);
  }

  /** ТОП рефереров */
  getTopReferrers(limit = 10) {
    return db.prepare(`
      SELECT u.telegram_id, u.username, u.first_name, u.tickets,
        (SELECT COUNT(*) FROM users r WHERE r.referred_by = u.id) as referrals
      FROM users u
      WHERE (SELECT COUNT(*) FROM users r WHERE r.referred_by = u.id) > 0
      ORDER BY referrals DESC
      LIMIT ?
    `).all(limit);
  }

  // =============================================
  // БУСТ КАНАЛА
  // =============================================

  /** Начислить билеты за буст */
  processBoost(telegramId) {
    const user = this.findByTelegramId(telegramId);
    if (!user) return null;

    const existing = db.prepare(`SELECT * FROM channel_boosts WHERE user_id = ?`).get(user.id);
    if (existing) return { alreadyBoosted: true, tickets: user.tickets };

    const bonusTickets = 5;
    db.prepare(`INSERT INTO channel_boosts (user_id, tickets_awarded) VALUES (?, ?)`).run(user.id, bonusTickets);
    const newTotal = this.addTickets(user.id, bonusTickets, 'boost');

    return { alreadyBoosted: false, tickets: newTotal, bonus: bonusTickets };
  }

  // =============================================
  // АДМИН
  // =============================================

  /** Сделать пользователя админом */
  setAdmin(telegramId, isAdmin = true) {
    db.prepare(`UPDATE users SET is_admin = ? WHERE telegram_id = ?`).run(isAdmin ? 1 : 0, telegramId);
  }

  /** Проверка админа */
  isAdmin(telegramId) {
    const user = this.findByTelegramId(telegramId);
    return user && user.is_admin === 1;
  }

  /** Забанить */
  banUser(telegramId) {
    db.prepare(`UPDATE users SET is_banned = 1 WHERE telegram_id = ?`).run(telegramId);
  }

  /** Разбанить */
  unbanUser(telegramId) {
    db.prepare(`UPDATE users SET is_banned = 0 WHERE telegram_id = ?`).run(telegramId);
  }

  /** Всего пользователей */
  getTotalUsers() {
    return db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
  }
}

module.exports = new ReferralService();
