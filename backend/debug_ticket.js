const { Pool } = require('pg');

const connectionString = "postgresql://postgres:wiYSoYdznAyIdTzDONoalYtMVveRHlyx@maglev.proxy.rlwy.net:39031/railway";

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log('Searching for ticket TKT-MM331J1E...');
    const ticketRes = await pool.query("SELECT * FROM tickets WHERE id = 'TKT-MM331J1E'");
    
    if (!ticketRes.rows[0]) {
        console.log('Ticket not found');
        return;
    }
    
    const ticket = ticketRes.rows[0];
    console.log('Ticket found:', ticket);
    
    if (ticket.user_id) {
        const userRes = await pool.query("SELECT id, username, email, balance, bonus_balance, odid FROM users WHERE id = $1", [ticket.user_id]);
        const user = userRes.rows[0];
        console.log('User found:', user);
        
        const tx = await pool.query("SELECT id, amount, status, description, created_at, payment_method FROM transactions WHERE user_id = $1 AND type = 'withdrawal' ORDER BY created_at DESC LIMIT 5", [user.id]);
        console.log('Recent Withdrawals:', JSON.stringify(tx.rows, null, 2));
        
        const bonus = await pool.query("SELECT * FROM bonuses WHERE user_id = $1 AND status = 'active'", [user.id]);
        console.log('Active Bonus:', JSON.stringify(bonus.rows[0], null, 2));
    } else {
        console.log('Ticket has no user_id linked');
    }
    
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();