const express = require('express');
const pool = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// ===================== CONFIG STORAGE =====================

// Helper to get config from DB with fallback to default
async function getConfig(key, defaultValue) {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    if (result.rows.length > 0) {
      const value = result.rows[0].value;
      return typeof value === 'string' ? JSON.parse(value) : value;
    }
  } catch (e) {
    console.error(`Error loading config ${key}:`, e.message);
  }
  return defaultValue;
}

// Helper to save config to DB
async function saveConfig(key, value) {
  try {
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value)]
    );
    return true;
  } catch (e) {
    console.error(`Error saving config ${key}:`, e.message);
    return false;
  }
}

// ===================== DEFAULT CONFIGS =====================

const defaultVipConfig = {
  levels: [
    { level: 1, name: 'Bronze', nameRu: 'Бронза', icon: '🥉', color: 'from-amber-700 to-amber-800', pointsRequired: 0, cashbackPercent: 5, weeklyBonus: 1000, birthdayBonus: 5000, benefits: ['Кэшбэк 5%', 'Доступ к турнирам'] },
    { level: 2, name: 'Silver', nameRu: 'Серебро', icon: '🥈', color: 'from-gray-400 to-gray-500', pointsRequired: 5000, cashbackPercent: 7, weeklyBonus: 2500, birthdayBonus: 10000, benefits: ['Кэшбэк 7%', 'Приоритетные выплаты'] },
    { level: 3, name: 'Gold', nameRu: 'Золото', icon: '🥇', color: 'from-aurex-gold-500 to-aurex-gold-600', pointsRequired: 25000, cashbackPercent: 10, weeklyBonus: 5000, birthdayBonus: 25000, benefits: ['Кэшбэк 10%', 'Персональный менеджер'] },
    { level: 4, name: 'Platinum', nameRu: 'Платина', icon: '💎', color: 'from-cyan-400 to-blue-500', pointsRequired: 100000, cashbackPercent: 12, weeklyBonus: 10000, birthdayBonus: 50000, benefits: ['Кэшбэк 12%', 'VIP менеджер 24/7'] },
    { level: 5, name: 'Emperor', nameRu: 'Император', icon: '👑', color: 'from-purple-500 to-pink-500', pointsRequired: 500000, cashbackPercent: 15, weeklyBonus: 25000, birthdayBonus: 100000, benefits: ['Кэшбэк 15%', 'Безлимитные выплаты'] }
  ],
  pointsPerRub: 100
};

const defaultJackpotConfig = {
  pools: [
    { id: 'emperor', name: 'EMPEROR JACKPOT', nameRu: 'Императорский', amount: 0, color: 'from-purple-500 to-pink-500', minBet: 100 },
    { id: 'gold', name: 'GOLD JACKPOT', nameRu: 'Золотой', amount: 0, color: 'from-aurex-gold-500 to-amber-500', minBet: 50 },
    { id: 'silver', name: 'SILVER JACKPOT', nameRu: 'Серебряный', amount: 0, color: 'from-gray-400 to-gray-500', minBet: 20 },
    { id: 'bronze', name: 'BRONZE JACKPOT', nameRu: 'Бронзовый', amount: 0, color: 'from-amber-700 to-amber-800', minBet: 5 }
  ],
  lastWinners: []
};

const defaultGamesConfig = {
  providers: [
    { id: 'pragmatic', name: 'Pragmatic Play' },
    { id: 'netent', name: 'NetEnt' },
    { id: 'microgaming', name: 'Microgaming' },
    { id: 'playngo', name: "Play'n GO" },
    { id: 'evolution', name: 'Evolution Gaming' },
    { id: 'yggdrasil', name: 'Yggdrasil' }
  ],
  categories: [
    { id: 'slots', name: 'Слоты', icon: '🎰' },
    { id: 'live', name: 'Live Casino', icon: '🎥' },
    { id: 'table', name: 'Настольные', icon: '🃏' },
    { id: 'jackpot', name: 'Джекпоты', icon: '💰' }
  ],
  games: [
    { id: 'gates-of-olympus', name: 'Gates of Olympus', provider: 'pragmatic', category: 'slots', rtp: 96.5, isHot: true },
    { id: 'sweet-bonanza', name: 'Sweet Bonanza', provider: 'pragmatic', category: 'slots', rtp: 96.48, isHot: true },
    { id: 'big-bass-bonanza', name: 'Big Bass Bonanza', provider: 'pragmatic', category: 'slots', rtp: 96.71, isHot: true },
    { id: 'book-of-dead', name: 'Book of Dead', provider: 'playngo', category: 'slots', rtp: 96.21, isHot: true },
    { id: 'starburst', name: 'Starburst', provider: 'netent', category: 'slots', rtp: 96.09, isHot: true },
    { id: 'crazy-time', name: 'Crazy Time', provider: 'evolution', category: 'live', rtp: 96.08, isHot: true },
    { id: 'lightning-roulette', name: 'Lightning Roulette', provider: 'evolution', category: 'live', rtp: 97.3, isHot: true },
    { id: 'mega-moolah', name: 'Mega Moolah', provider: 'microgaming', category: 'jackpot', rtp: 88.12, isHot: true, jackpot: true }
  ]
};

