const { Pool } = require('pg');

const connectionString = "postgresql://postgres:wiYSoYdznAyIdTzDONoalYtMVveRHlyx@maglev.proxy.rlwy.net:39031/railway";

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log('Searching support_tickets...');
    // Search by message content in support_tickets or support_ticket_messages?
    // Let's check support_tickets columns first
    const schema = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='support_tickets'");
    console.log('Schema:', schema.rows.map(r=>r.column_name));

    const res = await pool.query("SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 5");
    console.log('Recent support tickets:', res.rows);
    
    // Check if we can find the user by telegram_id in users table
    if (res.rows.length > 0) {
        const ticket = res.rows[0];
        if (ticket.telegram_id) {
             const user = await pool.query("SELECT * FROM users WHERE telegram_id = $1", [ticket.telegram_id]);
             console.log('Linked User:', user.rows[0]);
        }
    }

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();