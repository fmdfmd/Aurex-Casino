const express = require('express');
const { auth, optionalAuth } = require('../middleware/auth');
const fundistService = require('../services/fundistApiService');
const axios = require('axios');
const https = require('https');
const merchantFallback = require('../constants/fundistMerchants');
const pool = require('../config/database');
const router = express.Router();

// Routes

// Helper to determine category
const determineCategory = (game, categoriesMap) => {
  const mid = String(game.MerchantID || game.System || '');

  // 1. Provider-based detection (most reliable)
  const liveProviders = new Set([
    '998',  // Evolution
    '913',  // Pragmatic Play Live
    '990',  // BetGames.tv
    '983',  // Ezugi
    '934',  // LiveGames
    '980',  // LuckyStreak
    '968',  // SA Gaming
    '904',  // HoGaming
    '945',  // VivoGaming
    '866',  // WM Casino
    '314',  // ICONIC21 Live
    '814',  // Oriental Games
    '900',  // TVBet
  ]);
  if (liveProviders.has(mid)) return 'live';

  const sportProviders = new Set([
    '952',  // BetradarVS
    '974',  // Kiron
  ]);
  if (sportProviders.has(mid)) return 'sport';

  // 2. CategoryID-based detection (direct Fundist category IDs)
  const catIds = game.CategoryID || game.Categories || [];
  if (Array.isArray(catIds) && catIds.length > 0) {
    const catSet = new Set(catIds.map(String));
    const isSlot = catSet.has('16'); // CategoryID 16 = "Slots"

    // Live Casino (CategoryID 37) — always takes priority
    if (catSet.has('37')) return 'live';

    // Crash Games (CategoryID 3604)
    if (catSet.has('3604')) return 'crash';

    // Table games: CategoryID 7=Table, 1366=Roulette, 1364=Baccarat, 41=Blackjacks, 10=VideoPoker, 1368=Poker
    const tableIds = ['7', '1366', '1364', '41', '10', '1368'];
    const hasTable = tableIds.some(id => catSet.has(id));
    if (hasTable && !isSlot) return 'table';
    if (hasTable && isSlot) {
      // Ambiguous: both Slots and Table tags — check game name
      const nameObj = game.Name || {};
      const gameName = (typeof nameObj === 'string' ? nameObj : (nameObj.en || '')).toLowerCase();
      if (gameName.includes('roulette') || gameName.includes('blackjack') || gameName.includes('baccarat') || gameName.includes('poker') || gameName.includes('keno')) {
        return 'table';
      }
    }

    // Virtual Sports (CategoryID 84) — only if NOT also tagged as Slots
    if (catSet.has('84') && !isSlot) return 'sport';
  }

  return 'slots';
};

