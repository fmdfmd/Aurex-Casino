const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl.includes('railway') ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ Bot connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err.message);
});

module.exports = {
  pool,
  
  // ==================== MANAGERS ====================
  
  async addManager(telegramId, username, firstName) {
    const result = await pool.query(
      `INSERT INTO support_managers (telegram_id, username, first_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (telegram_id) DO UPDATE SET is_active = true, username = $2, first_name = $3
       RETURNING *`,
      [telegramId, username, firstName]
    );
    return result.rows[0];
  },
  
  async removeManager(telegramId) {
    const result = await pool.query(
      'UPDATE support_managers SET is_active = false WHERE telegram_id = $1 RETURNING *',
      [telegramId]
    );
    return result.rows[0];
  },
  
  async getActiveManagers() {
    const result = await pool.query(
      'SELECT * FROM support_managers WHERE is_active = true ORDER BY tickets_handled ASC'
    );
    return result.rows;
  },
  
  async getOnlineManagers() {
    const result = await pool.query(
      'SELECT * FROM support_managers WHERE is_active = true AND is_online = true ORDER BY tickets_handled ASC'
    );
    return result.rows;
  },
  
  async setManagerOnline(telegramId, isOnline) {
    await pool.query(
      'UPDATE support_managers SET is_online = $2, updated_at = NOW() WHERE telegram_id = $1',
      [telegramId, isOnline]
    );
  },
  
  async isManager(telegramId) {
    const result = await pool.query(
      'SELECT * FROM support_managers WHERE telegram_id = $1 AND is_active = true',
      [telegramId]
    );
    return result.rows.length > 0;
  },
  
  async incrementManagerTickets(telegramId) {
    await pool.query(
      'UPDATE support_managers SET tickets_handled = tickets_handled + 1 WHERE telegram_id = $1',
      [telegramId]
    );
  },

  async getActiveWebTicketForOperator(operatorTelegramId) {
    const result = await pool.query(
      `SELECT id FROM tickets 
       WHERE operator_telegram_id = $1 AND status = 'in_progress' 
       ORDER BY updated_at DESC LIMIT 1`,
      [operatorTelegramId]
    );
    return result.rows[0]?.id || null;
  },
  
  // ==================== TICKETS ====================
  
  async createTicket(userTelegramId, username, firstName, subject) {
    const ticketNumber = 'TKT-' + Date.now().toString(36).toUpperCase();
    const result = await pool.query(
      `INSERT INTO support_tickets (ticket_number, user_telegram_id, user_username, user_first_name, subject)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ticketNumber, userTelegramId, username, firstName, subject]
    );
    return result.rows[0];
  },
  
  async getOpenTicketByUser(userTelegramId) {
    const result = await pool.query(
      `SELECT * FROM support_tickets 
       WHERE user_telegram_id = $1 AND status != 'closed' 
       ORDER BY created_at DESC LIMIT 1`,
      [userTelegramId]
    );
    return result.rows[0];
  },
  
  async getTicketByNumber(ticketNumber) {
    const result = await pool.query(
      'SELECT * FROM support_tickets WHERE ticket_number = $1',
      [ticketNumber]
    );
    return result.rows[0];
  },
  
  async getTicketById(ticketId) {
    const result = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1',
      [ticketId]
    );
    return result.rows[0];
  },
  
  async assignTicket(ticketId, managerTelegramId) {
    const result = await pool.query(
      `UPDATE support_tickets 
       SET manager_telegram_id = $2, status = 'assigned', assigned_at = NOW()
       WHERE id = $1 RETURNING *`,
      [ticketId, managerTelegramId]
    );
    return result.rows[0];
  },
  
  async closeTicket(ticketId, closedBy) {
    const result = await pool.query(
      `UPDATE support_tickets 
       SET status = 'closed', closed_at = NOW(), closed_by = $2
       WHERE id = $1 RETURNING *`,
      [ticketId, closedBy]
    );
    return result.rows[0];
  },
  
  async getOpenTickets() {
    const result = await pool.query(
      `SELECT * FROM support_tickets WHERE status = 'open' ORDER BY created_at ASC`
    );
    return result.rows;
  },
  
  async getManagerActiveTickets(managerTelegramId) {
    const result = await pool.query(
      `SELECT * FROM support_tickets 
       WHERE manager_telegram_id = $1 AND status = 'assigned'
       ORDER BY created_at ASC`,
      [managerTelegramId]
    );
    return result.rows;
  },
  
  async addTicketMessage(ticketId, senderTelegramId, senderType, message) {
    const result = await pool.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_telegram_id, sender_type, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ticketId, senderTelegramId, senderType, message]
    );
    return result.rows[0];
  },
  
  // ==================== CONVERSATIONS (AI) ====================
  
  async saveConversation(telegramId, username, role, message) {
    await pool.query(
      `INSERT INTO bot_conversations (telegram_id, username, role, message)
       VALUES ($1, $2, $3, $4)`,
      [telegramId, username, role, message]
    );
  },
  
  async getConversationHistory(telegramId, limit = 10) {
    const result = await pool.query(
      `SELECT role, message FROM bot_conversations 
       WHERE telegram_id = $1 
       ORDER BY created_at DESC LIMIT $2`,
      [telegramId, limit]
    );
    return result.rows.reverse(); // Return in chronological order
  },
  
  async clearConversation(telegramId) {
    await pool.query(
      'DELETE FROM bot_conversations WHERE telegram_id = $1',
      [telegramId]
    );
  },
  
  // ==================== ACCOUNT LINKING ====================
  
  async linkAccountByCode(telegramId, code) {
    // Find valid code
    const codeResult = await pool.query(
      `SELECT user_id FROM telegram_link_codes 
       WHERE code = $1 AND expires_at > NOW()`,
      [code]
    );
    
    if (codeResult.rows.length === 0) {
      return { success: false, error: 'Код недействителен или истёк' };
    }
    
    const userId = codeResult.rows[0].user_id;
    
    // Check if telegram already linked to another account
    const existingLink = await pool.query(
      'SELECT id FROM users WHERE telegram_id = $1 AND id != $2',
      [telegramId, userId]
    );
    
    if (existingLink.rows.length > 0) {
      return { success: false, error: 'Этот Telegram уже привязан к другому аккаунту' };
    }
    
    // Link account
    await pool.query(
      'UPDATE users SET telegram_id = $1 WHERE id = $2',
      [telegramId, userId]
    );
    
    // Delete used code
    await pool.query(
      'DELETE FROM telegram_link_codes WHERE user_id = $1',
      [userId]
    );
    
    // Get user info
    const userResult = await pool.query(
      'SELECT username, email FROM users WHERE id = $1',
      [userId]
    );
    
    return { 
      success: true, 
      user: userResult.rows[0]
    };
  },
  
  async getLinkedUser(telegramId) {
    const result = await pool.query(
      'SELECT id, username, email, balance, bonus_balance, vip_level FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    return result.rows[0];
  },
  
  async unlinkAccount(telegramId) {
    await pool.query(
      'UPDATE users SET telegram_id = NULL WHERE telegram_id = $1',
      [telegramId]
    );
  },
  
  // ==================== STATISTICS ====================
  
  async getStats() {
    const totalTickets = await pool.query('SELECT COUNT(*) as count FROM support_tickets');
    const openTickets = await pool.query("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'");
    const assignedTickets = await pool.query("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'assigned'");
    const closedTickets = await pool.query("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'closed'");
    const totalManagers = await pool.query('SELECT COUNT(*) as count FROM support_managers WHERE is_active = true');
    const onlineManagers = await pool.query('SELECT COUNT(*) as count FROM support_managers WHERE is_active = true AND is_online = true');
    const totalConversations = await pool.query('SELECT COUNT(DISTINCT telegram_id) as count FROM bot_conversations');
    
    return {
      totalTickets: parseInt(totalTickets.rows[0].count),
      openTickets: parseInt(openTickets.rows[0].count),
      assignedTickets: parseInt(assignedTickets.rows[0].count),
      closedTickets: parseInt(closedTickets.rows[0].count),
      totalManagers: parseInt(totalManagers.rows[0].count),
      onlineManagers: parseInt(onlineManagers.rows[0].count),
      totalConversations: parseInt(totalConversations.rows[0].count)
    };
  },
  
  // ==================== BROADCAST ====================
  
  async getAllBotUsers() {
    const result = await pool.query(
      'SELECT DISTINCT telegram_id FROM bot_conversations'
    );
    return result.rows.map(r => r.telegram_id);
  },
  
  // ==================== ATOMIC TICKET ASSIGNMENT ====================
  
  async tryAssignTicket(ticketId, managerTelegramId) {
    // Atomic operation - only assigns if status is still 'open'
    const result = await pool.query(
      `UPDATE support_tickets 
       SET manager_telegram_id = $2, status = 'assigned', assigned_at = NOW()
       WHERE id = $1 AND status = 'open'
       RETURNING *`,
      [ticketId, managerTelegramId]
    );
    return result.rows[0]; // Returns null if already taken
  }
};
