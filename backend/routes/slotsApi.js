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

      // Split into slots and live, then interleave slot providers round-robin
      const slotGames = processedGames.filter(g => !liveProviderIds.has(g.systemId));
      const liveGames = processedGames.filter(g => liveProviderIds.has(g.systemId));

      // Group slot games by provider
      const byProvider = new Map();
      for (const g of slotGames) {
        if (!byProvider.has(g.systemId)) byProvider.set(g.systemId, []);
        byProvider.get(g.systemId).push(g);
      }

      // Sort provider groups by tier (lower tier number = higher priority)
      const providerOrder = [...byProvider.keys()].sort((a, b) => {
        const ta = PROVIDER_TIER[a] || 5;
        const tb = PROVIDER_TIER[b] || 5;
        if (ta !== tb) return ta - tb;
        return (byProvider.get(b)?.length || 0) - (byProvider.get(a)?.length || 0);
      });

      // Round-robin interleave: pick 1 game from each provider per round
      const interleaved = [];
      const cursors = new Map();
      providerOrder.forEach(pid => cursors.set(pid, 0));

      let remaining = slotGames.length;
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

      // Live games sorted by Fundist order, appended after slots
      liveGames.sort((a, b) => a.sortScore - b.sortScore);
      processedGames = [...interleaved, ...liveGames];

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

// ---------------------------------------------------------------------------
// Proxy layer — Russian ISPs block wscenter.xyz and many game-provider domains.
// We proxy ALL external game traffic through our Railway server so the user's
// browser never contacts blocked hosts directly.
// ---------------------------------------------------------------------------

// 1. check-proxy: legacy XHR interceptor target (wscenter)
router.get('/check-proxy', async (req, res) => {
  const target = req.query.u;
  if (!target || !target.startsWith('https://')) {
    return res.status(400).json({ error: 'bad url' });
  }
  try {
    const resp = await axios.get(target, { timeout: 10000, responseType: 'text' });
    const ct = resp.headers['content-type'] || 'application/json';
    res.setHeader('Content-Type', ct);
    res.send(resp.data);
  } catch (e) {
    console.log(`[check-proxy] Failed: ${e.message}`);
    res.status(502).json({ error: 'upstream error' });
  }
});

// 2. ws-proxy/*: wildcard proxy for check*.wscenter.xyz (scripts, XHR, etc.)
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

// Service Worker for proxying all external game requests
router.get('/proxy-sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Service-Worker-Allowed', '/api/slots/');
  const sw = [
    "self.addEventListener('install', () => self.skipWaiting());",
    "self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));",
    "self.addEventListener('fetch', (e) => {",
    "  const url = new URL(e.request.url);",
    "  if (url.origin !== self.location.origin && url.protocol.startsWith('http')) {",
    "    const proxyUrl = '/api/slots/ext-proxy?u=' + encodeURIComponent(e.request.url);",
    "    e.respondWith(fetch(proxyUrl, {",
    "      method: e.request.method,",
    "      headers: e.request.headers,",
    "      body: e.request.method !== 'GET' && e.request.method !== 'HEAD' ? e.request.body : undefined,",
    "      redirect: 'follow'",
    "    }).catch(() => fetch(e.request)));",
    "  }",
    "});",
  ].join('\n');
  res.send(sw);
});

