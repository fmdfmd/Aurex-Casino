const db = require('./database');

class GiveawayService {
  // =============================================
  // РОЗЫГРЫШИ
  // =============================================

  /** Создать розыгрыш */
  createGiveaway({ title, description, prizes, channelId, endDate, maxParticipants }) {
    const stmt = db.prepare(`
      INSERT INTO giveaways (title, description, prizes, channel_id, end_date, max_participants, status)
      VALUES (?, ?, ?, ?, ?, ?, 'draft')
    `);
    const result = stmt.run(title, description, JSON.stringify(prizes), channelId, endDate, maxParticipants || null);
    return result.lastInsertRowid;
  }

  /** Запустить розыгрыш */
  startGiveaway(giveawayId) {
    db.prepare(`UPDATE giveaways SET status = 'active', start_date = CURRENT_TIMESTAMP WHERE id = ?`).run(giveawayId);
  }

  /** Получить активный розыгрыш */
  getActiveGiveaway() {
    return db.prepare(`SELECT * FROM giveaways WHERE status = 'active' ORDER BY id DESC LIMIT 1`).get();
  }

  /** Получить розыгрыш по ID */
  getGiveaway(id) {
    return db.prepare(`SELECT * FROM giveaways WHERE id = ?`).get(id);
  }

  /** Все розыгрыши */
  getAllGiveaways() {
    return db.prepare(`SELECT * FROM giveaways ORDER BY id DESC`).all();
  }

  /** Завершить розыгрыш */
  finishGiveaway(giveawayId) {
    db.prepare(`UPDATE giveaways SET status = 'finished', end_date = CURRENT_TIMESTAMP WHERE id = ?`).run(giveawayId);
  }

  // =============================================
  // УЧАСТНИКИ
  // =============================================

  /** Участвовать в розыгрыше */
  joinGiveaway(giveawayId, userId) {
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    if (!user) return { success: false, error: 'Пользователь не найден' };

    const existing = db.prepare(`SELECT * FROM participants WHERE giveaway_id = ? AND user_id = ?`).get(giveawayId, userId);
    if (existing) return { success: false, error: 'Вы уже участвуете!' };

    const giveaway = this.getGiveaway(giveawayId);
    if (!giveaway || giveaway.status !== 'active') return { success: false, error: 'Розыгрыш не активен' };

    // Проверяем лимит
    if (giveaway.max_participants) {
      const count = this.getParticipantCount(giveawayId);
      if (count >= giveaway.max_participants) return { success: false, error: 'Все места заняты!' };
    }

    db.prepare(`
      INSERT INTO participants (giveaway_id, user_id, tickets_snapshot) VALUES (?, ?, ?)
    `).run(giveawayId, userId, user.tickets);

    return { success: true, tickets: user.tickets };
  }

  /** Кол-во участников */
  getParticipantCount(giveawayId) {
    const row = db.prepare(`SELECT COUNT(*) as count FROM participants WHERE giveaway_id = ?`).get(giveawayId);
    return row.count;
  }

  /** Все участники розыгрыша */
  getParticipants(giveawayId) {
    return db.prepare(`
      SELECT p.*, u.telegram_id, u.username, u.first_name, u.tickets
      FROM participants p
      JOIN users u ON u.id = p.user_id
      WHERE p.giveaway_id = ?
      ORDER BY u.tickets DESC
    `).all(giveawayId);
  }

  /** Обновить снимок билетов перед розыгрышем */
  snapshotTickets(giveawayId) {
    db.prepare(`
      UPDATE participants SET tickets_snapshot = (
        SELECT tickets FROM users WHERE users.id = participants.user_id
      ) WHERE giveaway_id = ?
    `).run(giveawayId);
  }

  // =============================================
  // ВЫБОР ПОБЕДИТЕЛЕЙ (Weighted Random)
  // =============================================

  /** Выбрать победителей (взвешенный рандом по билетам) */
  pickWinners(giveawayId, winnersCount) {
    // Сначала обновляем билеты
    this.snapshotTickets(giveawayId);

    const participants = db.prepare(`
      SELECT p.*, u.telegram_id, u.username, u.first_name, u.tickets
      FROM participants p
      JOIN users u ON u.id = p.user_id
      WHERE p.giveaway_id = ? AND p.is_winner = 0
    `).all(giveawayId);

    if (participants.length === 0) return [];

    const winners = [];
    const pool = [...participants];

    for (let i = 0; i < winnersCount && pool.length > 0; i++) {
      // Строим массив весов
      const totalTickets = pool.reduce((sum, p) => sum + p.tickets, 0);
      let random = Math.random() * totalTickets;

      let winner = null;
      for (let j = 0; j < pool.length; j++) {
        random -= pool[j].tickets;
        if (random <= 0) {
          winner = pool[j];
          pool.splice(j, 1); // убираем из пула
          break;
        }
      }

      if (!winner) winner = pool.pop();

      // Помечаем победителя
      db.prepare(`UPDATE participants SET is_winner = 1, prize_index = ? WHERE id = ?`).run(i, winner.id);
      winners.push({ ...winner, prize_index: i });
    }

    return winners;
  }

  /** Получить победителей */
  getWinners(giveawayId) {
    return db.prepare(`
      SELECT p.*, u.telegram_id, u.username, u.first_name, u.tickets
      FROM participants p
      JOIN users u ON u.id = p.user_id
      WHERE p.giveaway_id = ? AND p.is_winner = 1
      ORDER BY p.prize_index ASC
    `).all(giveawayId);
  }

  // =============================================
  // СТАТИСТИКА
  // =============================================

  getStats() {
    const totalUsers = db.prepare(`SELECT COUNT(*) as c FROM users`).get().c;
    const totalTickets = db.prepare(`SELECT SUM(tickets) as s FROM users`).get().s || 0;
    const activeGiveaway = this.getActiveGiveaway();
    const activeParticipants = activeGiveaway
      ? this.getParticipantCount(activeGiveaway.id)
      : 0;

    const topUsers = db.prepare(`
      SELECT u.telegram_id, u.username, u.first_name, u.tickets,
        (SELECT COUNT(*) FROM users r WHERE r.referred_by = u.id) as referrals
      FROM users u
      ORDER BY u.tickets DESC, referrals DESC
      LIMIT 10
    `).all();

    return {
      totalUsers,
      totalTickets,
      activeGiveaway,
      activeParticipants,
      topUsers
    };
  }
}

module.exports = new GiveawayService();
