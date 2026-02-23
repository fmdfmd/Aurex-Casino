const express = require('express');
const { auth } = require('../middleware/auth');
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

    // Curated top games — pinned at the top in this exact order.
    // ONLY games from ACTIVATED providers. When SoftGamings activates
    // Pragmatic/Hacksaw/PlaynGO/Endorphina — add their games back here.
    const topGameCodes = new Set([
      // === TOP SLOTS — curated by real popularity ===

      // Upgaming (872) — Plinko первый
      'plinko',                                           // Plinko (Upgaming)

      // Push Gaming (911) — топ слоты
      'bigbamboo-01',                                     // Big Bamboo
      'jamminjars',                                       // Jammin' Jars
      'razorshark',                                       // Razor Shark
      'razorreturns-01',                                  // Razor Returns
      'firehopper-01',                                    // Fire Hopper
      'fatrabbit1-01',                                    // Fat Rabbit
      'wildswarm',                                        // Wild Swarm
      'retrotapes-01',                                    // Retro Tapes
      'dragonhopper-01',                                  // Dragon Hopper

      // Thunderkick (920) — топ слоты
      'tk-s1-g82-94',                                     // Esqueleto Explosivo 3
      'tk-s1-g22',                                        // Midas Golden Touch
      'tk-s1-g53-96',                                     // Midas Golden Touch – Reborn
      'tk-s1-g90-94',                                     // Midas Golden Touch 3
      'tk-s1-g13',                                        // Pink Elephants 2
      'tk-s1-g55-96',                                     // Pink Elephants 2 – Reborn
      'tk-s1-g34',                                        // Beat the Beast: Griffin's Gold
      'tk-barbershop-a',                                  // Barbershop: Uncut
      'tk-s1-g21',                                        // Carnival Queen
      'tk-s1-g93-94',                                     // Carnival Queen 2
      'tk-s1-g48-96',                                     // Shifting Seas
      'tk-s1-g46',                                        // Gods of Rock

      // BGaming (901)
      'BonanzaBillion',                                   // Bonanza Billion
      'FireLightning',                                    // Fire Lightning
      'BookOfCats',                                       // Book of Cats
      'CandyMonsta',                                      // Candy Monsta
      'LuckyLadyMoon',                                    // Lady Wolf Moon
      'AztecMagicDeluxe',                                 // Aztec Magic Deluxe
      'WildWestTrueways',                                 // Wild West TRUEWAYS

      // NetEnt / RedTiger (892 EvoOSS)
      'deadoralive2:deadoralive20000',                    // Dead or Alive 2
      'rabidrandy:rabidrandyr96000',                      // Rabid Randy
      'dragonslock:dragonslock00000',                     // Dragons Lock

      // PG Soft (939)
      '1815268',                                          // Oishi Delights

      // Belatra (956)
      'buffalo',                                          // Big Wild Buffalo
      'dragons_bonanza',                                  // Dragon's Bonanza
      'wolf_thunder',                                     // Wolf Thunder
      'towers',                                           // X Towers

      // Yggdrasil (953)
      '7329',                                             // Double Dragons
      '7348',                                             // Lucha Maniacs

      // Spinomenal (959)
      'SlotMachine_DemiGods2',                            // Demi Gods 2
      'SlotMachine_MajesticKing',                         // Majestic King

      // =============================================
      // === LIVE CASINO ===
      // =============================================
      'crazytime:CrazyTime0000001',                       // Crazy Time — Evolution
      'roulette:LightningTable01',                        // Lightning Roulette — Evolution
      'funkytime:FunkyTime0000001',                       // Funky Time — Evolution
      'crazycoinflip:CrazyCoinFlip001',                   // Crazy Coin Flip — Evolution
      'megaball:MegaBall00000001',                        // Mega Ball — Evolution
      'roulette:InstantRo0000001',                        // Instant Roulette — Evolution
      'moneywheel:MOWDream00000001',                      // Dream Catcher — Evolution
      'lightningstorm:LightningStorm01',                  // Lightning Storm — Evolution
      'deadoralivesaloon:doasaloon0000001',               // Dead or Alive: Saloon — Evolution
      'monopoly:Monopoly00000001',                        // MONOPOLY Live — Evolution
      'crazypachinko:CrazyPachinko001',                   // Crazy Pachinko — Evolution
      'lightningdice:LightningDice001',                   // Lightning Dice — Evolution
      'baccarat:XXXtremeLB000001',                        // XXXtreme Lightning Baccarat — Evolution
      'blackjack:PowerInfiniteBJ1',                       // Power Infinite Blackjack — Evolution
      'rng-roulette:rng-rt-lightning',                    // First Person Lightning Roulette — Evolution
      'rng-blackjack:rng-bj-standard0',                   // First Person Blackjack — Evolution
    ]);
    const topGameOrder = [...topGameCodes];

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

        // Sort score: pinned top games first, then Fundist sorting, live casino last.
        // Provider weights are managed in Fundist backoffice (www5.fundist.org → Sorting).
        const pageCode = game.PageCode || '';
        const topIdx = topGameOrder.indexOf(pageCode);
        let sortScore;
        if (topIdx !== -1) {
          sortScore = topIdx;
        } else {
          const fundistSort = parseInt(game.Sort || game.GSort || '999999', 10);
          const isLive = liveProviderIds.has(merchantId);
          sortScore = (isLive ? 100_000_000 : 1000) + Math.min(fundistSort, 99_999_999);
        }

        const uniqueId = `${merchantId}_${game.PageCode}`;
        processedGames.push({
          id: uniqueId,
          pageCode: game.PageCode,
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

      // Deduplicate: keep the first occurrence (best sortScore after sorting)
      processedGames.sort((a, b) => a.sortScore - b.sortScore);
      const seenIds = new Set();
      processedGames = processedGames.filter(g => {
        if (seenIds.has(g.id)) return false;
        seenIds.add(g.id);
        return true;
      });

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
    if (isMobile) {
      const apiData = await fundistService.getGamesList();
      const game = Array.isArray(apiData?.games)
        ? apiData.games.find((g) =>
            String(g.PageCode) === String(gameCode) || String(g.ID) === String(gameCode)
          )
        : null;
      if (game?.MobilePageCode && game.MobilePageCode !== gameCode) {
        console.log(`[start-game] Mobile: ${gameCode} → ${game.MobilePageCode}`);
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
    
    console.log(`[start-game] OK: gameCode=${effectiveGameCode}, systemId=${resolvedSystemId}, html size=${gameData?.html?.length || 0}`);
    res.json({ success: true, data: gameData });
  } catch (error) {
    console.error(`[start-game] ERROR: ${error.message}`);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Serve game HTML as a full page (for iframe src — gives proper origin)
// Stores game HTML temporarily in memory keyed by token
const gameFrameStore = new Map();

router.post('/game-frame', auth, async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ success: false, error: 'Missing html' });
    
    const token = `gf_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    gameFrameStore.set(token, { html, created: Date.now(), userId: req.user.id });
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
    const up = await axios({
      method: req.method === 'OPTIONS' ? 'GET' : req.method,
      url: target,
      data: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      timeout: 30000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
        'Accept': req.headers['accept'] || '*/*',
        'Accept-Language': req.headers['accept-language'] || 'ru,en',
        'Referer': parsedUrl.origin + '/',
      },
      validateStatus: () => true,
      maxRedirects: 10,
    });

    const ct = up.headers['content-type'] || '';
    if (ct) res.setHeader('Content-Type', ct);
    if (up.headers['cache-control']) res.setHeader('Cache-Control', up.headers['cache-control']);
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    if (ct.toLowerCase().includes('text/html')) {
      let h = Buffer.from(up.data).toString('utf-8');
      const origin = parsedUrl.origin;

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

      // Inject XHR + fetch interceptor — also catches relative URLs (game API calls)
      const inj = `<script>(function(){` +
        `var P='/api/slots/ext-proxy?u=',H=location.host,O='${origin}';` +
        `function px(u){if(typeof u!='string')return u;` +
        `if(u.indexOf('://')>=0&&u.indexOf(H)<0)return P+encodeURIComponent(u);` +
        `if(u.indexOf('://')<0&&u.charAt(0)==='/'&&u.indexOf('/api/slots/')!==0)return P+encodeURIComponent(O+u);` +
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

  // --- wscenter providers (Thunderkick, Spinomenal, BGaming, Habanero, NetEnt, …) ---
  const hasWscenter = html.includes('wscenter');
  if (hasWscenter) {
    // Replace iframe creation with redirect through our ext-proxy
    html = html.replace(
      /var\s+ifr\s*=\s*document\.createElement\(['"]iframe['"]\);[\s\S]*?\.appendChild\(ifr\);/,
      "window.location.replace('/api/slots/ext-proxy?u='+encodeURIComponent(resp.data));"
    );
    // Rewrite wscenter domain to our wildcard proxy (covers <script src>, XHR URLs, etc.)
    html = html.replace(/https?:\/\/check\d*\.wscenter\.xyz/g, '/api/slots/ws-proxy');
    console.log('[game-frame] Patched wscenter: domain rewrite + iframe → ext-proxy redirect');
  }

  // Rewrite any remaining external <iframe src="https://…"> to go through ext-proxy
  html = html.replace(
    /(<iframe[^>]+src\s*=\s*)(["'])(https?:\/\/[^"']+)\2/gi,
    (_, pre, q, url) => `${pre}${q}/api/slots/ext-proxy?u=${encodeURIComponent(url)}${q}`
  );

  // Comprehensive interceptor: XHR, fetch, MutationObserver for dynamic iframes
  const interceptor = `<script>(function(){
var P='/api/slots/ext-proxy?u=',H=location.host;
function px(u){if(typeof u!='string'||u.indexOf('://')<0||u.indexOf(H)>=0)return u;return P+encodeURIComponent(u);}
var xo=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(m,u){arguments[1]=px(u);return xo.apply(this,arguments);};
if(window.fetch){var fo=window.fetch;window.fetch=function(u,o){if(typeof u=='string')u=px(u);return fo.call(this,u,o);};}
if(window.MutationObserver){new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){
if(n.tagName==='IFRAME'&&n.src&&n.src.indexOf('://')>=0&&n.src.indexOf(H)<0){n.src=P+encodeURIComponent(n.src);}
});});}).observe(document.documentElement||document.body,{childList:true,subtree:true});}
})()</script>`;

  const page = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
${interceptor}
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
</head><body>${html}</body></html>`;

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