// Providers officially activated on SoftGamings production.
// Games from providers NOT in this set are hidden from the catalog.
// When SoftGamings activates a new provider, add its system ID here.
const ACTIVATED_PROVIDERS = new Set([
  '312',  // 7777Gaming (SG ID)
  '843',  // 7777Gaming (catalog ID)
  '924',  // 3 Oaks Gaming
  '842',  // NucleusGaming
  '845',  // AGTSoftware
  '892',  // EvoOSS — NetEnt + RedTiger bundle (catalog ID)
  '940',  // Evoplay (catalog ID)
  '967',  // AsiaGaming
  '773',  // Aviator Studio
  '791',  // AviatrixDirect
  '901',  // BGaming
  '956',  // Belatra
  '990',  // BetGames.tv
  '991',  // BetSoft
  '882',  // BetSolutions
  '952',  // BetradarVS
  '338',  // BigTimeGaming
  '923',  // CQ9
  '885',  // CT Interactive
  '929',  // ConceptGaming
  '998',  // Evolution
  '349',  // Evoplay
  '983',  // Ezugi
  '796',  // FBastards
  '827',  // Fa Chai
  '927',  // Fugaso
  '955',  // GameArt
  '879',  // Gamzix
  '930',  // Genii
  '976',  // Habanero
  '904',  // HoGaming
  '314',  // ICONIC21 Live
  '926',  // Igrosoft
  '834',  // JDB
  '819',  // JiliAsia
  '898',  // Kaga
  '874',  // Kalamba
  '934',  // LiveGames
  '980',  // LuckyStreak
  '899',  // Mascot Gaming
  '870',  // Microgaming
  '421',  // NetEnt
  '867',  // NetgameEntertainment
  '307',  // NovomaticGames
  '814',  // Oriental Games
  '777',  // OriginalGames
  '939',  // PGSoft
  '412',  // PLS
  '805',  // PeterAndSons
  '949',  // Platipus
  '828',  // PopiPlay
  '911',  // Push Gaming
  '420',  // RedTigerOSS
  '810',  // RevDev
  '902',  // RevolverGaming
  '968',  // SAGaming
  '947',  // SalsaTechnology
  '844',  // SimplePlay
  '869',  // SmartSoft
  '919',  // Spadegaming
  '959',  // Spinomenal
  '851',  // Spinthon
  '895',  // Spribe
  '900',  // TVBet
  '920',  // Thunderkick
  '422',  // TomHornGaming
  '849',  // TurboGames
  '872',  // Upgaming
  '797',  // UrgentGames
  '792',  // Victory Ark Gaming
  '945',  // VivoGaming
  '866',  // WMCasino
  '941',  // Wazdan
  '818',  // YGRGames
  '953',  // Yggdrasil
  '813',  // iMoon
  // --- Alt IDs (same providers, different catalog system IDs) ---
  '835',  // Kaga (alt of 898)
  '865',  // Habanero (alt of 976)
  '860',  // PLS Gaming (alt of 412)
  '987',  // TomHorn (alt of 422)
  // --- Additional providers (may or may not be activated by SG) ---
  '864',  // EurasianGaming
  '896',  // OnlyPlay
  '914',  // BeeFee
  '854',  // Betconstruct
  '816',  // InOut
  '974',  // Kiron
  '973',  // Endorphina
  // --- Pending activation (add here when SoftGamings confirms) ---
  // '960',  // PragmaticPlay
  // '913',  // PragmaticPlayLive
  // '850',  // HacksawGaming
  // '944',  // Play'n GO
  // '973',  // Endorphina
  // '892',  // EvoOSS (NetEnt/RedTiger bundle)
]);

