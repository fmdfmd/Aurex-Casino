# 🎰 AUREX Casino - The Golden Empire of Win

Premium crypto casino platform with VIP system, real-time jackpots, and exclusive tournaments.

## 🚀 Quick Start (Railway Deployment)

### Prerequisites
- GitHub account
- Railway account (https://railway.app)
- PostgreSQL database on Railway

### 1. Deploy Database
1. Go to Railway dashboard
2. Create new project → Add PostgreSQL
3. Copy `DATABASE_URL` from database settings

### 2. Deploy Backend
1. Create new service from GitHub repo
2. Set root directory: `/backend`
3. Add environment variables:
   ```
   NODE_ENV=production
   PORT=6000
   DATABASE_URL=<your-postgres-url>
   JWT_SECRET=<generate-random-secret>
   FRONTEND_URL=<will-add-after-frontend-deploy>
   ```
4. Deploy will auto-run migrations and seed data
5. Copy backend URL (e.g., `https://aurex-backend.railway.app`)

### 3. Deploy Frontend
1. Create new service from GitHub repo
2. Set root directory: `/frontend`
3. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=<your-backend-url>
   NEXT_PUBLIC_SITE_URL=<your-frontend-url>
   ```
4. Deploy and copy frontend URL

### 4. Update Backend CORS
Go back to backend service and update:
```
FRONTEND_URL=<your-frontend-url>
```
Redeploy backend service.

## 🔐 Default Admin Credentials
```
Username: admin
Password: admin123
VIP Level: Emperor (5)
Balance: 100,000₽
```

## 📦 Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL (Railway)
- JWT Authentication
- bcrypt password hashing
- Real-time jackpot system

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand (state management)
- i18next (localization)

## 🎮 Features

### ✅ User Features
- Multi-language support (RU, EN, DE, ES, PT)
- Multi-currency (RUB, EUR, USD, USDT)
- Real-time balance updates
- Responsive mobile-first design
- Dark theme UI

### ✅ Gaming
- 2,500+ premium games
- Multiple providers (Pragmatic, NetEnt, etc.)
- Game search & filters
- Favorites system
- Free play & real money modes

### ✅ VIP System
- 5 VIP levels (Bronze → Emperor)
- Progressive cashback (5% → 15%)
- Weekly bonuses
- Personal VIP manager
- Exclusive tournaments

### ✅ Jackpots
- 4 progressive jackpots (Emperor, Gold, Silver, Bronze)
- Real-time prize pool updates
- Custom jackpot icons
- Winner notifications

### ✅ Promotions
- Welcome package up to ₽140,000
- Reload bonuses
- Cashback system
- Crypto bonuses
- VIP exclusive offers

### ✅ Tournaments
- Real-time leaderboards
- Prize pools up to ₽25,000,000
- Multiple concurrent tournaments
- Live participant tracking

### ✅ Referral Program
- Unique referral codes
- 10% commission from referrals
- Multi-tier rewards
- Real-time earnings tracking

### ✅ Admin Panel
- User management (balance, VIP, status)
- Transaction monitoring
- Bonus management
- Site settings configuration
- Support ticket system
- Analytics dashboard

## 🛠️ Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run migrate
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with NEXT_PUBLIC_API_URL
npm run dev
```

Open http://localhost:3000

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=6000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
FRONTEND_URL=https://your-domain.com
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:6000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🗄️ Database

PostgreSQL schema includes:
- Users & authentication
- Transactions & payments
- Bonuses & wagering
- Game sessions
- Jackpot winners
- Tournaments & participants
- Support tickets
- Site settings

Auto-migrations run on Railway deployment.

## 📱 Pages

- `/` - Homepage
- `/games` - Games catalog
- `/jackpots` - Progressive jackpots
- `/tournaments` - Active tournaments
- `/promotions` - Bonuses & offers
- `/vip` - VIP program
- `/referral` - Referral program
- `/wallet` - Deposits & withdrawals
- `/profile` - User profile
- `/settings` - User settings
- `/admin/*` - Admin panel

## 🌍 Localization

Supports 5 languages:
- 🇷🇺 Russian (default)
- 🇬🇧 English
- 🇩🇪 German
- 🇪🇸 Spanish
- 🇵🇹 Portuguese

## 💰 Currency Support

- RUB (₽) - Russian Ruble
- EUR (€) - Euro
- USD ($) - US Dollar
- USDT - Tether (crypto)

## 🎨 Design System

### Colors
- **Obsidian Black**: `#0A0A0F` (background)
- **Aurex Gold**: `#D4AF37` (primary)
- **Platinum**: `#E5E4E2` (secondary)

### Typography
- Primary: Cinzel (serif, headings)
- System fonts (body text)

## 📊 API Endpoints

### Public
- `GET /api/config/stats` - Platform statistics
- `GET /api/config/jackpots` - Jackpot pools
- `GET /api/config/promotions` - Active promotions
- `GET /api/slots/games` - Games catalog
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Protected
- `GET /api/auth/me` - Current user
- `GET /api/users/profile` - User profile
- `POST /api/wallet/deposit` - Deposit request
- `POST /api/wallet/withdraw` - Withdrawal request
- `GET /api/bonuses/available` - Available bonuses
- `GET /api/tournaments/active` - Active tournaments

### Admin
- `GET /api/admin/users` - All users
- `PUT /api/admin/users/:id` - Update user
- `GET /api/admin/transactions` - All transactions
- `GET /api/admin/tickets` - Support tickets
- `GET /api/admin/settings` - Site settings
- `PUT /api/admin/settings` - Update settings

## 🔒 Security

- JWT authentication
- bcrypt password hashing (12 rounds)
- CORS protection
- Helmet.js security headers
- Rate limiting
- Input validation
- SQL injection prevention (parameterized queries)
- XSS protection

## 🚢 Deployment Checklist

- [ ] Create Railway account
- [ ] Deploy PostgreSQL database
- [ ] Deploy backend service
- [ ] Deploy frontend service
- [ ] Configure environment variables
- [ ] Update CORS settings
- [ ] Test admin login
- [ ] Test user registration
- [ ] Test game integration
- [ ] Configure custom domain (optional)

## 📧 Support

For issues and questions:
- Email: admin@aurex.casino
- Telegram: @aurex_support (setup required)

## 📄 License

Proprietary - All rights reserved

---

**Built with 💎 by the AUREX team**

*The Golden Empire of Win awaits you!* 👑
