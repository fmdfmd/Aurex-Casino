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
          // ImageURL is relative, e.g. /gstatic/games/foo.jpg → https://agstatic.com/games/foo.jpg
          const rel = game.ImageURL.replace(/^\/gstatic/, '');
          imageUrl = `https://agstatic.com${rel}`;
        }
        const imageProxyUrl = imageUrl
          ? `/api/slots/img?u=${encodeURIComponent(String(imageUrl))}`
          : undefined;

        // Handle name: FullList/Sorting has Name: {en:...}, List has Trans: {en:...}
        const nameObj = game.Name || game.Trans || {};
        const gameName = (typeof nameObj === 'string') ? nameObj : (nameObj.en || nameObj.ru || Object.values(nameObj)[0] || 'Unknown');

        processedGames.push({
          id: game.PageCode,
          systemId: merchantId,
          name: gameName,
          provider: merchantName,
          image: imageProxyUrl,
          category: determineCategory(game, categoriesMap),
          hasDemo: game.hasDemo === '1' || game.HasDemo === '1',
          isNew: false,
          popularity: parseInt(game.GSort || game.Sort || '0', 10) || 0
        });
      });
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

  const agent = new https.Agent({ family: 4, keepAlive: true });

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
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day

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
    const { gameCode, systemId: systemIdFromClient, currency = 'RUB', language = 'en', mode = 'real' } = req.body;
    const userId = req.user.id;
    const userIp = req.ip || '0.0.0.0';

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

    const gameData = await fundistService.startGameSession(
      userId,
      gameCode,
      resolvedSystemId,
      currency,
      userIp,
      language,
      { extParam, referer, demo: mode === 'demo' }
    );
    
    res.json({ success: true, data: gameData });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
