require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  console.log('🚀 Running AUREX Bot migrations...');
  
  try {
    const migrationFile = path.join(__dirname, '001_support_tables.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migrations completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - support_managers');
    console.log('   - bot_conversations');
    console.log('   - support_tickets');
    console.log('   - support_ticket_messages');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigrations();
