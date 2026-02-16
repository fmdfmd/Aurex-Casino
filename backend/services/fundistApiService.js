const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const config = require('../config/config');
const pool = require('../config/database');

class FundistApiService {
  constructor() {
    this.baseUrl = config.slotsApi.baseUrl;
    this.apiKey = config.slotsApi.apiKey;
    this.apiPassword = config.slotsApi.apiPassword;
    this.casinoIp = '0.0.0.0'; // As per Fundist docs for dynamic IPs

    // Cache
    this.cache = { data: null, timestamp: 0 };
    this.CACHE_TTL = 60 * 60 * 1000; // 1 hour RAM cache
    this.dataDir = path.join(__dirname, '../data');
    this.localCachePath = path.join(this.dataDir, 'fundist-full-list.json');
    this._refreshPromise = null;

    // Additional search paths for manually placed catalog files
    this.extraCatalogPaths = [
      path.join(__dirname, '../../games_download.json'),    // project root
      path.join(__dirname, '../../games_full.json'),         // project root (alt)
      path.join(this.dataDir, 'games-import.json'),          // backend/data
    ];
  }

  generateHash(paramsString) {
    return crypto.createHash('md5').update(paramsString).digest('hex');
  }

  generateTid() {
    return `tid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ---------------------------------------------------------------------------
  // Download helpers
  // ---------------------------------------------------------------------------

  async downloadFullListToFile(url) {
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });

    const tmpPath = `${this.localCachePath}.tmp`;
    const agent = new https.Agent({ keepAlive: true, family: 4 });

    await new Promise((resolve, reject) => {
      const req = https.get(
        url,
        {
          agent,
          family: 4,
          timeout: 5 * 60 * 1000, // 5 minutes
          headers: { 'accept-encoding': 'identity' }
        },
        (resp) => {
          resp.on('error', reject);

          if (resp.statusCode !== 200) {
            let body = '';
            resp.setEncoding('utf8');
            resp.on('data', (chunk) => (body += chunk));
            resp.on('end', () =>
              reject(new Error(`Fundist FullList HTTP ${resp.statusCode}: ${body.slice(0, 500)}`))
            );
            return;
          }

          const file = fs.createWriteStream(tmpPath);
          file.on('error', reject);
          file.on('finish', () => file.close(resolve));
          resp.pipe(file);
        }
      );

      req.on('timeout', () => req.destroy(new Error('Fundist FullList download timeout')));
      req.on('error', reject);
    });

    // Validate JSON before overwriting cache
    const raw = fs.readFileSync(tmpPath, 'utf8');
    const parsed = JSON.parse(raw); // throws if invalid
    const gamesCount = Array.isArray(parsed?.games) ? parsed.games.length : (Array.isArray(parsed) ? parsed.length : 0);
    if (gamesCount < 10) throw new Error(`Downloaded catalog has only ${gamesCount} games – likely truncated`);

    fs.renameSync(tmpPath, this.localCachePath);
    return parsed;
  }

  // ---------------------------------------------------------------------------
  // Small API helpers (always work even with DPI issues)
  // ---------------------------------------------------------------------------

  async fetchCategories() {
    const tid = this.generateTid();
    const hashString = `Game/Categories/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);
    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Game/Categories/?&TID=${tid}&Hash=${hash}`;
    const res = await axios.get(url, { timeout: 30000, family: 4 });
    return Array.isArray(res.data) ? res.data : [];
  }

  async fetchSorting(type) {
    const tid = this.generateTid();
    const hashString = `Game/Sorting/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);
    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Game/Sorting/?&TID=${tid}&Hash=${hash}&Type=${encodeURIComponent(type)}`;
    const res = await axios.get(url, { timeout: 30000, family: 4 });
    return Array.isArray(res.data) ? res.data : [];
  }

  // ---------------------------------------------------------------------------
  // Background refresh
  // ---------------------------------------------------------------------------

  ensureFullListRefresh() {
    if (this._refreshPromise) return this._refreshPromise;

    const tid = this.generateTid();
    const hashString = `Game/FullList/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);
    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Game/FullList/?&TID=${tid}&Hash=${hash}`;

    this._refreshPromise = (async () => {
      console.log('[Fundist] FullList refresh started...');
      const data = await this.downloadFullListToFile(url);
      this.cache.data = this._normalizeFullList(data);
      this.cache.timestamp = Date.now();
      const count = this.cache.data.games ? this.cache.data.games.length : 0;
      console.log(`[Fundist] FullList refresh finished: ${count} games`);
      return this.cache.data;
    })()
      .catch((err) => {
        console.log('[Fundist] FullList refresh failed:', err.message);
        throw err;
      })
      .finally(() => {
        this._refreshPromise = null;
      });

    return this._refreshPromise;
  }

  // ---------------------------------------------------------------------------
  // Catalog status
  // ---------------------------------------------------------------------------

  getCatalogStatus() {
    let file = null;
    try {
      if (fs.existsSync(this.localCachePath)) {
        const stat = fs.statSync(this.localCachePath);
        file = { mtime: stat.mtime.toISOString(), size: stat.size };
      }
    } catch { /* ignore */ }

    return {
      gamesInRam: this.cache.data?.games?.length || 0,
      refreshing: Boolean(this._refreshPromise),
      ramCacheAgeMs: this.cache.timestamp ? Date.now() - this.cache.timestamp : null,
      file,
    };
  }

  // ---------------------------------------------------------------------------
  // Normalize different response formats into a single shape:
  //   { categories: [...], games: [...], merchants: {...} }
  // Handles: Game/FullList object, Game/List array, Game/Sorting array
  // ---------------------------------------------------------------------------

  _normalizeFullList(raw) {
    // Case 1: Game/FullList format { categories, games, merchants, ... }
    if (raw && !Array.isArray(raw) && Array.isArray(raw.games)) {
      return {
        categories: raw.categories || [],
        games: raw.games,
        merchants: raw.merchants || {},
      };
    }

    // Case 2: Game/List format — plain JSON array of game objects
    if (Array.isArray(raw)) {
      const merchants = {};
      raw.forEach(g => {
        const mid = String(g.System || g.MerchantID || '');
        const mname = g.MerchantName || g.SubMerchantName;
        if (mid && mname) merchants[mid] = merchants[mid] || { Name: mname, ID: mid };
      });
      // Convert Game/List fields to Game/FullList-compatible fields
      const games = raw.map(g => ({
        ...g,
        MerchantID: g.MerchantID || g.System,
        Name: g.Name || g.Trans || {},
        CategoryID: g.CategoryID || g.Categories || [],
        hasDemo: g.hasDemo || g.HasDemo || '0',
      }));
      return { categories: [], games, merchants };
    }

    return { categories: [], games: [], merchants: {} };
  }

  // ---------------------------------------------------------------------------
  // Load catalog from any available file
  // ---------------------------------------------------------------------------

  _tryLoadFromFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const stat = fs.statSync(filePath);
      if (stat.size < 100) return null; // too small to be valid catalog
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const normalized = this._normalizeFullList(raw);
      if (normalized.games.length >= 1) {
        console.log(`[Fundist] Loaded ${normalized.games.length} games from ${filePath}`);
        return normalized;
      }
    } catch (e) {
      console.log(`[Fundist] Failed to load ${filePath}: ${e.message}`);
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Import catalog from uploaded JSON (admin upload)
  // ---------------------------------------------------------------------------

  importCatalog(jsonData) {
    const normalized = this._normalizeFullList(jsonData);
    if (!normalized.games.length) throw new Error('No games found in uploaded data');

    // Persist to disk
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    fs.writeFileSync(this.localCachePath, JSON.stringify(jsonData));

    // Update RAM cache
    this.cache.data = normalized;
    this.cache.timestamp = Date.now();

    return { gamesCount: normalized.games.length, merchantsCount: Object.keys(normalized.merchants).length };
  }

  // ---------------------------------------------------------------------------
  // Main entry: get games list
  // ---------------------------------------------------------------------------

  async getGamesList() {
    // 1) RAM cache
    if (this.cache.data && this.cache.data.games?.length > 0 && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data;
    }

    // 2) Primary file cache (backend/data/fundist-full-list.json)
    const fromPrimary = this._tryLoadFromFile(this.localCachePath);
    if (fromPrimary && fromPrimary.games.length > 50) {
      this.cache.data = fromPrimary;
      this.cache.timestamp = Date.now();
      // Check if games have images; if not, try to refresh from API in background
      const hasImages = fromPrimary.games.some(g => g.ImageFullPath || g.Image);
      if (!hasImages) {
        console.log('[Fundist] Cached catalog has no images — triggering background API refresh');
        this.ensureFullListRefresh().catch(() => {});
      }
      return fromPrimary;
    }

    // 3) Extra catalog paths (manually placed JSON files)
    for (const p of this.extraCatalogPaths) {
      const fromExtra = this._tryLoadFromFile(p);
      if (fromExtra && fromExtra.games.length > 50) {
        // Also copy to primary location for persistence
        try {
          if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
          fs.copyFileSync(p, this.localCachePath);
        } catch { /* best-effort copy */ }
        this.cache.data = fromExtra;
        this.cache.timestamp = Date.now();
        return fromExtra;
      }
    }

    // 4) If we have fromPrimary with < 50 games, still use it (partial data is better than nothing)
    if (fromPrimary && fromPrimary.games.length > 0) {
      this.cache.data = fromPrimary;
      this.cache.timestamp = Date.now();
      // Try background refresh
      this.ensureFullListRefresh().catch(() => {});
      return fromPrimary;
    }

    // 5) Nothing on disk → fetch quick catalog from Sorting API + kick off background refresh
    this.ensureFullListRefresh().catch(() => {});

    const [categories, popular, newest] = await Promise.all([
      this.fetchCategories().catch(() => []),
      this.fetchSorting('popular').catch(() => []),
      this.fetchSorting('new').catch(() => [])
    ]);

    const gamesMap = new Map();
    for (const g of [...popular, ...newest]) {
      if (!g || !g.PageCode) continue;
      gamesMap.set(String(g.PageCode), g);
    }

    const games = Array.from(gamesMap.values());
    const merchants = {};
    for (const g of games) {
      const id = String(g.MerchantID || '');
      if (!id) continue;
      merchants[id] = merchants[id] || { Name: g.MerchantName || g.SubMerchantName || `Merchant ${id}` };
    }

    const quickCatalog = { categories, games, merchants };
    this.cache.data = quickCatalog;
    this.cache.timestamp = Date.now();
    return quickCatalog;
  }

  generateUserPassword(userId) {
    return crypto
      .createHash('sha256')
      .update(`${userId}:${this.apiKey}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Create/ensure a user in Fundist system using User/AuthHTML with UserAutoCreate=1.
   * User/Add is blocked on test accounts, so we use AuthHTML with a common game
   * to trigger user creation. The HTML result is discarded.
   * Safe to call multiple times — Fundist updates existing users.
   */
  /**
   * Create a user in Fundist via User/AuthHTML with UserAutoCreate=1.
   * Tries multiple provider systems and countries to maximize success.
   */
  async createFundistUser(userId, currency = 'RUB', opts = {}) {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const fundistLogin = `aurex_${user.id}_${currency}`;
    const password = this.generateUserPassword(userId);

    // Try multiple providers/countries — some may be restricted on test account
    const attempts = [
      { systemId: '901', page: 'BoomCity',        country: 'CY' },   // BGaming
      { systemId: '960', page: 'vs20doghouse',    country: 'CY' },   // PragmaticPlay
      { systemId: '940', page: 'WildTiger',       country: 'CY' },   // EvoPlay
      { systemId: '901', page: 'BoomCity',        country: 'MT' },   // BGaming Malta
      { systemId: '960', page: 'vs20doghouse',    country: 'MT' },   // PragmaticPlay Malta
      { systemId: '773', page: 'aviator',         country: 'CY' },   // Spribe
    ];

    let lastResult = '';

    for (const attempt of attempts) {
      const tid = this.generateTid();
      const hashString = `User/AuthHTML/${this.casinoIp}/${tid}/${this.apiKey}/${fundistLogin}/${password}/${attempt.systemId}/${this.apiPassword}`;
      const hash = this.generateHash(hashString);

      const params = new URLSearchParams({
        Login: fundistLogin,
        Password: password,
        System: attempt.systemId,
        TID: tid,
        Hash: hash,
        Page: attempt.page,
        UserIP: opts.ip || '0.0.0.0',
        Language: opts.language || 'ru',
        UserAutoCreate: '1',
        Currency: currency,
        Country: user.country || opts.country || attempt.country,
        Nick: user.username || `Player${user.id}`
      });

      const url = `${this.baseUrl}/System/Api/${this.apiKey}/User/AuthHTML/?&${params.toString()}`;

      try {
        console.log(`[Fundist] Creating user ${fundistLogin} via AuthHTML (System=${attempt.systemId}, Country=${attempt.country})...`);
        const response = await axios.get(url, { timeout: 15000, family: 4 });
        const data = String(response.data || '');
        lastResult = data.slice(0, 200);

        // Success: response contains HTML (game launch page) — user was created
        if (data.length > 200 || data.includes('<html') || data.includes('<script') || data.includes('<!DOCTYPE')) {
          console.log(`[Fundist] User ${fundistLogin} created OK (System=${attempt.systemId}, got HTML response)`);
          return { success: true, login: fundistLogin, created: true };
        }

        // Fundist "1," prefix = success
        if (data.startsWith('1,')) {
          console.log(`[Fundist] User ${fundistLogin} created/confirmed`);
          return { success: true, login: fundistLogin, created: true };
        }

        // "24,Redirect error,Restricted country" = game restricted, but user MAY have been created
        // Continue trying other systems
        console.log(`[Fundist] AuthHTML attempt (System=${attempt.systemId}): ${data.slice(0, 120)}`);

      } catch (err) {
        console.log(`[Fundist] AuthHTML attempt (System=${attempt.systemId}) error: ${err.message}`);
      }
    }

    // After all attempts, verify user exists by trying Freerounds/GetUserFreerounds
    // If user exists, this returns data (even empty); if not, it errors
    try {
      console.log(`[Fundist] Verifying user ${fundistLogin} exists...`);
      await this.getUserFreerounds(fundistLogin);
      console.log(`[Fundist] User ${fundistLogin} confirmed to exist (freerounds check passed)`);
      return { success: true, login: fundistLogin, created: false, verified: true };
    } catch (verifyErr) {
      console.error(`[Fundist] User ${fundistLogin} NOT found after all creation attempts. Last result: ${lastResult}`);
      throw new Error(`Failed to create Fundist user ${fundistLogin}. Last response: ${lastResult}`);
    }
  }

  /**
   * Ensure a Fundist user exists — create if not.
   * Returns the Fundist login string. Throws if creation fails.
   */
  async ensureFundistUser(userId, currency = 'RUB', opts = {}) {
    const fundistLogin = `aurex_${userId}_${currency}`;
    const result = await this.createFundistUser(userId, currency, opts);
    if (!result.success) {
      throw new Error(`Could not create/verify Fundist user ${fundistLogin}`);
    }
    console.log(`[Fundist] ensureFundistUser OK: ${fundistLogin} (created=${result.created}, verified=${result.verified || false})`);
    return fundistLogin;
  }

  async startGameSession(
    userId,
    pageCode,
    systemId,
    currency = 'RUB',
    userIp = '0.0.0.0',
    language = 'en',
    opts = {}
  ) {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user = userResult.rows[0];

    const demo = Boolean(opts.demo);
    // Use currency-tagged login so Fundist creates a fresh account with correct currency.
    // Old format "1" may have been created with wrong currency (USD). New format: "aurex_{id}_{currency}"
    const fundistLogin = `aurex_${user.id}_${currency}`;
    const login = demo ? '$DemoUser$' : fundistLogin;
    const password = demo ? 'Demo' : this.generateUserPassword(userId);
    const tid = this.generateTid();

    const hashString = `User/AuthHTML/${this.casinoIp}/${tid}/${this.apiKey}/${login}/${password}/${systemId}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);

    const params = new URLSearchParams({
      Login: login,
      Password: password,
      System: String(systemId),
      TID: tid,
      Hash: hash,
      Page: String(pageCode),
      UserIP: String(userIp),
      Language: String(language),
      ...(demo ? { Demo: '1' } : {}),
      ...(demo
        ? {}
        : {
            UserAutoCreate: '1',
            Currency: String(currency),
            Country: user.country || 'RUS',
            Nick: user.username
          }),
      ...(opts.extParam ? { ExtParam: String(opts.extParam) } : {}),
      ...(opts.referer ? { Referer: String(opts.referer) } : {}),
      ...(opts.isMobile ? { IsMobile: '1' } : {})
    });

    const url = `${this.baseUrl}/System/Api/${this.apiKey}/User/AuthHTML/?&${params.toString()}`;

    let response;
    try {
      response = await axios.get(url, { timeout: 30000 });
    } catch (axiosErr) {
      // Fundist returned non-200 HTTP status — translate to a human-readable message
      const status = axiosErr?.response?.status;
      const body = String(axiosErr?.response?.data || '').slice(0, 300);
      if (body.includes('Wrong authorization IP') || body.startsWith('12,')) {
        throw new Error('IP сервера не в вайтлисте Fundist. Обратитесь в поддержку SoftGamings.');
      }
      throw new Error(`Провайдер недоступен (HTTP ${status || '?'}). Попробуйте позже.`);
    }

    const data = String(response.data || '');

    // Fundist error codes in body (e.g. "12,Wrong authorization IP", "24,Redirect error,...")
    if (data.startsWith('12,')) {
      throw new Error('IP сервера не в вайтлисте Fundist. Обратитесь в поддержку SoftGamings.');
    }
    if (data.startsWith('24,')) {
      // Parse Fundist redirect errors for better UX
      if (data.includes('Currency not supported')) throw new Error('Валюта не поддерживается этой игрой');
      if (data.includes('Demo not supported')) throw new Error('Демо-режим недоступен для этой игры');
      if (data.includes('Restricted country')) throw new Error('Игра недоступна в вашей стране');
      throw new Error(`Игра не может быть запущена: ${data.slice(3, 200)}`);
    }
    if (data.startsWith('15,')) {
      throw new Error('Ошибка авторизации (неверный хеш). Обратитесь в поддержку.');
    }
    if (data.startsWith('17,')) {
      throw new Error('Пользователь не найден или заблокирован');
    }

    if (data.startsWith('1,')) {
      const htmlFragment = data.substring(2);

      if (!demo) {
        await pool.query(
          `INSERT INTO game_sessions (user_id, game_id, game_name, session_id, provider, currency, status, bet_amount, win_amount)
           VALUES ($1, $2, $3, $4, 'softgamings', $5, 'active', 0, 0)`,
          [userId, pageCode, `System:${systemId}`, tid, currency]
        );
      }

      return { success: true, html: htmlFragment, tid };
    }

    // Any other unexpected response
    throw new Error(`Не удалось запустить игру: ${data.slice(0, 200)}`);
  }
  // ---------------------------------------------------------------------------
  // Freerounds API
  // ---------------------------------------------------------------------------

  /**
   * Assign free rounds to a user
   * @param {string} operator - Merchant system name (e.g. 'PragmaticPlay')
   * @param {string|string[]} login - Fundist login(s)
   * @param {string|string[]} games - PageCode(s)
   * @param {number} count - Number of free rounds
   * @param {string} expire - Expiry date 'YYYY-MM-DD HH:mm:ss'
   * @param {object} opts - { betLevel, typeOfBet, freeBonus }
   */
  async addFreerounds(operator, login, games, count, expire, opts = {}) {
    const tid = this.generateTid();
    const hashString = `${operator}/Freerounds/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);

    const params = new URLSearchParams();
    params.append('Operator', operator);

    // Support single or multiple logins
    const logins = Array.isArray(login) ? login : [login];
    if (logins.length === 1) {
      params.append('Login', logins[0]);
    } else {
      logins.forEach(l => params.append('Login[]', l));
    }

    // Support single or multiple games
    const gamesList = Array.isArray(games) ? games : [games];
    if (gamesList.length === 1) {
      params.append('Games', gamesList[0]);
    } else {
      gamesList.forEach(g => params.append('Games[]', g));
    }

    params.append('Count', String(count));
    params.append('Expire', expire);
    params.append('TID', tid);
    params.append('Hash', hash);

    if (opts.betLevel) params.append('BetLevel', String(opts.betLevel));
    if (opts.typeOfBet) params.append('typeOfBet', 'true');
    if (opts.freeBonus) params.append('FreeBonus', String(opts.freeBonus));

    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Freerounds/Add/?&${params.toString()}`;
    const response = await axios.get(url, { timeout: 30000, family: 4 });
    const data = String(response.data || '');

    if (data.trim() === '1') {
      return { success: true, tid };
    }

    throw new Error(`Freerounds/Add error: ${data.slice(0, 300)}`);
  }

  /**
   * Get remaining free rounds for a user from a specific operator
   */
  async getFreeroundsInfo(operator, login) {
    const tid = this.generateTid();
    const hashString = `${operator}/Freerounds/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);

    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Freerounds/Info/?&Operator=${encodeURIComponent(operator)}&Login=${encodeURIComponent(login)}&TID=${tid}&Hash=${hash}`;
    const response = await axios.get(url, { timeout: 30000, family: 4 });
    const data = response.data;

    if (typeof data === 'string' && /^\d+,/.test(data)) {
      throw new Error(`Freerounds/Info error: ${data.slice(0, 300)}`);
    }

    return data;
  }

  /**
   * Get all freerounds for a user across all operators
   */
  async getUserFreerounds(login) {
    const tid = this.generateTid();
    const hashString = `Freerounds/GetUserFreerounds/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);

    const loginsParam = Array.isArray(login)
      ? login.map(l => `Login[]=${encodeURIComponent(l)}`).join('&')
      : `Login=${encodeURIComponent(login)}`;

    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Freerounds/GetUserFreerounds/?&${loginsParam}&TID=${tid}&Hash=${hash}`;
    const response = await axios.get(url, { timeout: 30000, family: 4 });
    const data = response.data;

    if (typeof data === 'string' && /^\d+,/.test(data)) {
      throw new Error(`Freerounds/GetUserFreerounds error: ${data.slice(0, 300)}`);
    }

    return data;
  }

  /**
   * Check status of a specific freerounds batch by its TID
   */
  async checkFreeroundsStatus(freeroundsTid) {
    const tid = this.generateTid();
    const hashString = `Freerounds/Check/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);

    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Freerounds/Check/?&TID=${tid}&FRTID=${encodeURIComponent(freeroundsTid)}&Hash=${hash}`;
    const response = await axios.get(url, { timeout: 30000, family: 4 });
    return response.data;
  }

  /**
   * Remove free rounds from a user
   */
  async removeFreerounds(operator, login, extId) {
    const tid = this.generateTid();
    const hashString = `${operator}/Freerounds/${this.casinoIp}/${tid}/${this.apiKey}/${this.apiPassword}`;
    const hash = this.generateHash(hashString);

    const url = `${this.baseUrl}/System/Api/${this.apiKey}/Freerounds/Remove/?&Operator=${encodeURIComponent(operator)}&ExtID=${encodeURIComponent(extId)}&Login=${encodeURIComponent(login)}&TID=${tid}&Hash=${hash}`;
    const response = await axios.get(url, { timeout: 30000, family: 4 });
    const data = String(response.data || '');

    if (data.trim() === '1') return { success: true };
    throw new Error(`Freerounds/Remove error: ${data.slice(0, 300)}`);
  }
}

module.exports = new FundistApiService();