// Get games list
router.get('/games', async (req, res) => {
  try {
    const apiData = await fundistService.getGamesList();
    
    // Create categories map for quick lookup
    const categoriesMap = {};
    if (apiData.categories && Array.isArray(apiData.categories)) {
      apiData.categories.forEach(cat => {
        categoriesMap[cat.ID] = cat;
      });
    }

    // Transform Fundist format to our frontend format
    let processedGames = [];
    
    // Log response structure for debugging
    console.log('Fundist response keys:', Object.keys(apiData));
    if (apiData.games) console.log('Games count:', apiData.games.length);
    if (apiData.merchants) console.log('Merchants count:', Object.keys(apiData.merchants).length);

    const merchants = apiData.merchants || {};

    // Provider tiers: higher tier → appears earlier in the catalog.
    // Within each tier, providers are interleaved round-robin so no provider
    // dominates long stretches of the feed (like top casinos do).
    const PROVIDER_TIER = {
      '911': 1,  // Push Gaming
      '901': 1,  // BGaming
      '973': 1,  // Endorphina
      '920': 1,  // Thunderkick
      '939': 1,  // PG Soft
      '895': 1,  // Spribe
      '953': 1,  // Yggdrasil
      '349': 2, '940': 2,  // Evoplay
      '872': 2,  // Upgaming
      '924': 2,  // 3 Oaks Gaming
      '956': 2,  // Belatra
      '959': 2,  // Spinomenal
      '976': 2, '865': 2,  // Habanero
      '955': 2,  // GameArt
      '879': 2,  // Gamzix
      '941': 2,  // Wazdan
      '874': 2,  // Kalamba
      '805': 2,  // Peter & Sons
      '899': 2,  // Mascot Gaming
      '338': 2,  // BigTimeGaming
      '870': 3,  // Microgaming
      '949': 3,  // Platipus
      '991': 3,  // BetSoft
      '923': 3,  // CQ9
      '927': 3,  // Fugaso
      '919': 3,  // Spadegaming
      '869': 3,  // SmartSoft
      '849': 3,  // TurboGames
      '422': 3, '987': 3,  // TomHorn
      '930': 3,  // Genii
      '885': 3,  // CT Interactive
      '926': 4,  // Igrosoft
      '307': 4,  // Novomatic
      '867': 4,  // Netgame
    };

    // Live casino providers — shown after all slot providers
    const liveProviderIds = new Set([
      '998',  // Evolution
      '913',  // Pragmatic Play Live
      '945',  // VivoGaming
      '990',  // BetGames.tv
      '980',  // LuckyStreak
      '983',  // Ezugi
      '904',  // HoGaming
      '866',  // WM Casino
      '814',  // Oriental Games
      '934',  // LiveGames
      '968',  // SA Gaming
      '900',  // TVBet
      '314',  // ICONIC21 Live
    ]);
    
    if (apiData.games && Array.isArray(apiData.games)) {
      const activatedGames = apiData.games.filter(game => {
        const mid = String(game.MerchantID || game.System || '');
        return ACTIVATED_PROVIDERS.has(mid);
      });
      console.log(`[games] Filtered: ${apiData.games.length} total → ${activatedGames.length} activated`);

      const PROVIDER_RENAME = {
        'AGTSoftware': 'AGT Software',
        'Aviator': 'Spribe',
        'AviatrixDirect': 'Aviatrix',
        'BetGames': 'BetGames.tv',
        'BetradarVS': 'Betradar VS',
        'Booongo': '3 Oaks Gaming',
        'CTGaming': 'CT Interactive',
        'ConceptGaming': 'Concept Gaming',
        'EurasianGaming': 'Eurasian Gaming',
        'EvoOSS': 'NetEnt / Red Tiger',
        'EvoSW': 'Evolution',
        'FaChai': 'Fa Chai',
        'IMoon': 'iMoon',
        'JiliAsia': 'Jili',
        'MGAsia': 'Microgaming',
        'MascotGaming': 'Mascot Gaming',
        'NetgameEntertainment': 'Netgame',
        'OrientalGames': 'Oriental Games',
        'OriginalGames': 'Original Games',
        'PGSoft': 'PG Soft',
        'Patagonia': 'Salsa Technology',
        'PeterAndSons': 'Peter & Sons',
        'PushGaming': 'Push Gaming',
        'RAWGames': 'RAW iGaming',
        'RevolverGaming': 'Revolver Gaming',
        'SAGaming': 'SA Gaming',
        'UrgentGames': 'Urgent Games',
        'VAGaming': 'Victory Ark Gaming',
        'WMCasino': 'WM Casino',
        'YGRGames': 'YGR Games',
      };

      activatedGames.forEach(game => {
        const merchantId = String(game.MerchantID || game.System || '');
        const merchantsName = merchants[merchantId]?.Name;
        const isPlaceholder = typeof merchantsName === 'string' && /^(Merchant|Provider)\s+\d+$/.test(merchantsName);

        let merchantName =
          (!isPlaceholder ? merchantsName : null) ||
          game.MerchantName ||
          game.SubMerchantName ||
          merchantFallback[merchantId] ||
          merchantsName ||
          (merchantId ? `Provider ${merchantId}` : 'Unknown');

        merchantName = PROVIDER_RENAME[merchantName] || merchantName;

        // Handle image: FullList has ImageFullPath, List has ImageURL (relative)
        let imageUrl = game.ImageFullPath;
        if (!imageUrl && game.ImageURL) {
          const rel = game.ImageURL.replace(/^\/gstatic/, '');
          imageUrl = `https://agstatic.com${rel}`;
        }
        const imageProxyUrl = imageUrl
          ? `/api/slots/img?u=${encodeURIComponent(String(imageUrl))}`
          : undefined;

        // Handle name
        const nameObj = game.Name || game.Trans || {};
        const gameName = (typeof nameObj === 'string') ? nameObj : (nameObj.en || nameObj.ru || Object.values(nameObj)[0] || 'Unknown');

        // RTP
        const rtp = parseFloat(game.RTP) || null;

        // Max win multiplier
        const maxMultiplier = parseFloat(game.MaxMultiplier) || null;

        const fundistSort = parseInt(game.Sort || game.GSort || '999999', 10);
        const isLive = liveProviderIds.has(merchantId);
        const sortScore = isLive ? 100_000_000 + Math.min(fundistSort, 99_999_999) : fundistSort;

        const uniqueId = `${merchantId}_${game.PageCode}`;
        processedGames.push({
          id: uniqueId,
          pageCode: game.PageCode,
          systemId: merchantId,
          name: gameName,
          provider: merchantName,
          image: imageProxyUrl,
          category: determineCategory(game, categoriesMap),
          hasDemo: String(game.hasDemo) === '1' || String(game.HasDemo) === '1',
          isNew: false,
          rtp,
          maxMultiplier,
          sortScore
        });
      });

      // Deduplicate
      const seenIds = new Set();
      processedGames = processedGames.filter(g => {
        if (seenIds.has(g.id)) return false;
        seenIds.add(g.id);
        return true;
      });

      // Split into slots and live
      const slotGames = processedGames.filter(g => !liveProviderIds.has(g.systemId));
      const liveGames = processedGames.filter(g => liveProviderIds.has(g.systemId));

      // --- Pinned top games (hand-picked, shown first) ---
      const PINNED_FIRST = [
        { name: 'Diver', provider: 'InOut' },
        { name: 'Lucky mines', provider: 'InOut' },
        { name: 'Chicken Road', provider: 'InOut' },
        { name: 'Mines', provider: 'InOut' },
      ];
      const PINNED_PROVIDERS = [
        ['Endorphina', ['Book of Vlad Dice', 'Power Balls', 'Mr. Jingle Bells', 'Jolly Santa', 'Xmas Burst', 'Lucky Streak 1000', 'Panda Strike', 'Vikings Way']],
        ['BGaming', ['Blazing Fire Pots Hold & Spin', 'UFO Pyramids', 'Always Up!', 'Yommi Rush', 'Wild Tiger 2', 'Lady Lucky Gun', 'Dragon Queen MEGAWAYS', 'Mystery Garden']],
        ['3 Oaks Gaming', ['777 Fruity Coins', '3 Jewel Crowns', '3 African Drums', 'Lava Coins', 'China Festival', '3 Coin Volcanoes', 'Hot Fire Fruits', '3 Pots of Egypt']],
        ['Habanero', ["Genie's Showtime", 'Mystic Shaman', 'Mystic Rings', 'Shamrock Quest', 'Baba Yaga', 'Jump! 2', 'Haunted Harbor', 'Glory Of Rome']],
        ['Evoplay', ['Velvet Gems', 'Adrenaline Rush', 'Plinko Blast', 'Oath Of Steel', 'Hot Slice', 'Young Buffalo Song', 'Chosen by the Gods', 'Tree of Light']],
        ['Belatra', ['Goose Boom Bang!', 'Blast the Bass', 'Make it Gold', 'Winter Thunder', "Cafe 50's", 'Tortuga CodeX', 'Lucky Bandits', 'X Towers']],
        ['Fugaso', ['Olympus Coin Link', 'Trinity Pharaoh Link', 'Trinity Diamond Link', 'Mexican Mania', 'Power Coin', 'Trump It Coin Link', 'Zeus Power Link', 'Hercules Power Wild']],
        ['PG Soft', ['Skylight Wonders', 'Pharaoh Royals', 'Galaxy Miner', 'Incan Wonders', 'Fortune Snake', "Geisha's Revenge", 'Chocolate Deluxe', 'Rio Fantasia']],
        ['Popiplay', ['Oktobearfest', 'Detective Donut Kickback', 'Wild Piggy Bank', 'Emotions', 'Bison Horizon Hold and Win', 'RoxDogs', 'Zoodiac', 'Ruby Royal']],
        ['Peter & Sons', ['DCirque']],
        ['Push Gaming', ['The Great Banker', 'Olympus Unleashed', 'Big Bamboo', 'Fire Hopper', 'Razor Shark', "Jammin' Jars 2", 'Mad Blast', 'Dragon Hopper']],
      ];

      const findGame = (list, name, prov) => {
        const nl = name.toLowerCase();
        const pl = prov.toLowerCase();
        return list.find(g =>
          (g.name || '').toLowerCase() === nl && (g.provider || '').toLowerCase().includes(pl)
        ) || list.find(g =>
          (g.name || '').toLowerCase().includes(nl) && (g.provider || '').toLowerCase().includes(pl)
        ) || list.find(g => (g.name || '').toLowerCase().includes(nl));
      };

      const pinnedIds = new Set();
      const pinnedSection = [];

      for (const { name, provider } of PINNED_FIRST) {
        const g = findGame(slotGames, name, provider);
        if (g && !pinnedIds.has(g.id)) { pinnedSection.push(g); pinnedIds.add(g.id); }
      }

      const provQueues = PINNED_PROVIDERS.map(([prov, names]) =>
        names.map(n => findGame(slotGames, n, prov)).filter(g => g && !pinnedIds.has(g.id))
      );
      const maxQ = Math.max(...provQueues.map(q => q.length), 0);
      for (let i = 0; i < maxQ; i++) {
        for (const q of provQueues) {
          if (i < q.length && !pinnedIds.has(q[i].id)) {
            pinnedSection.push(q[i]);
            pinnedIds.add(q[i].id);
          }
        }
      }
      console.log(`[games] Pinned top: ${pinnedSection.length} games`);

      // --- Remaining slots: interleave by provider tier (round-robin) ---
      const remainingSlots = slotGames.filter(g => !pinnedIds.has(g.id));

      const byProvider = new Map();
      for (const g of remainingSlots) {
        if (!byProvider.has(g.systemId)) byProvider.set(g.systemId, []);
        byProvider.get(g.systemId).push(g);
      }

      const providerOrder = [...byProvider.keys()].sort((a, b) => {
        const ta = PROVIDER_TIER[a] || 5;
        const tb = PROVIDER_TIER[b] || 5;
        if (ta !== tb) return ta - tb;
        return (byProvider.get(b)?.length || 0) - (byProvider.get(a)?.length || 0);
      });

      const interleaved = [];
      const cursors = new Map();
      providerOrder.forEach(pid => cursors.set(pid, 0));

      let remaining = remainingSlots.length;
      while (remaining > 0) {
        for (const pid of providerOrder) {
          const games = byProvider.get(pid);
          const idx = cursors.get(pid);
          if (idx < games.length) {
            interleaved.push(games[idx]);
            cursors.set(pid, idx + 1);
            remaining--;
          }
        }
      }

      liveGames.sort((a, b) => a.sortScore - b.sortScore);
      processedGames = [...pinnedSection, ...interleaved, ...liveGames];

      // Log category distribution
      const catDist = {};
      processedGames.forEach(g => { catDist[g.category] = (catDist[g.category] || 0) + 1; });
      console.log('[games] Category distribution:', JSON.stringify(catDist));
    }
    
    res.json({ 
      success: true, 
      data: {
        games: processedGames,
        total: processedGames.length
      }
    });
  } catch (error) {
    console.error('Error in /games endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Shared keep-alive agent for image proxying (reuses TCP connections)
const imgProxyAgent = new https.Agent({ family: 4, keepAlive: true, maxSockets: 50, maxFreeSockets: 10 });

// Image proxy (Fundist recommends caching/proxying game images).
// Allows only whitelisted hosts to avoid SSRF.
router.get('/img', async (req, res) => {
  const u = String(req.query.u || '');
  if (!u) return res.status(400).send('Missing u');

  let parsed;
  try {
    parsed = new URL(u);
  } catch {
    return res.status(400).send('Invalid url');
  }

  const allowedHosts = new Set(['agstatic.com', 'img.cdn-fundist.com']);
  if (!allowedHosts.has(parsed.hostname)) {
    return res.status(403).send('Host not allowed');
  }

  const agent = imgProxyAgent;

  const fetchOnce = (url, redirectsLeft) =>
    new Promise((resolve, reject) => {
      const reqUp = https.get(
        url,
        {
          agent,
          timeout: 30000,
          headers: {
            'user-agent': 'AUREX-ImageProxy/1.0',
            accept: '*/*'
          }
        },
        (up) => {
          const status = up.statusCode || 500;

          // Redirects
          if ([301, 302, 303, 307, 308].includes(status) && redirectsLeft > 0 && up.headers.location) {
            const nextUrl = new URL(up.headers.location, url).toString();
            up.resume();
            return resolve(fetchOnce(nextUrl, redirectsLeft - 1));
          }

          if (status !== 200) {
            up.resume();
            return reject(new Error(`Upstream HTTP ${status}`));
          }

          const contentType = up.headers['content-type'] || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          if (up.headers['content-length']) res.setHeader('Content-Length', up.headers['content-length']);
          res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800'); // 7 days

          up.pipe(res);
          up.on('error', reject);
          up.on('end', resolve);
        }
      );

      reqUp.on('timeout', () => reqUp.destroy(new Error('Upstream timeout')));
      reqUp.on('error', reject);

      // Abort upstream if client closes
      res.on('close', () => {
        try {
          reqUp.destroy();
        } catch {}
      });
    });

  try {
    await fetchOnce(u, 3);
  } catch (e) {
    if (res.headersSent) {
      try {
        return res.end();
      } catch {
        return;
      }
    }
    return res.status(502).send('Upstream error');
  }
});

// Quick diagnostic: test Fundist API connectivity + show server external IP
router.get('/catalog/diag', async (req, res) => {
  const https = require('https');
  const results = {};

  // 1) Get external IP
  const getIP = () => new Promise((resolve) => {
    https.get('https://api.ipify.org', { timeout: 5000 }, (r) => {
      let b = ''; r.on('data', c => b += c); r.on('end', () => resolve(b.trim()));
    }).on('error', () => resolve('unknown'));
  });

  // 2) Test Fundist Game/Categories (small request)
  const testFundist = () => new Promise((resolve) => {
    try {
      const crypto = require('crypto');
      const config = require('../config/config');
      const tid = 'diag_' + Date.now();
      const ip = '0.0.0.0';
      const key = config.slotsApi.apiKey;
      const pwd = config.slotsApi.apiPassword;
      const hashStr = 'Game/Categories/' + ip + '/' + tid + '/' + key + '/' + pwd;
      const hash = crypto.createHash('md5').update(hashStr).digest('hex');
      const url = config.slotsApi.baseUrl + '/System/Api/' + key + '/Game/Categories/?&TID=' + tid + '&Hash=' + hash;
      https.get(url, { timeout: 10000, family: 4 }, (r) => {
        let b = ''; r.on('data', c => b += c); r.on('end', () => resolve(b.substring(0, 500)));
      }).on('error', (e) => resolve('ERROR: ' + e.message));
    } catch (e) { resolve('ERROR: ' + e.message); }
  });

  results.externalIP = await getIP();
  results.fundistTest = await testFundist();
  results.fundistOK = !results.fundistTest.startsWith('12,') && !results.fundistTest.startsWith('ERROR');
  return res.json({ success: true, data: results });
});

// Fundist catalog status (debug/ops)
router.get('/catalog/status', async (req, res) => {
  try {
    return res.json({ success: true, data: fundistService.getCatalogStatus() });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to get catalog status' });
  }
});

router.post('/catalog/refresh', async (req, res) => {
  try {
    const catalog = await fundistService.invalidateCache();
    const count = catalog?.games?.length || 0;
    console.log(`[catalog/refresh] Cache cleared, loaded ${count} games`);
    return res.json({ success: true, data: { games: count } });
  } catch (e) {
    console.log(`[catalog/refresh] Error: ${e.message}`);
    return res.status(500).json({ success: false, error: e.message });
  }
});

// Upload game catalog JSON (admin/ops — for when Game/FullList can't be downloaded directly)
router.post('/catalog/upload', express.json({ limit: '100mb' }), async (req, res) => {
  try {
    const jsonData = req.body;
    if (!jsonData || typeof jsonData !== 'object') {
      return res.status(400).json({ success: false, error: 'Request body must be JSON (Game/FullList or Game/List format)' });
    }
    const result = fundistService.importCatalog(jsonData);
    return res.json({ success: true, data: result });
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message });
  }
});

// Start game session (optionalAuth: demo works without login)
router.post('/start-game', optionalAuth, async (req, res) => {
  try {
    const { gameCode, systemId: systemIdFromClient, language = 'en', mode = 'real' } = req.body;
    const isDemo = mode === 'demo';
    const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0';

    if (!isDemo && !req.user) {
      return res.status(401).json({ success: false, error: 'Требуется авторизация для игры на реальные деньги' });
    }

    if (!gameCode) {
      return res.status(400).json({ success: false, error: 'Missing gameCode' });
    }

    // Resolve systemId from catalog if not provided
    let resolvedSystemId = systemIdFromClient;
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|ipod|webos|blackberry/i.test(ua);
    let effectiveGameCode = gameCode;

    if (!resolvedSystemId || isMobile) {
      const apiData = await fundistService.getGamesList();
      const game = Array.isArray(apiData?.games)
        ? apiData.games.find((g) =>
            String(g.PageCode) === String(gameCode) || String(g.ID) === String(gameCode) || String(g.Url) === String(gameCode)
          )
        : null;

      if (!resolvedSystemId) {
        if (!game) {
          return res.status(404).json({ success: false, error: 'Game not found in catalog (missing systemId)' });
        }
        resolvedSystemId = game.MerchantID;
      }

      if (isMobile && game?.MobilePageCode && game.MobilePageCode !== gameCode) {
        console.log(`[start-game] Mobile: ${gameCode} → ${game.MobilePageCode}`);
        effectiveGameCode = game.MobilePageCode;
      }
    }

    const referer = req.headers.referer || '';
    let gameData;

    if (isDemo) {
      gameData = await fundistService.startDemoSession(
        effectiveGameCode,
        resolvedSystemId,
        userIp,
        language,
        { referer, isMobile }
      );
    } else {
      const userId = req.user.id;
      const currency = req.user.currency || req.body.currency || 'RUB';
      const extParam = `aurex_${userId}_${Date.now()}`;
      gameData = await fundistService.startGameSession(
        userId,
        effectiveGameCode,
        resolvedSystemId,
        currency,
        userIp,
        language,
        { extParam, referer, demo: false, isMobile }
      );
    }
    
    console.log(`[start-game] OK: mode=${mode}, gameCode=${effectiveGameCode}, systemId=${resolvedSystemId}, html size=${gameData?.html?.length || 0}`);
    res.json({ success: true, data: gameData });
  } catch (error) {
    console.error(`[start-game] ERROR: ${error.message}`);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Serve game HTML as a full page (for iframe src — gives proper origin)
// Stores game HTML temporarily in memory keyed by token
const gameFrameStore = new Map();

router.post('/game-frame', optionalAuth, async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ success: false, error: 'Missing html' });
    
    const token = `gf_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    gameFrameStore.set(token, { html, created: Date.now(), userId: req.user?.id || 'demo' });
    console.log(`[game-frame] POST: stored token=${token}, html size=${html.length}, store size=${gameFrameStore.size}`);
    
    // Cleanup old entries (> 10 min)
    for (const [key, val] of gameFrameStore) {
      if (Date.now() - val.created > 10 * 60 * 1000) gameFrameStore.delete(key);
    }
    
    res.json({ success: true, token });
  } catch (e) {
    console.error('[game-frame] POST error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Service Worker cleanup — self-unregistering (clears stale proxy-sw from user browsers)
router.get('/proxy-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Service-Worker-Allowed', '/api/slots/');
  res.send("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',()=>self.registration.unregister());");
});

// wscenter.xyz auth proxy — wscenter is not accessible directly from browsers
// (either ISP-blocked or origin-restricted). We proxy only this one auth call.
router.get('/ws-proxy/*', async (req, res) => {
  const subpath = req.params[0] || '';
  const qIdx = req.originalUrl.indexOf('?');
  const qs = qIdx !== -1 ? req.originalUrl.substring(qIdx) : '';
  const target = `https://check5.wscenter.xyz/${subpath}${qs}`;
  try {
    const resp = await axios.get(target, { timeout: 15000, responseType: 'arraybuffer' });
    if (resp.headers['content-type']) res.setHeader('Content-Type', resp.headers['content-type']);
    res.send(resp.data);
  } catch (e) {
    console.log(`[ws-proxy] Failed ${target}: ${e.message}`);
    res.status(502).send('proxy error');
  }
});

// ---------------------------------------------------------------------------
// game-frame — serves the Fundist HTML fragment as a full page (per Fundist
// documentation: wrap the HTML in a proper document and serve in an iframe).
// Only wscenter auth URLs are rewritten (ISP-blocked / origin-restricted).
// ---------------------------------------------------------------------------
router.get('/game-frame/:token', (req, res) => {
  const entry = gameFrameStore.get(req.params.token);
  console.log(`[game-frame] GET: token=${req.params.token}, found=${!!entry}, store size=${gameFrameStore.size}`);
  if (!entry) {
    return res.status(404).send('<html><body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><h2>Сессия истекла. Закройте и откройте игру снова.</h2></body></html>');
  }

  let html = entry.html;

  // Rewrite wscenter auth URLs to go through our proxy (not accessible from browsers)
  if (html.includes('wscenter')) {
    html = html.replace(/https?:\/\/check\d*\.wscenter\.xyz/g, '/api/slots/ws-proxy');
    console.log('[game-frame] Patched wscenter → ws-proxy');
  }

  // Wrap fragment in proper HTML document (DOCTYPE prevents Quirks Mode)
  const fullHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">' +
    '<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}' +
    'iframe,object,embed{width:100%!important;height:100%!important;position:absolute!important;top:0!important;left:0!important;border:0!important}' +
    '</style></head><body>' + html + '</body></html>';
  const b64 = Buffer.from(fullHtml).toString('base64');

  const page = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}</style>
</head><body>
<script>
(function(){
  var b64='${b64}';
  function go(){document.open();document.write(atob(b64));document.close();}
  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations().then(function(regs){
      Promise.all(regs.map(function(r){return r.unregister();}))
        .then(go).catch(go);
    }).catch(go);
  }else{go();}
})();
</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.send(page);
});

