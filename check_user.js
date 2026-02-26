const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || require('./backend/config/database').connectionString });

async function check() {
  try {
    console.log('Searching for pradaxx...');
    const res = await pool.query("SELECT id, username, balance, bonus_balance, odid FROM users WHERE username ILIKE '%pradaxx%' OR telegram_username ILIKE '%pradaxx%'");
    
    if (!res.rows[0]) {
        console.log('User not found');
        return;
    }
    
    const user = res.rows[0];
    console.log('User found:', user);
    
    const tx = await pool.query("SELECT id, amount, status, description, created_at, payment_method FROM transactions WHERE user_id = $1 AND type = 'withdrawal' ORDER BY created_at DESC LIMIT 3", [user.id]);
    console.log('Recent Withdrawals:', tx.rows);
    
    const bonus = await pool.query("SELECT * FROM bonuses WHERE user_id = $1 AND status = 'active'", [user.id]);
    console.log('Active Bonus:', bonus.rows[0]);
    
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();