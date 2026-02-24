const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('ErIobhbhqwe2p-!k', 12);
    await pool.query(`
      INSERT INTO users (
        odid, username, email, password, balance, bonus_balance, currency,
        vip_level, vip_points, is_verified, is_admin, is_active, b2b_user_id,
        referral_code
      ) VALUES (
        'AUREX-000001', 'ADMIN', 'admin@aurex.io', $1, 100000, 0, 'RUB',
        5, 999999, true, true, true, 'aurex_admin_001', 'ADMIN001'
      ) ON CONFLICT (username) DO UPDATE SET password = $1, is_admin = true
    `, [adminPassword]);
    
    // Create test user
    const testPassword = await bcrypt.hash('test123', 12);
    await pool.query(`
      INSERT INTO users (
        odid, username, email, password, balance, bonus_balance, currency,
        vip_level, vip_points, is_verified, is_admin, is_active, b2b_user_id,
        referral_code
      ) VALUES (
        'AUREX-000002', 'testuser', 'test@aurex.io', $1, 50000, 0, 'RUB',
        3, 15000, true, false, true, 'aurex_user_001', 'TEST001'
      ) ON CONFLICT (username) DO NOTHING
    `, [testPassword]);
    
    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', 12);
    await pool.query(`
      INSERT INTO users (
        odid, username, email, password, balance, bonus_balance, currency,
        vip_level, vip_points, is_verified, is_admin, is_active, b2b_user_id,
        referral_code
      ) VALUES (
        'AUREX-000003', 'demo', 'demo@aurex.io', $1, 10000, 0, 'RUB',
        1, 500, true, false, true, 'aurex_demo_001', 'DEMO001'
      ) ON CONFLICT (username) DO NOTHING
    `, [demoPassword]);
    
    // Initialize site settings
    await pool.query(`
      INSERT INTO settings (key, value, category) VALUES
      ('vip_config', $1, 'vip'),
      ('jackpot_config', $2, 'jackpots'),
      ('platform_stats', $3, 'stats')
      ON CONFLICT (key) DO NOTHING
    `, [
      JSON.stringify({
        bronzePoints: 0,
        silverPoints: 1000,
        goldPoints: 5000,
        platinumPoints: 25000,
        emperorPoints: 100000,
        bronzeCashback: 5,
        silverCashback: 7,
        goldCashback: 10,
        platinumCashback: 12,
        emperorCashback: 15
      }),
      JSON.stringify({
        pools: [
          { id: 'emperor', name: 'EMPEROR JACKPOT', nameRu: 'Императорский', amount: 15847623, color: 'from-purple-500 to-pink-500', minBet: 100 },
          { id: 'gold', name: 'GOLD JACKPOT', nameRu: 'Золотой', amount: 2456789, color: 'from-aurex-gold-500 to-amber-500', minBet: 50 },
          { id: 'silver', name: 'SILVER JACKPOT', nameRu: 'Серебряный', amount: 547821, color: 'from-gray-400 to-gray-500', minBet: 20 },
          { id: 'bronze', name: 'BRONZE JACKPOT', nameRu: 'Бронзовый', amount: 89456, color: 'from-amber-700 to-amber-800', minBet: 5 }
        ],
        contributionPercent: 0.5,
        lastWinners: []
      }),
      JSON.stringify({
        activePlayers: '2,847',
        gamesAvailable: '2,500+',
        totalPayouts: '₽285M',
        averageRtp: '98.5%'
      })
    ]);
    
    console.log('✅ Database seeded successfully');
    console.log('👤 Users created:');
    console.log('   🔑 admin / admin123 (VIP Emperor)');
    console.log('   🔑 testuser / test123 (VIP Gold)');
    console.log('   🔑 demo / demo123 (VIP Bronze)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();