// =========================================================================
// User freerounds check
// =========================================================================
router.get('/freerounds', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const currency = req.user.currency || 'RUB';
    const fundistLogin = `aurex_${userId}_${currency}`;

    const data = await fundistService.getUserFreerounds(fundistLogin);

    // Normalize: data can be array or object
    let freerounds = [];
    if (Array.isArray(data)) {
      freerounds = data;
    } else if (data && typeof data === 'object') {
      freerounds = Object.values(data).filter(v => v && typeof v === 'object' && !Array.isArray(v));
    }

    // Filter active freerounds:
    // - GetUserFreerounds returns items with Count, Games, ExpireDate (no Status field)
    // - Freerounds/Info returns items with FreespinsLeft, Status
    // - Consider active if: not expired AND (has Count > 0 OR FreespinsLeft > 0 OR Status is Active OR no status field)
    const now = new Date();
    const active = freerounds.filter(fr => {
      if (!fr || !fr.Games) return false;
      // Check expiry
      if (fr.ExpireDate && new Date(fr.ExpireDate) < now) return false;
      // If Status is explicitly set to something non-active, skip
      if (fr.Status && fr.Status !== 'Active' && fr.Status !== 'active') return false;
      // Must have count or freespins remaining
      const count = parseInt(fr.FreespinsLeft || fr.Count || 0);
      if (count <= 0) return false;
      return true;
    });

    // Enrich freerounds with wager info from our DB
    let wagerBonuses = [];
    try {
      const bonusRes = await pool.query(
        `SELECT fundist_tid, wager_multiplier, win_amount, wager_required, wager_completed, status as wager_status
         FROM freerounds_bonuses WHERE user_id = $1 AND status IN ('active', 'wagering')`,
        [userId]
      );
      wagerBonuses = bonusRes.rows;
    } catch (e) {}

    const enriched = active.map(fr => {
      const bonus = wagerBonuses.find(b => fr.TID && String(b.fundist_tid) === String(fr.TID));
      return {
        ...fr,
        wager_multiplier: bonus ? parseFloat(bonus.wager_multiplier) : 0,
        win_amount: bonus ? parseFloat(bonus.win_amount) : 0,
        wager_required: bonus ? parseFloat(bonus.wager_required) : 0,
        wager_completed: bonus ? parseFloat(bonus.wager_completed) : 0,
        wager_status: bonus ? bonus.wager_status : null
      };
    });

    console.log(`[freerounds] User ${fundistLogin}: ${freerounds.length} total, ${active.length} active`);
    res.json({ success: true, data: enriched });
  } catch (error) {
    if (error.message && error.message.includes('error')) {
      return res.json({ success: true, data: [] });
    }
    console.error('[freerounds] User check error:', error.message);
    res.json({ success: true, data: [] });
  }
});

