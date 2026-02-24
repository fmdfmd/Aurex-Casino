const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
// MongoDB removed - using PostgreSQL only
const socketIo = require('socket.io');
const http = require('http');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const slotsApiRoutes = require('./routes/slotsApi');
const gameCallbackRoutes = require('./routes/gameCallback');
const softgamingsCallbackRoutes = require('./routes/softgamingsCallback');
const tournamentRoutes = require('./routes/tournaments');
const promocodeRoutes = require('./routes/promocodes');
const ticketRoutes = require('./routes/tickets');
const verificationRoutes = require('./routes/verification');
const otpRoutes = require('./routes/otp');
const referralRoutes = require('./routes/referral');
const cashbackRoutes = require('./routes/cashback');
const bonusRoutes = require('./routes/bonuses');
const configRoutes = require('./routes/config');
const vaultRoutes = require('./routes/vault');
const loyaltyRoutes = require('./routes/loyalty');
const chatRoutes = require('./routes/chat');
const avePayCallbackRoutes = require('./routes/avePayCallback');
const nirvanaPayCallbackRoutes = require('./routes/nirvanaPayCallback');

const app = express();
// Railway / Cloudflare / Nginx стоят перед Express → доверяем первый прокси
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false,
}));
app.use(compression());
app.use(cookieParser());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.includes('/avepay/callback')) {
      req.rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting (skip image proxy and game catalog — they're high-traffic read-only endpoints)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 5000 requests per windowMs
  message: 'Too many requests from this IP',
  skip: (req) => {
    const url = req.originalUrl || req.url || '';
    return url.startsWith('/api/slots/img') || url.startsWith('/api/slots/games');
  }
});
app.use('/api/', limiter);

