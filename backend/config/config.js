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

  // Slots Provider API Configuration (SoftGamings / Fundist)
  slotsApi: {
    baseUrl: process.env.SLOTS_API_BASE_URL || 'https://apitest.fundist.org',
    apiKey: process.env.SLOTS_API_KEY || '437e6b584169d07e82f9a1c13339baf8',
    apiPassword: process.env.SLOTS_API_PASSWORD || '0708739935452648',
    hmacSecret: process.env.SLOTS_HMAC_SECRET || 'p8mlp1ydk33510g2i9oil0xxgtkisbj8n3sq8n4q1djev5184syflj769ox0fuv3',
    callbackUrl: process.env.CALLBACK_URL || 'https://aurex-casino-production.up.railway.app/api/callback/softgamings'
  },

  // AVE PAY Payment System
  avePay: {
    apiUrl: process.env.AVEPAY_API_URL || 'https://engine.avepay.com',
    apiKey: process.env.AVEPAY_API_KEY || 'XPozUj2CezbUCXz0rS7xVNfFJNCfaQBd',
    webhookSecret: process.env.AVEPAY_WEBHOOK_SECRET || 'Ss1C1ibuEHvU',
    callbackUrl: process.env.AVEPAY_CALLBACK_URL || 'https://aurex.casino/api/payments/avepay/callback',
    returnUrl: process.env.AVEPAY_RETURN_URL || 'https://aurex1.casino/wallet'
  },

  // Expay Payment System
  expay: {
    apiUrl: process.env.EXPAY_API_URL || 'https://apiv2.expay.cash',
    publicKey: process.env.EXPAY_PUBLIC_KEY || 't5u0ia4gxxrtalfmml3qhv3qs63174iuysm6fxiszfaf9g07s1vlvr2648ndvzjc',
    privateKey: process.env.EXPAY_PRIVATE_KEY || '7t05s96sl4ithqxhvfxj4gkmu97d29gk44vmzfoptaoaom7ti5oeo5gzlnq18ey19uiaqdaha5s554bp5fmgnmx1xob6vin0ncm73f4xfn13z5anqh5qht23qvdnnsxw',
    callbackUrl: process.env.EXPAY_CALLBACK_URL || 'https://aurex-casino-production.up.railway.app/api/payments/expay/callback'
  },

  // Nirvana Pay Payment System
  nirvanaPay: {
    apiUrl: process.env.NIRVANAPAY_API_URL || 'https://api.nirvanapay.pro',
    apiPublicKey: process.env.NIRVANAPAY_PUBLIC_KEY || '00cb61a2-3b3f-4b70-b2df-efe1487e15fe',
    apiPrivateKey: process.env.NIRVANAPAY_PRIVATE_KEY || 'ad9174c6-db56-476f-ad82-4a200f3ea14e',
    callbackUrl: process.env.NIRVANAPAY_CALLBACK_URL || 'https://aurex-casino-production.up.railway.app/api/payments/nirvana/callback'
  },

  // Rukassa Payment System
  rukassa: {
    shopId: process.env.RUKASSA_SHOP_ID || '3596',
    token: process.env.RUKASSA_TOKEN || 'bf451c373f382bf178d47a461ba058524',
    callbackUrl: process.env.RUKASSA_CALLBACK_URL || 'https://aurex-casino-production.up.railway.app/api/payments/rukassa/callback'
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