const defaultPaymentMethodsConfig = {
  fiat: [
    // AVE PAY — первые 2
    { id: 'P2P_SBP', name: 'СБП', iconUrl: '/images/payments/sbp.svg', minDeposit: 3000, maxDeposit: 300000, minWithdraw: null, depositFee: 0, withdrawFee: 5, provider: 'avepay', subtitle: 'от 3 000₽' },
    { id: 'P2P_CARD', name: 'Карта', iconUrl: '/images/payments/card.png', minDeposit: 5000, maxDeposit: 300000, minWithdraw: null, depositFee: 0, withdrawFee: 5, provider: 'avepay', subtitle: 'от 5 000₽' },
    // Nirvana NSPK — 3-й
    { id: 'NIRVANA_NSPK', name: 'НСПК QR', iconUrl: '/images/payments/nspk.jpg', minDeposit: 1000, maxDeposit: 150000, minWithdraw: null, depositFee: 0, withdrawFee: 5, provider: 'nirvana', subtitle: 'от 1 000₽' },
    // Rukassa
    { id: 'RUKASSA_CARD', name: 'Карта', iconUrl: '/images/payments/card.png', minDeposit: 1000, maxDeposit: 300000, minWithdraw: 5000, depositFee: 0, withdrawFee: 5, provider: 'rukassa', subtitle: 'от 1 000₽' },
    { id: 'RUKASSA_SBP', name: 'СБП', iconUrl: '/images/payments/sbp.svg', minDeposit: 1000, maxDeposit: 300000, minWithdraw: 5000, depositFee: 0, withdrawFee: 5, provider: 'rukassa', subtitle: 'от 1 000₽' },
    { id: 'RUKASSA_CRYPTO', name: 'Крипта', iconUrl: '/images/payments/usdt.svg', minDeposit: 100, maxDeposit: 300000, minWithdraw: 1000, depositFee: 0, withdrawFee: 5, provider: 'rukassa', subtitle: 'от 100₽' },
    // Nirvana Pay
    { id: 'NIRVANA_SBP', name: 'СБП', iconUrl: '/images/payments/sbp.svg', minDeposit: 100, maxDeposit: 100000, minWithdraw: 1000, depositFee: 13, withdrawFee: 5, provider: 'nirvana', subtitle: 'от 100₽' },
    { id: 'NIRVANA_C2C', name: 'Карта C2C', iconUrl: '/images/payments/card.png', minDeposit: 100, maxDeposit: 100000, minWithdraw: 1000, depositFee: 13, withdrawFee: 5, provider: 'nirvana', subtitle: 'от 100₽' },
  ],
  crypto: [],
  banks: [
    { code: 'nspk:100000000111', name: 'Сбербанк', iconUrl: '/images/payments/sber.svg' },
    { code: 'nspk:100000000004', name: 'Т-Банк', iconUrl: '/images/payments/tbank.svg' },
    { code: 'nspk:100000000005', name: 'ВТБ', iconUrl: '/images/payments/vtb.svg' },
    { code: 'nspk:100000000008', name: 'Альфа-Банк', iconUrl: '/images/payments/alfa.svg' },
    { code: 'nspk:100000000015', name: 'Газпромбанк', iconUrl: '/images/payments/gazprom.svg' },
    { code: 'nspk:100000000007', name: 'Открытие', iconUrl: '/images/payments/otkritie.svg' },
    { code: 'nspk:100000000035', name: 'Росбанк', iconUrl: '/images/payments/rosbank.svg' },
    { code: 'nspk:100000000006', name: 'Россельхозбанк', iconUrl: '/images/payments/rshb.svg' },
    { code: 'nspk:100000000025', name: 'Промсвязьбанк', iconUrl: '/images/payments/psb.svg' },
    { code: 'nspk:100000000013', name: 'Совкомбанк', iconUrl: '/images/payments/sovком.svg' },
    { code: 'nspk:100000000022', name: 'Почта Банк', iconUrl: '/images/payments/pochta.svg' },
    { code: 'nspk:100000000023', name: 'МКБ', iconUrl: '/images/payments/mkb.svg' },
    { code: 'nspk:100000000012', name: 'Райффайзенбанк', iconUrl: '/images/payments/raiffeisen.svg' },
    { code: 'nspk:100000000036', name: 'Уралсиб', iconUrl: '/images/payments/uralsib.svg' }
  ]
};