// 3. ext-proxy: generic external-content proxy.
//    For HTML responses it rewrites src/href to route through itself
//    and injects XHR/fetch interceptors so dynamic requests also go through us.
router.all('/ext-proxy', async (req, res) => {
  const target = req.query.u;
  if (!target) return res.status(400).send('missing u');

  let parsedUrl;
  try { parsedUrl = new URL(target); }
  catch { return res.status(400).send('invalid url'); }

  try {
    const fwdHeaders = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      'Accept': req.headers['accept'] || '*/*',
      'Accept-Language': req.headers['accept-language'] || 'ru,en',
      'Referer': parsedUrl.origin + '/',
    };
    if (req.headers['content-type']) fwdHeaders['Content-Type'] = req.headers['content-type'];
    if (req.headers['cookie']) fwdHeaders['Cookie'] = req.headers['cookie'];

    const up = await axios({
      method: req.method === 'OPTIONS' ? 'GET' : req.method,
      url: target,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      timeout: 30000,
      responseType: 'arraybuffer',
      headers: fwdHeaders,
      validateStatus: () => true,
      maxRedirects: 10,
    });

    const ct = up.headers['content-type'] || '';
    if (ct) res.setHeader('Content-Type', ct);
    if (up.headers['cache-control']) res.setHeader('Cache-Control', up.headers['cache-control']);
    // Forward Set-Cookie from upstream (game sessions)
    const setCookies = up.headers['set-cookie'];
    if (setCookies) res.setHeader('Set-Cookie', setCookies);
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    // Only rewrite actual HTML pages, not API responses that happen to have text/html
    const body = Buffer.from(up.data).toString('utf-8');
    const isRealHtml = ct.toLowerCase().includes('text/html') && body.trimStart().match(/^<!doctype|^<html/i);

    if (isRealHtml) {
      let h = body;
      const origin = parsedUrl.origin;

      const baseDir = target.replace(/[?#].*$/, '').replace(/\/[^\/]*$/, '/');

      // Rewrite absolute external URLs in HTML attributes
      h = h.replace(
        /((?:src|href|action|poster)\s*=\s*)(["'])(https?:\/\/[^"'\s>]+)\2/gi,
        (_, pre, q, u) => `${pre}${q}/api/slots/ext-proxy?u=${encodeURIComponent(u)}${q}`
      );
      // Protocol-relative URLs
      h = h.replace(
        /((?:src|href)\s*=\s*)(["'])(\/\/[^"'\s>]+)\2/gi,
        (_, pre, q, u) => `${pre}${q}/api/slots/ext-proxy?u=${encodeURIComponent('https:' + u)}${q}`
      );
      // Root-relative URLs → absolute through proxy
      h = h.replace(
        /((?:src|href)\s*=\s*)(["'])(\/(?!\/|api\/slots\/)[^"'\s>]*)\2/gi,
        (_, pre, q, p) => `${pre}${q}/api/slots/ext-proxy?u=${encodeURIComponent(origin + p)}${q}`
      );
      // Path-relative URLs (no leading slash, no protocol) → resolve against game base dir
      h = h.replace(
        /((?:src|href)\s*=\s*)(["'])(?!https?:|\/\/|\/|#|data:|javascript:|mailto:|about:|blob:|\{)([^"'\s>]+)\2/gi,
        (_, pre, q, rel) => {
          try {
            const abs = new URL(rel, baseDir).href;
            return `${pre}${q}/api/slots/ext-proxy?u=${encodeURIComponent(abs)}${q}`;
          } catch { return `${pre}${q}${rel}${q}`; }
        }
      );

      // Minimal fallback interceptor for browsers without Service Worker support
      const escapedBaseDir = baseDir.replace(/'/g, "\\'");
      const serverHost = req.get('host') || 'aurex.casino';
      const inj = `<script>(function(){` +
        `var P='/api/slots/ext-proxy?u=',H=location.host||'${serverHost}',O='${origin}',B='${escapedBaseDir}';` +
        `function px(u){if(typeof u!='string')return u;` +
        `if(u.indexOf('/api/slots/')>=0)return u;` +
        `if(u.indexOf('://')>=0&&u.indexOf(H)<0)return P+encodeURIComponent(u);` +
        `if(u.indexOf('://')<0&&u.charAt(0)==='/'&&u.indexOf('/api/slots/')!==0)return P+encodeURIComponent(O+u);` +
        `if(u.indexOf('://')<0&&u.charAt(0)!=='/'&&u.indexOf('data:')!==0&&u.indexOf('blob:')!==0)` +
        `{try{return P+encodeURIComponent(new URL(u,B).href);}catch(e){}}` +
        `return u;}` +
        `var xo=XMLHttpRequest.prototype.open;` +
        `XMLHttpRequest.prototype.open=function(m,u){arguments[1]=px(u);return xo.apply(this,arguments);};` +
        `if(window.fetch){var fo=window.fetch;window.fetch=function(u,o){if(typeof u=='string')u=px(u);return fo.call(this,u,o);};}` +
        `})()<\/script>`;

      if (h.includes('<head')) {
        h = h.replace(/<head[^>]*>/i, m => m + inj);
      } else {
        h = inj + h;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(h);
    } else if (ct.toLowerCase().includes('text/css')) {
      let css = body;
      const cssBase = target.replace(/[?#].*$/, '').replace(/\/[^\/]*$/, '/');
      css = css.replace(
        /url\(\s*(["']?)(https?:\/\/[^"')]+)\1\s*\)/gi,
        (_, q, u) => `url(${q}/api/slots/ext-proxy?u=${encodeURIComponent(u)}${q})`
      );
      css = css.replace(
        /url\(\s*(["']?)(\/\/[^"')]+)\1\s*\)/gi,
        (_, q, u) => `url(${q}/api/slots/ext-proxy?u=${encodeURIComponent('https:' + u)}${q})`
      );
      css = css.replace(
        /url\(\s*(["']?)(?!https?:|\/\/|data:|blob:|\/api\/slots\/)([^"')]+)\1\s*\)/gi,
        (_, q, rel) => {
          try {
            const abs = new URL(rel.trim(), cssBase).href;
            return `url(${q}/api/slots/ext-proxy?u=${encodeURIComponent(abs)}${q})`;
          } catch { return `url(${q}${rel}${q})`; }
        }
      );
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.send(css);
    } else {
      res.status(up.status).send(up.data);
    }
  } catch (e) {
    console.log(`[ext-proxy] Error: ${target} — ${e.message}`);
    res.status(502).send('proxy error');
  }
});

// ---------------------------------------------------------------------------
// game-frame — serves the Fundist HTML as a full page inside our iframe.
// All external domains are rewritten so the user's browser talks only to us.
// ---------------------------------------------------------------------------
router.get('/game-frame/:token', (req, res) => {
  const entry = gameFrameStore.get(req.params.token);
  console.log(`[game-frame] GET: token=${req.params.token}, found=${!!entry}, store size=${gameFrameStore.size}`);
  if (!entry) {
    return res.status(404).send('<html><body style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><h2>Сессия истекла. Закройте и откройте игру снова.</h2></body></html>');
  }

  let html = entry.html;

  // Log external domains for diagnostics
  const domains = [...new Set((html.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))];
  console.log(`[game-frame] External domains: ${domains.join(', ')}`);

  // --- wscenter providers (Thunderkick, Spinomenal, BGaming, Habanero, NetEnt, Yggdrasil, …) ---
  const hasWscenter = html.includes('wscenter');
  if (hasWscenter) {
    // Proxy only the wscenter auth call (blocked by Russian ISPs).
    // The game itself loads in an iframe from the provider's domain — no proxying needed.
    html = html.replace(/https?:\/\/check\d*\.wscenter\.xyz/g, '/api/slots/ws-proxy');
    console.log('[game-frame] Patched wscenter: domain rewrite to ws-proxy');
  }

  // wscenter games only need the domain rewrite (done above) — serve directly
  // without interceptors/Service Worker that break game loading
  if (hasWscenter) {
    const page = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}
iframe,object,embed,div.game-container,.game-frame{
  width:100%!important;height:100%!important;
  position:absolute!important;top:0!important;left:0!important;
  border:0!important;
}
body>iframe,body>div,body>object,body>embed{
  width:100%!important;height:100%!important;
  position:absolute!important;top:0!important;left:0!important;
  border:0!important;
}
</style>
</head><body>
<script>document.write(${JSON.stringify(html)});</script>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    return res.send(page);
  }

  // Non-wscenter games: full proxy layer (interceptors + Service Worker)
  html = html.replace(
    /(<iframe[^>]+src\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi,
    (_, pre, q, url) => `${pre}${q}/api/slots/ext-proxy?u=${encodeURIComponent(url)}${q}`
  );

  const gfHost = req.get('host') || 'aurex.casino';
  const interceptor = `<script>(function(){
var P='/api/slots/ext-proxy?u=',H=location.host||'${gfHost}';
function px(u){if(typeof u!='string'||u.indexOf('/api/slots/')>=0||u.indexOf('://')<0||u.indexOf(H)>=0)return u;return P+encodeURIComponent(u);}
var xo=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){arguments[1]=px(u);return xo.apply(this,arguments);};
if(window.fetch){var fo=window.fetch;window.fetch=function(u,o){if(typeof u=='string')u=px(u);return fo.call(this,u,o);};}
})()</script>`;

  const htmlWithFallback = interceptor + html;
  const b64 = Buffer.from(htmlWithFallback).toString('base64');
  const page = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>
html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}
iframe,object,embed,div.game-container,.game-frame{
  width:100%!important;height:100%!important;
  position:absolute!important;top:0!important;left:0!important;
  border:0!important;
}
body>iframe,body>div,body>object,body>embed{
  width:100%!important;height:100%!important;
  position:absolute!important;top:0!important;left:0!important;
  border:0!important;
}
</style>
</head><body>
<script>
(function(){
  var b64='${b64}';
  function loadGame(){document.open();document.write(atob(b64));document.close();}
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/api/slots/proxy-sw.js',{scope:'/api/slots/'})
      .then(function(reg){
        if(navigator.serviceWorker.controller){loadGame();return;}
        var done=false;
        navigator.serviceWorker.addEventListener('controllerchange',function(){if(!done){done=true;loadGame();}});
        var w=reg.installing||reg.waiting;
        if(w)w.addEventListener('statechange',function(){if(w.state==='activated'&&!done){done=true;loadGame();}});
        setTimeout(function(){if(!done){done=true;loadGame();}},3000);
      })
      .catch(function(){loadGame();});
  }else{loadGame();}
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

// ---------------------------------------------------------------------------
// Catch-all: proxy unmatched GET requests that are likely game assets loaded
// via relative URLs from proxied game HTML. The Referer header contains the
// ext-proxy URL with the game origin encoded in the `u` parameter.
// ---------------------------------------------------------------------------
router.get('/*', async (req, res, next) => {
  // Only intercept paths that look like static assets (not API routes we handle)
  const subpath = req.params[0] || '';
  if (!subpath || subpath.startsWith('game') || subpath.startsWith('check-proxy') ||
      subpath.startsWith('ws-proxy') || subpath.startsWith('ext-proxy') ||
      subpath.startsWith('freerounds') || subpath.startsWith('bonus') ||
      subpath.startsWith('img') || subpath.startsWith('start') ||
      subpath.startsWith('catalog') || subpath.startsWith('cdn')) {
    return next();
  }

  const referer = req.headers.referer || '';
  let gameBaseDir = '';

  // Extract game base directory from Referer (ext-proxy?u=GAME_URL)
  const extMatch = referer.match(/ext-proxy\?u=([^&\s]+)/);
  if (extMatch) {
    try {
      const gameUrl = decodeURIComponent(extMatch[1]);
      gameBaseDir = gameUrl.replace(/[?#].*$/, '').replace(/\/[^\/]*$/, '/');
    } catch {}
  }

  if (!gameBaseDir) {
    return next();
  }

  const qs = req.originalUrl.includes('?')
    ? req.originalUrl.substring(req.originalUrl.indexOf('?'))
    : '';
  let target;
  try {
    target = new URL(subpath + qs, gameBaseDir).href;
  } catch {
    return next();
  }

  try {
    const resp = await axios.get(target, {
      timeout: 15000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || '*/*',
        'Referer': new URL(gameBaseDir).origin + '/',
      },
      validateStatus: () => true,
    });
    if (resp.headers['content-type']) res.setHeader('Content-Type', resp.headers['content-type']);
    if (resp.headers['cache-control']) res.setHeader('Cache-Control', resp.headers['cache-control']);
    res.status(resp.status).send(resp.data);
  } catch (e) {
    console.log(`[cdn-catch-all] Failed ${target}: ${e.message}`);
    next();
  }
});

module.exports = router;
