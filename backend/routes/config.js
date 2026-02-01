const express = require('express');
const { User, GameSession, Transaction } = require('../models/temp-models');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// ===================== VIP LEVELS =====================

// VIP configuration - editable by admin
global.vipConfig = global.vipConfig || {
  levels: [
    {
      level: 1,
      name: 'Bronze',
      nameRu: 'Бронза',
      icon: '🥉',
      color: 'from-amber-700 to-amber-800',
      pointsRequired: 0,
      cashbackPercent: 5,
      weeklyBonus: 1000,
      birthdayBonus: 5000,
      withdrawalPriority: 'standard',
      withdrawalLimit: 100000,
      personalManager: false,
      exclusiveGames: false,
      inviteEvents: false,
      benefits: [
        'Кэшбэк 5%',
        'Доступ к турнирам',
        'Бонус на день рождения ₽5,000'
      ]
    },
    {
      level: 2,
      name: 'Silver',
      nameRu: 'Серебро',
      icon: '🥈',
      color: 'from-gray-400 to-gray-500',
      pointsRequired: 5000,
      cashbackPercent: 7,
      weeklyBonus: 2500,
      birthdayBonus: 10000,
      withdrawalPriority: 'priority',
      withdrawalLimit: 250000,
      personalManager: false,
      exclusiveGames: false,
      inviteEvents: false,
      benefits: [
        'Кэшбэк 7%',
        'Приоритетные выплаты',
        'Еженедельный бонус ₽2,500',
        'Бонус на день рождения ₽10,000'
      ]
    },
    {
      level: 3,
      name: 'Gold',
      nameRu: 'Золото',
      icon: '🥇',
      color: 'from-aurex-gold-500 to-aurex-gold-600',
      pointsRequired: 25000,
      cashbackPercent: 10,
      weeklyBonus: 5000,
      birthdayBonus: 25000,
      withdrawalPriority: 'express',
      withdrawalLimit: 500000,
      personalManager: true,
      exclusiveGames: true,
      inviteEvents: false,
      benefits: [
        'Кэшбэк 10%',
        'Экспресс-выплаты',
        'Персональный менеджер',
        'Доступ к VIP играм',
        'Еженедельный бонус ₽5,000',
        'Бонус на день рождения ₽25,000'
      ]
    },
    {
      level: 4,
      name: 'Platinum',
      nameRu: 'Платина',
      icon: '💎',
      color: 'from-cyan-400 to-blue-500',
      pointsRequired: 100000,
      cashbackPercent: 12,
      weeklyBonus: 10000,
      birthdayBonus: 50000,
      withdrawalPriority: 'instant',
      withdrawalLimit: 1000000,
      personalManager: true,
      exclusiveGames: true,
      inviteEvents: true,
      benefits: [
        'Кэшбэк 12%',
        'Мгновенные выплаты',
        'VIP менеджер 24/7',
        'Эксклюзивные игры',
        'Приглашения на VIP события',
        'Еженедельный бонус ₽10,000',
        'Бонус на день рождения ₽50,000'
      ]
    },
    {
      level: 5,
      name: 'Emperor',
      nameRu: 'Император',
      icon: '👑',
      color: 'from-purple-500 to-pink-500',
      pointsRequired: 500000,
      cashbackPercent: 15,
      weeklyBonus: 25000,
      birthdayBonus: 100000,
      withdrawalPriority: 'instant',
      withdrawalLimit: null, // Без лимита
      personalManager: true,
      exclusiveGames: true,
      inviteEvents: true,
      benefits: [
        'Кэшбэк 15%',
        'Безлимитные выплаты',
        'Персональный VIP менеджер',
        'Все эксклюзивные игры',
        'VIP события и подарки',
        'Еженедельный бонус ₽25,000',
        'Бонус на день рождения ₽100,000',
        'Особые условия бонусов'
      ]
    }
  ],
  pointsPerRub: 100, // ₽100 = 1 VIP очко
  pointsMultiplierSlots: 1,
  pointsMultiplierTable: 0.5,
  pointsMultiplierLive: 0.5
};