const defaultPromotionsConfig = {
  welcomePackage: [
    { 
      id: 'first-deposit', 
      title: 'Первый Депозит', 
      subtitle: 'Приветственный бонус',
      description: 'Получите 200% на первый депозит и начните своё путешествие в мир больших выигрышей!',
      bonus: '200%', 
      maxBonus: 'до ₽70,000', 
      minDeposit: '₽1,000', 
      wagering: 'x30',
      validDays: 30,
      features: ['200% на депозит', 'До ₽70,000 бонуса', '30 дней на отыгрыш'],
      isHot: true,
      isNew: true
    },
    { 
      id: 'second-deposit', 
      title: 'Второй Депозит',
      subtitle: 'Продолжение пакета',
      description: 'Второй шаг к богатству! Получите 150% бонуса на второй депозит.',
      bonus: '150%', 
      maxBonus: 'до ₽50,000', 
      minDeposit: '₽1,000', 
      wagering: 'x30',
      validDays: 30,
      features: ['150% на депозит', 'До ₽50,000 бонуса', '30 дней на отыгрыш']
    },
    { 
      id: 'third-deposit', 
      title: 'Третий Депозит',
      subtitle: 'Бонусный пакет',
      description: 'Третий депозит — ещё больше возможностей! 100% бонус ждёт вас.',
      bonus: '100%', 
      maxBonus: 'до ₽30,000', 
      minDeposit: '₽1,000', 
      wagering: 'x30',
      validDays: 30,
      features: ['100% на депозит', 'До ₽30,000 бонуса', '30 дней на отыгрыш']
    },
    { 
      id: 'fourth-deposit', 
      title: 'Четвёртый Депозит',
      subtitle: 'Финальный бонус',
      description: 'Завершите приветственный пакет и получите 75% на четвёртый депозит!',
      bonus: '75%', 
      maxBonus: 'до ₽20,000', 
      minDeposit: '₽1,000', 
      wagering: 'x30',
      validDays: 30,
      features: ['75% на депозит', 'До ₽20,000 бонуса', '30 дней на отыгрыш']
    }
  ],
  reloadBonuses: [],
  cashbackBonuses: [
    {
      id: 'weekly-cashback',
      title: 'Еженедельный кэшбэк',
      subtitle: 'Возврат проигрышей',
      description: 'Получайте до 15% кэшбэка каждую неделю в зависимости от вашего VIP уровня.',
      bonus: 'до 15%',
      maxBonus: 'без лимита',
      minDeposit: '₽500',
      wagering: 'x5',
      validDays: 7,
      features: ['Начисляется по понедельникам', 'Процент зависит от VIP', 'Низкий вейджер x5']
    }
  ],
  cryptoBonuses: [],
  vipBonuses: []
};

const defaultReferralConfig = {
  commissionModel: 'GGR',
  tiers: [
    { level: 1, name: 'Новичок', requiredReferrals: 0, commissionPercent: 10, bonus: 0 },
    { level: 2, name: 'Партнёр', requiredReferrals: 5, commissionPercent: 12, bonus: 100 },
    { level: 3, name: 'Эксперт', requiredReferrals: 15, commissionPercent: 15, bonus: 500 },
    { level: 4, name: 'Мастер', requiredReferrals: 30, commissionPercent: 18, bonus: 1500 },
    { level: 5, name: 'Легенда', requiredReferrals: 50, commissionPercent: 20, bonus: 5000 }
  ],
  minWithdrawal: 500,
  bloggerContact: 'https://t.me/pavel_aurex',
};