// Get user's bonus/wager status
router.get('/bonus-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user balances
    const userRes = await pool.query(
      'SELECT balance, bonus_balance FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.json({ success: true, data: { balance: 0, bonus_balance: 0, active_wagers: [] } });
    }
    const user = userRes.rows[0];

    // Get active wager bonuses
    const bonusRes = await pool.query(
      `SELECT id, fundist_tid, game_code, operator, count, wager_multiplier, 
              win_amount, wager_required, wager_completed, status, expire_at, created_at
       FROM freerounds_bonuses 
       WHERE user_id = $1 AND status IN ('active', 'wagering')
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        balance: parseFloat(user.balance || 0),
        bonus_balance: parseFloat(user.bonus_balance || 0),
        active_wagers: bonusRes.rows.map(b => ({
          id: b.id,
          game_code: b.game_code,
          operator: b.operator,
          count: b.count,
          wager_multiplier: parseFloat(b.wager_multiplier),
          win_amount: parseFloat(b.win_amount),
          wager_required: parseFloat(b.wager_required),
          wager_completed: parseFloat(b.wager_completed),
          progress: parseFloat(b.wager_required) > 0 ? Math.min(100, Math.round((parseFloat(b.wager_completed) / parseFloat(b.wager_required)) * 100)) : 0,
          status: b.status,
          expire_at: b.expire_at,
          created_at: b.created_at
        }))
      }
    });
  } catch (error) {
    console.error('[bonus-status] Error:', error.message);
    res.json({ success: true, data: { balance: 0, bonus_balance: 0, active_wagers: [] } });
  }
});

module.exports = router;