// GET /api/config/vip - Get VIP levels configuration
router.get('/vip', async (req, res) => {
  try {
    res.json({
      success: true,
      data: global.vipConfig
    });
  } catch (error) {
    console.error('Get VIP config error:', error);
    res.status(500).json({ success: false, error: 'Failed to get VIP config' });
  }
});

// GET /api/config/vip/my-level - Get user's VIP level info
router.get('/vip/my-level', auth, async (req, res) => {
  try {
    const userResult = User.findById(req.user.id);
    const user = await userResult.select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userLevel = user.vipLevel || 1;
    const currentLevel = global.vipConfig.levels.find(l => l.level === userLevel) || global.vipConfig.levels[0];
    const nextLevel = global.vipConfig.levels.find(l => l.level === userLevel + 1);
    
    const userPoints = user.vipPoints || 0;
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
        pointsPerRub: global.vipConfig.pointsPerRub
      }
    });
  } catch (error) {
    console.error('Get user VIP level error:', error);
    res.status(500).json({ success: false, error: 'Failed to get VIP level' });
  }
});

// ===================== JACKPOTS =====================

// Jackpot configuration
global.jackpotConfig = global.jackpotConfig || {
  pools: [
    { id: 'emperor', name: 'EMPEROR JACKPOT', nameRu: 'Императорский', amount: 15847623, color: 'from-purple-500 to-pink-500', minBet: 100 },
    { id: 'gold', name: 'GOLD JACKPOT', nameRu: 'Золотой', amount: 2456789, color: 'from-aurex-gold-500 to-amber-500', minBet: 50 },
    { id: 'silver', name: 'SILVER JACKPOT', nameRu: 'Серебряный', amount: 547821, color: 'from-gray-400 to-gray-500', minBet: 20 },
    { id: 'bronze', name: 'BRONZE JACKPOT', nameRu: 'Бронзовый', amount: 89456, color: 'from-amber-700 to-amber-800', minBet: 5 }
  ],
  contributionPercent: 0.5, // 0.5% от каждой ставки идёт в джекпот
  lastWinners: []
};

// Simulate jackpot growth
setInterval(() => {
  global.jackpotConfig.pools.forEach(pool => {
    // Random growth based on "bets"
    const growth = Math.random() * (pool.id === 'emperor' ? 500 : pool.id === 'gold' ? 100 : pool.id === 'silver' ? 20 : 5);
    pool.amount += growth;
  });
}, 3000);

// GET /api/config/jackpots - Get jackpot info
router.get('/jackpots', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pools: global.jackpotConfig.pools.map(p => ({
          ...p,
          amount: Math.round(p.amount)
        })),
        lastWinners: global.jackpotConfig.lastWinners.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get jackpots error:', error);
    res.status(500).json({ success: false, error: 'Failed to get jackpots' });
  }
});

// ===================== PLATFORM STATS =====================

