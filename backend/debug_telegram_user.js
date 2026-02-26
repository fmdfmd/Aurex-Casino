const { Pool } = require('pg');

const connectionString = "postgresql://postgres:wiYSoYdznAyIdTzDONoalYtMVveRHlyx@maglev.proxy.rlwy.net:39031/railway";

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    console.log('Searching user by telegram_id 7724932428...');
    const userRes = await pool.query("SELECT id, username, email, balance, bonus_balance, odid, telegram_id FROM users WHERE telegram_id = '7724932428'");
    
    if (!userRes.rows[0]) {
        console.log('User NOT found by telegram_id');
        return;
    }
    
    const user = userRes.rows[0];
    console.log('User found:', user);
    
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