const defaultSupportConfig = {
  contacts: { email: 'support@aurex.casino', telegram: '@aurex_support', liveChat: true },
  schedule: { chat: '24/7', email: 'Пн-Вс, ответ до 24ч' }
};

// ===================== VIP LEVELS =====================

router.get('/vip', async (req, res) => {
  try {
    const config = await getConfig('vipConfig', defaultVipConfig);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Get VIP config error:', error);
    res.status(500).json({ success: false, error: 'Failed to get VIP config' });
  }
});

router.get('/vip/my-level', auth, async (req, res) => {
  try {
    const userResult = await pool.query('SELECT vip_level, vip_points FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.rows[0];
    const config = await getConfig('vipConfig', defaultVipConfig);
    
    const userLevel = user.vip_level || 1;
    const currentLevel = config.levels.find(l => l.level === userLevel) || config.levels[0];
    const nextLevel = config.levels.find(l => l.level === userLevel + 1);
    
    const userPoints = user.vip_points || 0;
    const pointsToNext = nextLevel ? nextLevel.pointsRequired - userPoints : 0;
    const progress = nextLevel ? ((userPoints - currentLevel.pointsRequired) / (nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100 : 100;

    res.json({
      success: true,
      data: {
        currentLevel,
        nextLevel,
        userPoints,
        pointsToNext: Math.max(0, pointsToNext),
        progress: Math.min(100, Math.max(0, progress)),
        pointsPerRub: config.pointsPerRub
      }
    });
  } catch (error) {
    console.error('Get user VIP level error:', error);
    res.status(500).json({ success: false, error: 'Failed to get VIP level' });
  }
});

// ===================== JACKPOTS =====================

router.get('/jackpots', async (req, res) => {
  try {
    const config = await getConfig('jackpotConfig', defaultJackpotConfig);
    
    // Jackpot amounts come from DB/config — no fake growth
    res.json({
      success: true,
      data: {
        pools: config.pools,
        lastWinners: config.lastWinners.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get jackpots error:', error);
    res.status(500).json({ success: false, error: 'Failed to get jackpots' });
  }
});

// ===================== PLATFORM STATS =====================

router.get('/stats', async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    const depositsResult = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'deposit' AND status = 'completed'");
    const withdrawalsResult = await pool.query("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE type = 'withdrawal' AND status = 'completed'");
    
    const totalUsers = parseInt(usersResult.rows[0].count) || 0;
    const totalDeposits = parseFloat(depositsResult.rows[0].total) || 0;
    const totalPayouts = parseFloat(withdrawalsResult.rows[0].total) || 0;

    // Считаем количество игр из БД
    let gamesCount = 0;
    try {
      const gamesResult = await pool.query('SELECT COUNT(*) FROM games');
      gamesCount = parseInt(gamesResult.rows[0].count) || 0;
    } catch (e) { /* таблица может не существовать */ }

    res.json({
      success: true,
      data: {
        activePlayers: totalUsers.toLocaleString('ru-RU'),
        totalPlayers: totalUsers,
        gamesAvailable: gamesCount > 0 ? gamesCount.toLocaleString('ru-RU') : '0',
        totalPayouts: `₽${totalPayouts.toLocaleString('ru-RU')}`,
        averageRtp: '96.5%',
        onlineNow: totalUsers > 0 ? Math.max(1, Math.floor(totalUsers * 0.05)) : 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// ===================== GAMES CATALOG =====================

router.get('/games', async (req, res) => {
  try {
    const { category, provider, search, page = 1, limit = 24 } = req.query;
    const config = await getConfig('gamesConfig', defaultGamesConfig);
    
    let games = [...config.games];
    
    if (category && category !== 'all') {
      if (category === 'popular') games = games.filter(g => g.isHot);
      else if (category === 'new') games = games.filter(g => g.isNew);
      else games = games.filter(g => g.category === category);
    }
    
    if (provider && provider !== 'all') {
      games = games.filter(g => g.provider === provider);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      games = games.filter(g => g.name.toLowerCase().includes(searchLower));
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedGames = games.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        games: paginatedGames,
        providers: config.providers,
        categories: config.categories,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: games.length }
      }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ success: false, error: 'Failed to get games' });
  }
});

router.get('/games/:gameId', async (req, res) => {
  try {
    const config = await getConfig('gamesConfig', defaultGamesConfig);
    const game = config.games.find(g => g.id === req.params.gameId);
    
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    
    const provider = config.providers.find(p => p.id === game.provider);
    res.json({ success: true, data: { ...game, providerInfo: provider } });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ success: false, error: 'Failed to get game' });
  }
});

// ===================== OTHER CONFIGS =====================

router.get('/referral', async (req, res) => {
  try {
    const config = await getConfig('referralConfig', defaultReferralConfig);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get referral config' });
  }
});

router.get('/support', async (req, res) => {
  try {
    const config = await getConfig('supportConfig', defaultSupportConfig);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get support config' });
  }
});

router.get('/promotions', async (req, res) => {
  try {
    const config = await getConfig('promotionsConfig', defaultPromotionsConfig);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get promotions config' });
  }
});

router.get('/payment-methods', async (req, res) => {
  try {
    const config = await getConfig('paymentMethodsConfig', defaultPaymentMethodsConfig);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get payment methods' });
  }
});

router.get('/providers', async (req, res) => {
  try {
    // Get real providers from Fundist game catalog
    const fundistService = require('../services/fundistApiService');
    const catalog = await fundistService.getFullList();
    
    if (catalog?.games && Array.isArray(catalog.games)) {
      // Count games per provider and sort by count (most games first)
      const providerMap = {};
      catalog.games.forEach(game => {
        const name = game.provider || game.MerchantName || game.SubMerchantName || '';
        if (name && name !== 'Unknown') {
          providerMap[name] = (providerMap[name] || 0) + 1;
        }
      });
      
      const providerList = Object.entries(providerMap)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
      
      return res.json({ success: true, data: providerList });
    }
    
    // Fallback to config
    const config = await getConfig('gamesConfig', defaultGamesConfig);
    res.json({ success: true, data: config.providers });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get providers' });
  }
});

// ===================== ADMIN: UPDATE CONFIG =====================

router.put('/admin/vip', adminAuth, async (req, res) => {
  try {
    const current = await getConfig('vipConfig', defaultVipConfig);
    const updated = { ...current, ...req.body };
    await saveConfig('vipConfig', updated);
    res.json({ success: true, message: 'VIP config updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update VIP config' });
  }
});

router.put('/admin/jackpots', adminAuth, async (req, res) => {
  try {
    const current = await getConfig('jackpotConfig', defaultJackpotConfig);
    const { pools } = req.body;
    
    if (pools) {
      pools.forEach(update => {
        const pool = current.pools.find(p => p.id === update.id);
        if (pool && update.amount !== undefined) {
          pool.amount = update.amount;
        }
      });
    }
    
    await saveConfig('jackpotConfig', current);
    res.json({ success: true, message: 'Jackpots updated', data: current });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update jackpots' });
  }
});

router.put('/admin/games', adminAuth, async (req, res) => {
  try {
    const current = await getConfig('gamesConfig', defaultGamesConfig);
    const updated = { ...current, ...req.body };
    await saveConfig('gamesConfig', updated);
    res.json({ success: true, message: 'Games config updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update games config' });
  }
});

router.put('/admin/promotions', adminAuth, async (req, res) => {
  try {
    const current = await getConfig('promotionsConfig', defaultPromotionsConfig);
    const updated = { ...current, ...req.body };
    await saveConfig('promotionsConfig', updated);
    res.json({ success: true, message: 'Promotions config updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update promotions config' });
  }
});

router.put('/admin/payment-methods', adminAuth, async (req, res) => {
  try {
    const current = await getConfig('paymentMethodsConfig', defaultPaymentMethodsConfig);
    const updated = { ...current, ...req.body };
    await saveConfig('paymentMethodsConfig', updated);
    res.json({ success: true, message: 'Payment methods updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update payment methods' });
  }
});

module.exports = router;