// GET /api/config/stats - Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    // Calculate real stats from data
    const totalUsers = await User.countDocuments();
    
    const depositStats = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalDeposits = depositStats[0]?.total || 0;
    
    // Calculate total payouts (withdrawals + wins)
    const payoutStats = await Transaction.aggregate([
      { $match: { type: 'withdrawal', status: 'completed' } },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
    ]);
    
    const totalPayouts = payoutStats[0]?.total || 0;

    // Active users (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: yesterday } });

    // Format stats
    const stats = {
      activePlayers: activeUsers > 1000 ? `${Math.round(activeUsers / 1000)}K+` : `${Math.max(50000, totalUsers).toLocaleString('ru-RU')}+`,
      totalPlayers: Math.max(50000, totalUsers),
      gamesAvailable: '2,500+',
      gamesCount: 2500,
      totalPayouts: totalPayouts > 1000000 
        ? `₽${Math.round(totalPayouts / 1000000)}М+` 
        : totalPayouts > 1000 
          ? `₽${Math.round(totalPayouts / 1000)}K+`
          : `₽${Math.max(500000000, totalPayouts).toLocaleString('ru-RU')}+`,
      totalPayoutsRaw: Math.max(500000000, totalPayouts),
      averageRtp: '97.5%',
      rtpValue: 97.5,
      onlineNow: Math.floor(Math.random() * 2000) + 3000, // Simulated online
      todayDeposits: depositStats[0]?.total || 0,
      todayPayouts: payoutStats[0]?.total || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// ===================== GAMES CATALOG =====================

// Games configuration
global.gamesConfig = global.gamesConfig || {
  providers: [
    { id: 'pragmatic', name: 'Pragmatic Play', logo: '/images/providers/pragmatic.png' },
    { id: 'netent', name: 'NetEnt', logo: '/images/providers/netent.png' },
    { id: 'microgaming', name: 'Microgaming', logo: '/images/providers/microgaming.png' },
    { id: 'playngo', name: "Play'n GO", logo: '/images/providers/playngo.png' },
    { id: 'evolution', name: 'Evolution Gaming', logo: '/images/providers/evolution.png' },
    { id: 'yggdrasil', name: 'Yggdrasil', logo: '/images/providers/yggdrasil.png' },
  ],
  categories: [
    { id: 'slots', name: 'Слоты', icon: '🎰' },
    { id: 'live', name: 'Live Casino', icon: '🎥' },
    { id: 'table', name: 'Настольные', icon: '🃏' },
    { id: 'jackpot', name: 'Джекпоты', icon: '💰' },
    { id: 'new', name: 'Новинки', icon: '✨' },
    { id: 'popular', name: 'Популярные', icon: '🔥' },
  ],
  games: [
    // Popular Slots
    { id: 'gates-of-olympus', name: 'Gates of Olympus', provider: 'pragmatic', category: 'slots', rtp: 96.5, volatility: 'high', image: '/images/games/gates-olympus.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'sweet-bonanza', name: 'Sweet Bonanza', provider: 'pragmatic', category: 'slots', rtp: 96.48, volatility: 'high', image: '/images/games/sweet-bonanza.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'big-bass-bonanza', name: 'Big Bass Bonanza', provider: 'pragmatic', category: 'slots', rtp: 96.71, volatility: 'high', image: '/images/games/big-bass.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'dog-house', name: 'The Dog House', provider: 'pragmatic', category: 'slots', rtp: 96.51, volatility: 'high', image: '/images/games/dog-house.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'book-of-dead', name: 'Book of Dead', provider: 'playngo', category: 'slots', rtp: 96.21, volatility: 'high', image: '/images/games/book-of-dead.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'starburst', name: 'Starburst', provider: 'netent', category: 'slots', rtp: 96.09, volatility: 'low', image: '/images/games/starburst.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'gonzo-quest', name: "Gonzo's Quest", provider: 'netent', category: 'slots', rtp: 95.97, volatility: 'medium', image: '/images/games/gonzo-quest.jpg', isNew: false, isHot: false, jackpot: false },
    { id: 'reactoonz', name: 'Reactoonz', provider: 'playngo', category: 'slots', rtp: 96.51, volatility: 'high', image: '/images/games/reactoonz.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'wolf-gold', name: 'Wolf Gold', provider: 'pragmatic', category: 'slots', rtp: 96.01, volatility: 'medium', image: '/images/games/wolf-gold.jpg', isNew: false, isHot: false, jackpot: true },
    { id: 'fire-joker', name: 'Fire Joker', provider: 'playngo', category: 'slots', rtp: 96.15, volatility: 'high', image: '/images/games/fire-joker.jpg', isNew: false, isHot: false, jackpot: false },
    // New Games
    { id: 'sugar-rush', name: 'Sugar Rush', provider: 'pragmatic', category: 'slots', rtp: 96.5, volatility: 'high', image: '/images/games/sugar-rush.jpg', isNew: true, isHot: true, jackpot: false },
    { id: 'starlight-princess', name: 'Starlight Princess', provider: 'pragmatic', category: 'slots', rtp: 96.5, volatility: 'high', image: '/images/games/starlight-princess.jpg', isNew: true, isHot: true, jackpot: false },
    { id: 'zeus-vs-hades', name: 'Zeus vs Hades', provider: 'pragmatic', category: 'slots', rtp: 96.07, volatility: 'high', image: '/images/games/zeus-hades.jpg', isNew: true, isHot: false, jackpot: false },
    // Jackpot Games
    { id: 'mega-moolah', name: 'Mega Moolah', provider: 'microgaming', category: 'jackpot', rtp: 88.12, volatility: 'medium', image: '/images/games/mega-moolah.jpg', isNew: false, isHot: true, jackpot: true },
    { id: 'divine-fortune', name: 'Divine Fortune', provider: 'netent', category: 'jackpot', rtp: 96.59, volatility: 'medium', image: '/images/games/divine-fortune.jpg', isNew: false, isHot: false, jackpot: true },
    // Live Casino
    { id: 'crazy-time', name: 'Crazy Time', provider: 'evolution', category: 'live', rtp: 96.08, volatility: 'high', image: '/images/games/crazy-time.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'lightning-roulette', name: 'Lightning Roulette', provider: 'evolution', category: 'live', rtp: 97.3, volatility: 'medium', image: '/images/games/lightning-roulette.jpg', isNew: false, isHot: true, jackpot: false },
    { id: 'blackjack-vip', name: 'Blackjack VIP', provider: 'evolution', category: 'live', rtp: 99.5, volatility: 'low', image: '/images/games/blackjack-vip.jpg', isNew: false, isHot: false, jackpot: false },
    { id: 'monopoly-live', name: 'Monopoly Live', provider: 'evolution', category: 'live', rtp: 96.23, volatility: 'medium', image: '/images/games/monopoly-live.jpg', isNew: false, isHot: true, jackpot: false },
    // Table Games
    { id: 'european-roulette', name: 'European Roulette', provider: 'netent', category: 'table', rtp: 97.3, volatility: 'medium', image: '/images/games/european-roulette.jpg', isNew: false, isHot: false, jackpot: false },
    { id: 'blackjack-classic', name: 'Blackjack Classic', provider: 'netent', category: 'table', rtp: 99.5, volatility: 'low', image: '/images/games/blackjack-classic.jpg', isNew: false, isHot: false, jackpot: false },
    { id: 'baccarat-pro', name: 'Baccarat Pro', provider: 'netent', category: 'table', rtp: 98.94, volatility: 'low', image: '/images/games/baccarat-pro.jpg', isNew: false, isHot: false, jackpot: false },
  ]
};

// GET /api/config/games - Get games catalog
router.get('/games', async (req, res) => {
  try {
    const { category, provider, search, page = 1, limit = 24 } = req.query;
    
    let games = [...global.gamesConfig.games];
    
    // Filter by category
    if (category && category !== 'all') {
      if (category === 'popular') {
        games = games.filter(g => g.isHot);
      } else if (category === 'new') {
        games = games.filter(g => g.isNew);
      } else {
        games = games.filter(g => g.category === category);
      }
    }
    
    // Filter by provider
    if (provider && provider !== 'all') {
      games = games.filter(g => g.provider === provider);
    }
    
    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      games = games.filter(g => 
        g.name.toLowerCase().includes(searchLower) ||
        g.provider.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedGames = games.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        games: paginatedGames,
        providers: global.gamesConfig.providers,
        categories: global.gamesConfig.categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: games.length,
          pages: Math.ceil(games.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ success: false, error: 'Failed to get games' });
  }
});

// GET /api/config/games/:gameId - Get single game info
router.get('/games/:gameId', async (req, res) => {
  try {
    const game = global.gamesConfig.games.find(g => g.id === req.params.gameId);
    
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    
    const provider = global.gamesConfig.providers.find(p => p.id === game.provider);
    
    res.json({
      success: true,
      data: {
        ...game,
        providerInfo: provider
      }
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ success: false, error: 'Failed to get game' });
  }
});

// ===================== REFERRAL TIERS =====================

global.referralConfig = global.referralConfig || {
  tiers: [
    { level: 1, name: 'Новичок', requiredReferrals: 0, commissionPercent: 10, bonus: 0 },
    { level: 2, name: 'Партнёр', requiredReferrals: 5, commissionPercent: 12, bonus: 500 },
    { level: 3, name: 'Эксперт', requiredReferrals: 15, commissionPercent: 15, bonus: 2000 },
    { level: 4, name: 'Мастер', requiredReferrals: 30, commissionPercent: 18, bonus: 5000 },
    { level: 5, name: 'Легенда', requiredReferrals: 50, commissionPercent: 20, bonus: 15000 }
  ],
  minWithdrawal: 500,
  payoutDay: 'monday' // Выплаты по понедельникам
};

// GET /api/config/referral - Get referral configuration
router.get('/referral', async (req, res) => {
  try {
    res.json({
      success: true,
      data: global.referralConfig
    });
  } catch (error) {
    console.error('Get referral config error:', error);
    res.status(500).json({ success: false, error: 'Failed to get referral config' });
  }
});

// ===================== SUPPORT INFO =====================

global.supportConfig = global.supportConfig || {
  contacts: {
    email: 'support@aurex.io',
    telegram: '@aurex_support',
    liveChat: true
  },
  schedule: {
    chat: '24/7',
    email: 'Пн-Вс, ответ до 24ч',
    vip: '24/7 приоритет (Gold+)'
  },
  stats: {
    avgResponseTime: '< 1 мин',
    emailResponseTime: '< 24ч',
    satisfactionRate: '98%'
  },
  categories: [
    { id: 'deposit', name: 'Депозит', icon: '💳' },
    { id: 'withdrawal', name: 'Вывод средств', icon: '💰' },
    { id: 'bonus', name: 'Бонусы', icon: '🎁' },
    { id: 'game', name: 'Игры', icon: '🎮' },
    { id: 'account', name: 'Аккаунт', icon: '👤' },
    { id: 'other', name: 'Другое', icon: '❓' }
  ]
};

// GET /api/config/support - Get support info
router.get('/support', async (req, res) => {
  try {
    res.json({
      success: true,
      data: global.supportConfig
    });
  } catch (error) {
    console.error('Get support config error:', error);
    res.status(500).json({ success: false, error: 'Failed to get support config' });
  }
});

// ===================== PROMOTIONS =====================

global.promotionsConfig = global.promotionsConfig || {
  welcomePackage: [
    {
      id: 'first-deposit',
      title: 'Первый Депозит',
      subtitle: 'Императорский Старт',
      description: 'Начните свой путь в Golden Empire с невероятным бонусом!',
      bonus: '200%',
      bonusType: 'percent',
      maxBonus: 'до ₽50,000',
      minDeposit: '₽1,000',
      wagering: 'x35',
      validDays: 7,
      image: '/images/promos/deposit-1.png',
      gradient: 'from-aurex-gold-500 via-amber-500 to-yellow-600',
      features: ['200% на первый депозит', '100 фриспинов на Gates of Olympus', 'Моментальное начисление'],
      isNew: true,
      isHot: true
    },
    {
      id: 'second-deposit',
      title: 'Второй Депозит',
      subtitle: 'Золотое Усиление',
      description: 'Продолжайте восхождение к вершинам!',
      bonus: '150%',
      bonusType: 'percent',
      maxBonus: 'до ₽40,000',
      minDeposit: '₽1,000',
      wagering: 'x35',
      validDays: 7,
      image: '/images/promos/deposit-2.png',
      gradient: 'from-aurex-platinum-300 via-gray-400 to-aurex-platinum-500',
      features: ['150% на второй депозит', '75 фриспинов на Sweet Bonanza']
    },
    {
      id: 'third-deposit',
      title: 'Третий Депозит',
      subtitle: 'Платиновый Рывок',
      description: 'Закрепите успех третьим бонусом!',
      bonus: '100%',
      bonusType: 'percent',
      maxBonus: 'до ₽30,000',
      minDeposit: '₽1,000',
      wagering: 'x30',
      validDays: 7,
      image: '/images/promos/deposit-3.png',
      gradient: 'from-purple-500 via-violet-500 to-indigo-600',
      features: ['100% на третий депозит', '50 фриспинов на Big Bass Bonanza']
    },
    {
      id: 'fourth-deposit',
      title: 'Четвёртый Депозит',
      subtitle: 'Алмазный Финал',
      description: 'Завершите приветственный пакет с максимальной выгодой!',
      bonus: '75%',
      bonusType: 'percent',
      maxBonus: 'до ₽20,000',
      minDeposit: '₽1,000',
      wagering: 'x30',
      validDays: 7,
      image: '/images/promos/deposit-4.png',
      gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      features: ['75% на четвёртый депозит', '75 фриспинов на выбор']
    }
  ],
  reloadBonuses: [
    {
      id: 'weekend-reload',
      title: 'Weekend Reload',
      subtitle: 'Выходной Заряд',
      description: 'Каждые выходные получайте дополнительный бонус!',
      bonus: '50%',
      bonusType: 'percent',
      maxBonus: 'до ₽25,000',
      minDeposit: '₽500',
      wagering: 'x25',
      validDays: 2,
      schedule: 'Сб-Вс',
      image: '/images/promos/bonus.png',
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      features: ['Каждую субботу и воскресенье', 'Автоматическое начисление']
    },
    {
      id: 'monday-boost',
      title: 'Monday Boost',
      subtitle: 'Понедельник Удачи',
      description: 'Начните неделю с дополнительного бонуса!',
      bonus: '30%',
      bonusType: 'percent',
      maxBonus: 'до ₽15,000',
      minDeposit: '₽500',
      wagering: 'x20',
      validDays: 1,
      schedule: 'Пн',
      image: '/images/promos/cashback.png',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      features: ['Каждый понедельник', 'Минимальный вейджер x20']
    }
  ],
  cashbackBonuses: [
    {
      id: 'weekly-cashback',
      title: 'Еженедельный Кэшбэк',
      subtitle: 'Возврат до 15%',
      description: 'Получайте часть проигрыша обратно каждую неделю!',
      bonus: 'до 15%',
      bonusType: 'cashback',
      maxBonus: 'до ₽150,000',
      wagering: 'x3 для VIP',
      schedule: 'Каждую субботу',
      image: '/images/promos/cashback.png',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      features: ['8% для обычных игроков', '15% для VIP', 'Начисляется автоматически'],
      isHot: true
    }
  ],
  cryptoBonuses: [
    {
      id: 'crypto-bonus',
      title: 'Крипто Бонус',
      subtitle: '+10% к депозиту',
      description: 'Дополнительный бонус за пополнение криптовалютой!',
      bonus: '+10%',
      bonusType: 'crypto',
      maxBonus: 'без лимита',
      wagering: 'x25',
      image: '/images/promos/crypto.jpg',
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      features: ['Bitcoin, Ethereum, USDT', 'Мгновенное зачисление', 'Дополнительно к основному бонусу'],
      isCrypto: true
    }
  ],
  vipBonuses: [
    {
      id: 'vip-reload',
      title: 'VIP Reload',
      subtitle: 'Эксклюзивный бонус',
      description: 'Специальные условия для VIP игроков!',
      bonus: 'до 100%',
      bonusType: 'vip',
      maxBonus: 'до ₽100,000',
      wagering: 'x15',
      image: '/images/promos/bonus.png',
      gradient: 'from-aurex-gold-500 via-amber-400 to-yellow-500',
      features: ['Персональный менеджер', 'Ускоренные выплаты', 'Эксклюзивные турниры'],
      isVip: true,
      isLocked: true
    }
  ]
};

// GET /api/config/promotions - Get all promotions
router.get('/promotions', async (req, res) => {
  try {
    res.json({
      success: true,
      data: global.promotionsConfig
    });
  } catch (error) {
    console.error('Get promotions config error:', error);
    res.status(500).json({ success: false, error: 'Failed to get promotions config' });
  }
});

// ===================== PAYMENT METHODS =====================

global.paymentMethodsConfig = global.paymentMethodsConfig || {
  crypto: [
    { id: 'btc', name: 'Bitcoin', icon: '₿', minDeposit: 500, maxDeposit: 10000000, minWithdraw: 1000, maxWithdraw: 5000000, processingTime: '10-30 мин', fee: 0 },
    { id: 'eth', name: 'Ethereum', icon: 'Ξ', minDeposit: 500, maxDeposit: 10000000, minWithdraw: 1000, maxWithdraw: 5000000, processingTime: '5-15 мин', fee: 0 },
    { id: 'usdt', name: 'USDT TRC20', icon: '₮', minDeposit: 500, maxDeposit: 10000000, minWithdraw: 1000, maxWithdraw: 5000000, processingTime: '1-5 мин', fee: 0 },
    { id: 'ltc', name: 'Litecoin', icon: 'Ł', minDeposit: 500, maxDeposit: 5000000, minWithdraw: 1000, maxWithdraw: 2000000, processingTime: '5-15 мин', fee: 0 }
  ],
  fiat: [
    { id: 'card', name: 'Visa/Mastercard', icon: '💳', minDeposit: 1000, maxDeposit: 500000, minWithdraw: 2000, maxWithdraw: 300000, processingTime: '1-24 часа', fee: 2 },
    { id: 'sbp', name: 'СБП', icon: '⚡', minDeposit: 500, maxDeposit: 300000, minWithdraw: 1000, maxWithdraw: 200000, processingTime: 'Мгновенно', fee: 0 },
    { id: 'qiwi', name: 'QIWI', icon: '🟢', minDeposit: 500, maxDeposit: 200000, minWithdraw: 1000, maxWithdraw: 150000, processingTime: '1-12 часов', fee: 3 },
    { id: 'yoomoney', name: 'ЮMoney', icon: '🟣', minDeposit: 500, maxDeposit: 200000, minWithdraw: 1000, maxWithdraw: 150000, processingTime: '1-24 часа', fee: 3 }
  ]
};

// GET /api/config/payment-methods - Get payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    res.json({
      success: true,
      data: global.paymentMethodsConfig
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment methods' });
  }
});

