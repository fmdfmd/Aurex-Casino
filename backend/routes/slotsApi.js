const express = require('express');
const { auth } = require('../middleware/auth');
const fundistService = require('../services/fundistApiService');
const axios = require('axios');
const https = require('https');
const merchantFallback = require('../constants/fundistMerchants');
const router = express.Router();

// Routes

// Helper to determine category
const determineCategory = (game, categoriesMap) => {
  const mid = String(game.MerchantID || game.System || '');

  // Known live casino providers
  const liveProviders = new Set(['998', '913', '990', '983', '934', '980', '968', '904', '945', '866', '314']);
  if (liveProviders.has(mid)) return 'live';

  // Known sports providers
  const sportProviders = new Set(['952', '974', '84']);
  if (sportProviders.has(mid)) return 'sport';

  // Check categories (FullList uses CategoryID, List uses Categories)
  const catIds = game.CategoryID || game.Categories || [];
  if (Array.isArray(catIds)) {
    for (const catId of catIds) {
      const cat = categoriesMap[String(catId)];
      if (cat) {
        const nameEn = (cat.Name?.en || cat.Trans?.en || '').toLowerCase();
        const tags = cat.Tags || [];
        if (tags.includes('live') || nameEn.includes('live')) return 'live';
        if (nameEn.includes('table') || nameEn.includes('baccarat') || nameEn.includes('roulette') || nameEn.includes('blackjack') || nameEn.includes('poker')) return 'table';
        if (nameEn.includes('sport') || nameEn.includes('virtual sport')) return 'sport';
        if (nameEn.includes('crash')) return 'crash';
      }
    }
  }

  return 'slots';
};

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
    const processedGames = [];
    
    // Log response structure for debugging
    console.log('Fundist response keys:', Object.keys(apiData));
    if (apiData.games) console.log('Games count:', apiData.games.length);
    if (apiData.merchants) console.log('Merchants count:', Object.keys(apiData.merchants).length);

    const merchants = apiData.merchants || {};

    // Curated top games — these always appear first (in this exact order)
    const topGameCodes = new Set([
      'vs20olympgate',       // Gates of Olympus — Pragmatic
      'vs20sbxmas',          // Sweet Bonanza Xmas — Pragmatic
      'vs20sugarrush',       // Sugar Rush — Pragmatic
      'vs20doghouse',        // The Dog House — Pragmatic
      'vs20fruitparty',      // Fruit Party — Pragmatic
      'vs20olympx',          // Gates of Olympus 1000 — Pragmatic
      'vs20starz',           // Starlight Princess — Pragmatic
      'vs20zeusvshadp',      // Zeus vs Hades — Pragmatic
      'bigbamboo-01',        // Big Bamboo — Push Gaming
      '1067_desktop',        // Wanted Dead or a Wild — Hacksaw
      '310',                 // Book of Dead — Play'n GO
      'vs25pyramid',         // Great Rhino Megaways — Pragmatic
      'vs10firestrike',      // Fire Strike — Pragmatic
      'vs25wolfgold',        // Wolf Gold — Pragmatic
      'vs20bonzgold',        // Bonanza Gold — Pragmatic
      'vs20rhinoluxe',       // Great Rhino Deluxe — Pragmatic
      'vs40wanderw',         // The Hand of Midas — Pragmatic
      'release_the_kraken_2', // Release the Kraken 2 — Pragmatic
      'christmas_big_bass_bonanza', // Big Bass Bonanza Xmas
      'vs25jokerking',       // Joker King — Pragmatic
    ]);
    const topGameOrder = [...topGameCodes];

    // Provider tier system — slot providers first, then live
    const providerTier = {
      // Tier 1 — top slot providers
      '960': 1, // PragmaticPlay
      '850': 1, // HacksawGaming
      '938': 1, // NoLimitCity
      '911': 1, // PushGaming
      '944': 1, // PlaynGo
      '939': 1, // PGSoft
      '421': 1, // NetEntOSS
      '997': 1, // MG (Microgaming/GamesGlobal)
      '953': 1, // Yggdrasil
      '940': 1, // EvoPlay
      '935': 1, // RelaxGaming
      '920': 1, // Thunderkick
      '925': 1, // ELKStudios
      // Tier 2 — good slot providers
      '991': 2, // BetSoft
      '976': 2, // Habanero
      '969': 2, // Quickspin
      '963': 2, // ISoftBet
      '943': 2, // PlaysonDirect
      '941': 2, // Wazdan
      '924': 2, // Booongo
      '949': 2, // Platipus
      '901': 2, // BGaming
      '899': 2, // MascotGaming
      '895': 2, // Spribe
      '955': 2, // GameArt
      // Tier 2.5 — newly enabled quality providers
      '842': 2, // NucleusGaming
      '846': 2, // Slotmill
      // Tier 3 — decent
      '307': 3, // Novomatic
      '987': 3, // TomHorn
      '979': 3, // WorldMatch
      '977': 3, // BoomingGames
      '975': 3, // AmaticDirect
      '917': 3, // Stakelogic
      '910': 3, // RedRakeGaming
      '879': 3, // Gamzix
      '869': 3, // SmartSoft
      // Tier 4 — live casino (after slots)
      '998': 4, // Evolution
      '913': 4, // VivoGaming
      '990': 4, // LuckyStreak
    };
    
    if (apiData.games && Array.isArray(apiData.games)) {
      apiData.games.forEach(game => {
        const merchantId = String(game.MerchantID || game.System || '');
        const merchantsName = merchants[merchantId]?.Name;
        const isPlaceholder = typeof merchantsName === 'string' && /^(Merchant|Provider)\s+\d+$/.test(merchantsName);

        const merchantName =
          (!isPlaceholder ? merchantsName : null) ||
          game.MerchantName ||
          game.SubMerchantName ||
          merchantFallback[merchantId] ||
          merchantsName ||
          (merchantId ? `Provider ${merchantId}` : 'Unknown');

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

        // Sort score: curated top games first (tier 0), then by provider tier
        const pageCode = game.PageCode || '';
        const topIdx = topGameOrder.indexOf(pageCode);
        let sortScore;
        if (topIdx !== -1) {
          // Curated top game — use its position (0-19)
          sortScore = topIdx;
        } else {
          // Provider tier for sorting (1 = best, 6 = unknown)
          const tier = providerTier[merchantId] || 6;
          const fundistSort = parseInt(game.Sort || game.GSort || '999999', 10);
          sortScore = 1000 + tier * 1000000 + Math.min(fundistSort, 999999);
        }

        processedGames.push({
          id: game.PageCode,
          systemId: merchantId,
          name: gameName,
          provider: merchantName,
          image: imageProxyUrl,
          category: determineCategory(game, categoriesMap),
          hasDemo: game.hasDemo === '1' || game.HasDemo === '1',
          isNew: false,
          rtp,
          maxMultiplier,
          sortScore
        });
      });

      // Sort: best providers first, then by Fundist sort within each tier
      processedGames.sort((a, b) => a.sortScore - b.sortScore);
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

// Trigger full catalog refresh (debug/ops)
router.post('/catalog/refresh', async (req, res) => {
  try {
    fundistService.ensureFullListRefresh().catch(() => {});
    return res.json({ success: true, data: { started: true } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to start catalog refresh' });
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

// Start game session
router.post('/start-game', auth, async (req, res) => {
  try {
    const { gameCode, systemId: systemIdFromClient, language = 'en', mode = 'real' } = req.body;
    const userId = req.user.id;
    // Use the user's currency from DB first, then request body, default RUB
    const currency = req.user.currency || req.body.currency || 'RUB';
    // Get real user IP behind proxy (Railway, nginx, etc.)
    const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '0.0.0.0';

    if (!gameCode) {
      return res.status(400).json({ success: false, error: 'Missing gameCode' });
    }

    // `systemId` is required by Fundist AuthHTML, but frontend doesn't always send it.
    // Resolve it from cached Fundist catalog if missing.
    let resolvedSystemId = systemIdFromClient;
    if (!resolvedSystemId) {
      const apiData = await fundistService.getGamesList();
      const game = Array.isArray(apiData?.games)
        ? apiData.games.find((g) =>
            String(g.PageCode) === String(gameCode) || String(g.ID) === String(gameCode) || String(g.Url) === String(gameCode)
          )
        : null;

      if (!game) {
        return res.status(404).json({ success: false, error: 'Game not found in catalog (missing systemId)' });
      }
      resolvedSystemId = game.MerchantID;
    }

    const extParam = `aurex_${userId}_${Date.now()}`;
    const referer = req.headers.referer || '';
    // Detect mobile from user-agent
    const ua = (req.headers['user-agent'] || '').toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|ipod|webos|blackberry/i.test(ua);

    // Use MobilePageCode if on mobile device
    let effectiveGameCode = gameCode;
    if (isMobile && !systemIdFromClient) {
      const apiData = await fundistService.getGamesList();
      const game = Array.isArray(apiData?.games)
        ? apiData.games.find((g) =>
            String(g.PageCode) === String(gameCode) || String(g.ID) === String(gameCode)
          )
        : null;
      if (game?.MobilePageCode) {
        effectiveGameCode = game.MobilePageCode;
      }
    }

    const gameData = await fundistService.startGameSession(
      userId,
      effectiveGameCode,
      resolvedSystemId,
      currency,
      userIp,
      language,
      { extParam, referer, demo: mode === 'demo', isMobile }
    );
    
    res.json({ success: true, data: gameData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
