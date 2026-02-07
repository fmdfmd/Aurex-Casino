const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
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

// Game callback routes (специфический путь для callback от провайдера)
app.use('/api/callback', gameCallbackRoutes);

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

server.listen(PORT, () => {
  console.log(`🚀 AUREX Empire server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run setup after server is listening (non-blocking)
  setTimeout(() => runProductionSetup(), 1000);
});

module.exports = app;