// GET /api/config/providers - Get game providers
router.get('/providers', async (req, res) => {
  try {
    const providers = global.gamesConfig?.providers || [
      'Pragmatic Play', 'NetEnt', 'Microgaming', 'Play\'n GO', 
      'Evolution', 'Yggdrasil', 'Red Tiger', 'Big Time Gaming',
      'Hacksaw Gaming', 'Push Gaming', 'Relax Gaming', 'Nolimit City'
    ];
    res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ success: false, error: 'Failed to get providers' });
  }
});

// ===================== ADMIN: UPDATE CONFIG =====================

// PUT /api/config/admin/vip - Update VIP config (admin)
router.put('/admin/vip', adminAuth, async (req, res) => {
  try {
    const { levels, pointsPerRub } = req.body;
    
    if (levels) global.vipConfig.levels = levels;
    if (pointsPerRub) global.vipConfig.pointsPerRub = pointsPerRub;
    
    res.json({
      success: true,
      message: 'VIP config updated',
      data: global.vipConfig
    });
  } catch (error) {
    console.error('Update VIP config error:', error);
    res.status(500).json({ success: false, error: 'Failed to update VIP config' });
  }
});

// PUT /api/config/admin/jackpots - Update jackpot amounts (admin)
router.put('/admin/jackpots', adminAuth, async (req, res) => {
  try {
    const { pools } = req.body;
    
    if (pools) {
      pools.forEach(update => {
        const pool = global.jackpotConfig.pools.find(p => p.id === update.id);
        if (pool && update.amount !== undefined) {
          pool.amount = update.amount;
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Jackpots updated',
      data: global.jackpotConfig
    });
  } catch (error) {
    console.error('Update jackpots error:', error);
    res.status(500).json({ success: false, error: 'Failed to update jackpots' });
  }
});

module.exports = router;
