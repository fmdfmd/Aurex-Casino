require('dotenv').config();

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 6000,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  },

  // Database - PostgreSQL only
  database: {
    postgresUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/aurex',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  // JWT Configuration
  jwt: {
    secret: (() => {
      if (!process.env.JWT_SECRET) {
        if (process.env.NODE_ENV === 'production') {
          console.error('FATAL: JWT_SECRET is not set in production! Server cannot start safely.');
          process.exit(1);
        }
        console.warn('WARNING: JWT_SECRET not set. Using random secret (dev only, tokens lost on restart).');
        return require('crypto').randomBytes(64).toString('hex');
      }
      return process.env.JWT_SECRET;
    })(),
    expiresIn: process.env.JWT_EXPIRE || '7d'
  },

  // Slots Provider API Configuration
  slotsApi: {
    baseUrl: process.env.SLOTS_API_BASE_URL || 'https://int.apichannel.cloud',
    fallbackUrl: process.env.SLOTS_API_FALLBACK_URL || 'https://icdnchannel.com',
    operatorId: '40282', // Жестко задаём правильный operator_id
    callbackUrl: process.env.CALLBACK_URL || 'https://api.aurex.io/api/'
  },

  // Lava Top Payment System
  lavaTop: {
    apiUrl: process.env.LAVA_TOP_API_URL || 'https://dev.lava.ru/',
    shopId: process.env.LAVA_TOP_SHOP_ID || 'your-shop-id',
    apiKey: process.env.LAVA_TOP_API_KEY || 'your-api-key'
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  },

  // Telegram Login
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || ''
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASS || 'your-app-password'
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 1000
  },

  // File uploads
  uploads: {
    maxFileSize: process.env.MAX_FILE_SIZE || '50mb',
    uploadPath: process.env.UPLOAD_PATH || 'uploads/'
  }
};