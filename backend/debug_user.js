const { Pool } = require('pg');

// Hardcoded for debug
const connectionString = "postgresql://postgres:wiYSoYdznAyIdTzDONoalYtMVveRHlyx@maglev.proxy.rlwy.net:39031/railway";

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log('Searching for pradaxx...');
    const res = await pool.query("SELECT id, username, email, balance, bonus_balance, odid FROM users WHERE username ILIKE '%pradaxx%' OR telegram_username ILIKE '%pradaxx%'");
    
    if (!res.rows[0]) {
        console.log('User not found');
        return;
    }
    
    const user = res.rows[0];
    console.log('User found:', JSON.stringify(user, null, 2));
    
    const tx = await pool.query("SELECT id, amount, status, description, created_at, payment_method FROM transactions WHERE user_id = $1 AND type = 'withdrawal' ORDER BY created_at DESC LIMIT 5", [user.id]);
    console.log('Recent Withdrawals:', JSON.stringify(tx.rows, null, 2));
    
    const bonus = await pool.query("SELECT * FROM bonuses WHERE user_id = $1 AND status = 'active'", [user.id]);
    console.log('Active Bonus:', JSON.stringify(bonus.rows[0], null, 2));
    
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();