// Database connection - PostgreSQL
const pool = require('./config/database');
console.log('🐘 Using PostgreSQL database for ALL data storage');
console.log('✅ All user data, transactions, sessions persist in database');

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-game', (gameId) => {
    socket.join(`game-${gameId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/slots', slotsApiRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/promocodes', promocodeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/auth/otp', otpRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/cashback', cashbackRoutes);
app.use('/api/bonuses', bonusRoutes);
app.use('/api/config', configRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/chat', chatRoutes);

// Payment callbacks
app.use('/api/payments/avepay/callback', avePayCallbackRoutes);
app.use('/api/payments/nirvana/callback', nirvanaPayCallbackRoutes);

// Game callback routes (специфический путь для callback от провайдера)
app.use('/api/callback/softgamings', softgamingsCallbackRoutes); // SoftGamings (более специфичный путь)
app.use('/api/callback', gameCallbackRoutes); // Основной callback (менее специфичный)

// Health check (Railway needs /health without /api)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check (with /api for compatibility)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Diagnostic endpoint — check server config & outgoing IP (admin only)
const { adminAuth: diagAdminAuth } = require('./middleware/auth');
app.get('/api/diag', diagAdminAuth, async (req, res) => {
  const config = require('./config/config');
  const axios = require('axios');
  let outgoingIp = 'unknown';
  try {
    const ipResp = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    outgoingIp = ipResp.data?.ip || 'unknown';
  } catch (e) {
    outgoingIp = 'error: ' + e.message;
  }

  const mask = (s) => s ? s.slice(0, 6) + '***' + s.slice(-4) : 'NOT SET';

  res.json({
    outgoingIp,
    fundist: {
      baseUrl: config.slotsApi.baseUrl,
      apiKeySet: !!process.env.SLOTS_API_KEY,
      apiKeyPreview: mask(config.slotsApi.apiKey),
      apiPasswordSet: !!process.env.SLOTS_API_PASSWORD,
      hmacSecretSet: !!process.env.SLOTS_HMAC_SECRET,
      callbackUrl: config.slotsApi.callbackUrl,
    },
    env: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      JWT_SECRET_set: !!process.env.JWT_SECRET,
      FRONTEND_URL: process.env.FRONTEND_URL || 'not set',
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN || 'not set',
    }
  });
});

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: 'AUREX Casino API',
    version: '1.0.0',
    status: 'running',
    message: 'The Golden Empire of Win 👑',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      games: '/api/slots/games',
      config: '/api/config'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 6000;

// Auto-run migrations in production (async, doesn't block server start)
async function runProductionSetup() {
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    try {
      console.log('🔄 Running database setup...');
      const { execSync } = require('child_process');
      execSync('npm run migrate', { stdio: 'inherit' });
      execSync('npm run seed', { stdio: 'inherit' });
      console.log('✅ Database setup complete');
    } catch (error) {
      console.log('⚠️ Database setup error (might be already initialized):', error.message);
    }
  }
}

// WebSocket proxy for game providers (SW can't intercept WS)
const WebSocketLib = require('ws');
server.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/slots/ws-game-proxy')) return;
    const target = url.searchParams.get('target');
    if (!target || (!target.startsWith('ws://') && !target.startsWith('wss://'))) {
      socket.destroy();
      return;
    }
    console.log(`[ws-proxy] Connecting: ${target}`);
    const remote = new WebSocketLib(target, {
      headers: { 'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0', Origin: new URL(target).origin }
    });
    const wss = new WebSocketLib.Server({ noServer: true });
    wss.handleUpgrade(req, socket, head, (client) => {
      remote.on('open', () => {
        console.log(`[ws-proxy] Connected: ${target}`);
        client.on('message', (d) => { if (remote.readyState === WebSocketLib.OPEN) remote.send(d); });
        remote.on('message', (d) => { if (client.readyState === WebSocketLib.OPEN) client.send(d); });
      });
      remote.on('error', (e) => { console.log(`[ws-proxy] Error: ${e.message}`); try { client.close(); } catch {} });
      remote.on('close', () => { try { client.close(); } catch {} });
      client.on('close', () => { try { remote.close(); } catch {} });
      client.on('error', () => { try { remote.close(); } catch {} });
    });
  } catch (e) {
    console.log(`[ws-proxy] Setup error: ${e.message}`);
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`🚀 AUREX Empire server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run setup after server is listening (non-blocking)
  setTimeout(() => runProductionSetup(), 1000);

  // Warm up Fundist catalog cache (non-blocking)
  setTimeout(() => {
    try {
      const fundistService = require('./services/fundistApiService');
      fundistService.getGamesList().then((data) => {
        const count = Array.isArray(data?.games) ? data.games.length : 0;
        console.log(`🎰 Fundist catalog warmup done (${count} games)`);
      }).catch((err) => {
        console.log('⚠️ Fundist catalog warmup failed:', err.message);
      });
    } catch (e) {
      console.log('⚠️ Fundist catalog warmup error:', e.message);
    }
  }, 2000);

  // Bonus expiration check — every hour
  const { expireOldBonuses } = require('./config/bonusConfig');
  setInterval(() => expireOldBonuses(pool), 60 * 60 * 1000);
  setTimeout(() => expireOldBonuses(pool), 5000);

  // Weekly cashback auto-processing — check every hour, process on Monday 00:00-01:00
  const { getCashbackPercent } = require('./config/vipLevels');
  let lastCashbackWeek = null;
  
  async function processWeeklyCashbackAuto() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const hour = now.getHours();
    
    // Only run on Monday between 00:00 and 01:00
    if (dayOfWeek !== 1 || hour !== 0) return;
    
    // Prevent double-processing in the same week
    const weekKey = `${now.getFullYear()}-W${Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)}`;
    if (lastCashbackWeek === weekKey) return;
    
    console.log('[Cashback] Auto-processing weekly cashback...');
    try {
      const lastWeekStart = new Date(now);
      lastWeekStart.setHours(0, 0, 0, 0);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7); // Previous Monday
      
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);
      
      const usersResult = await pool.query(`
        SELECT 
          u.id, u.vip_level,
          COALESCE(SUM(CASE WHEN t.type = 'bet' THEN ABS(t.amount) ELSE 0 END), 0) as total_bets,
          COALESCE(SUM(CASE WHEN t.type = 'win' THEN ABS(t.amount) ELSE 0 END), 0) as total_wins
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id 
          AND t.created_at >= $1 AND t.created_at < $2
        GROUP BY u.id
        HAVING COALESCE(SUM(CASE WHEN t.type = 'bet' THEN ABS(t.amount) ELSE 0 END), 0) > 
               COALESCE(SUM(CASE WHEN t.type = 'win' THEN ABS(t.amount) ELSE 0 END), 0)
      `, [lastWeekStart, lastWeekEnd]);
      
      let processed = 0;
      let totalCashback = 0;
      
      for (const user of usersResult.rows) {
        const netLoss = parseFloat(user.total_bets) - parseFloat(user.total_wins);
        const cashbackPercent = getCashbackPercent(user.vip_level || 1);
        const cashbackAmount = netLoss * (cashbackPercent / 100);
        const wagerRequired = cashbackAmount * 5;
        
        if (cashbackAmount >= 10) {
          await pool.query(
            `INSERT INTO cashback_records (user_id, amount, period, wager_required, status)
             VALUES ($1, $2, 'weekly', $3, 'pending')`,
            [user.id, cashbackAmount, wagerRequired]
          );
          processed++;
          totalCashback += cashbackAmount;
        }
      }
      
      lastCashbackWeek = weekKey;
      console.log(`[Cashback] Done: ${processed} users, total ₽${totalCashback.toFixed(2)}`);
    } catch (err) {
      console.error('[Cashback] Auto-process error:', err.message);
    }
  }
  
  setInterval(processWeeklyCashbackAuto, 60 * 60 * 1000); // check every hour
  setTimeout(processWeeklyCashbackAuto, 10000); // check on startup too

  // Weekly referral GGR commission — process on Monday alongside cashback
  const { processWeeklyReferralGGR } = require('./routes/referral');
  let lastReferralWeek = null;

  async function processWeeklyReferralAuto() {
    const now = new Date();
    if (now.getDay() !== 1 || now.getHours() !== 0) return;

    const weekKey = `ref-${now.getFullYear()}-W${Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)}`;
    if (lastReferralWeek === weekKey) return;

    console.log('[Referral] Auto-processing weekly GGR commissions...');
    try {
      const result = await processWeeklyReferralGGR(pool);
      lastReferralWeek = weekKey;
      console.log(`[Referral] Done: ${result.processed} referrers, total ₽${result.totalCommission.toFixed(2)}`);
    } catch (err) {
      console.error('[Referral] Auto-process error:', err.message);
    }
  }

  setInterval(processWeeklyReferralAuto, 60 * 60 * 1000);
  setTimeout(processWeeklyReferralAuto, 12000);
});

module.exports = app;