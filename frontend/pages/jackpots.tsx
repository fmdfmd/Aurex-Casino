import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import {
  Crown,
  Trophy,
  Gem,
  Star,
  Sparkles,
  TrendingUp,
  Users,
  Clock,
  Zap,
  ChevronRight,
  Play,
  Timer,
  Gift
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslation } from '../hooks/useTranslation';
import { JackpotIcon } from '../components/JackpotIcons';

interface Jackpot {
  id: string;
  name: string;
  tier: 'emperor' | 'gold' | 'silver' | 'bronze';
  amount: number;
  currency: string;
  icon: string;
  gradient: string;
  lastWinner?: string;
  lastWinAmount?: number;
  avgDropTime: string;
  minBet: number;
}

interface Winner {
  id: string;
  username: string;
  jackpot: string;
  amount: number;
  date: string;
  avatar: string;
}

export default function JackpotsPage() {
  const { t } = useTranslation();
  const [jackpots, setJackpots] = useState<Jackpot[]>([]);
  const [recentWinners, setRecentWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch jackpots from API
  useEffect(() => {
    const fetchJackpots = async () => {
      try {
        const res = await fetch('/api/config/jackpots');
        const data = await res.json();
        if (data.success) {
          const mappedJackpots: Jackpot[] = data.data.pools.map((pool: any) => ({
            id: pool.id,
            name: pool.name,
            tier: pool.id as 'emperor' | 'gold' | 'silver' | 'bronze',
            amount: pool.amount,
            currency: '₽',
            icon: pool.id, // Will use JackpotIcon component
            gradient: pool.id === 'emperor' ? 'from-aurex-gold-500 via-amber-400 to-aurex-gold-600' :
                     pool.id === 'gold' ? 'from-yellow-400 via-yellow-500 to-orange-500' :
                     pool.id === 'silver' ? 'from-gray-300 via-gray-400 to-gray-500' :
                     'from-amber-600 via-amber-700 to-amber-800',
            lastWinner: pool.lastWinner || '—',
            lastWinAmount: pool.lastWinAmount || 0,
            avgDropTime: pool.avgDropTime || '—',
            minBet: pool.minBet
          }));
          setJackpots(mappedJackpots);
          
          // Map last winners if available
          if (data.data.lastWinners && data.data.lastWinners.length > 0) {
            setRecentWinners(data.data.lastWinners);
          }
        }
      } catch (error) {
        console.error('Failed to fetch jackpots:', error);
      }
      setIsLoading(false);
    };

    fetchJackpots();
    
    // Poll every 3 seconds for real-time updates
    const pollInterval = setInterval(fetchJackpots, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  // Данные из API или пустые массивы
  const displayWinners = recentWinners;
  const displayJackpots = jackpots;

  const formatNumber = (num: number) => {
    return num.toLocaleString('ru-RU');
  };

  const getTierGlow = (tier: string) => {
    switch (tier) {
      case 'emperor': return 'shadow-[0_0_60px_rgba(212,175,55,0.5)]';
      case 'gold': return 'shadow-[0_0_40px_rgba(245,158,11,0.4)]';
      case 'silver': return 'shadow-[0_0_30px_rgba(156,163,175,0.3)]';
      case 'bronze': return 'shadow-[0_0_25px_rgba(180,83,9,0.3)]';
      default: return '';
    }
  };

  const translateJackpotTier = (tier: string) => {
    const tierLower = tier.toLowerCase();
    if (tierLower === 'emperor') return t('jackpots.emperor');
    if (tierLower === 'gold') return t('jackpots.gold');
    if (tierLower === 'silver') return t('jackpots.silver');
    if (tierLower === 'bronze') return t('jackpots.bronze');
    return tier;
  };

  return (
    <>
      <Head>
        <title>Imperial Jackpots — AUREX</title>
        <meta name="description" content="Накопительные джекпоты AUREX с призами до ₽50,000,000. Играйте и выигрывайте огромные суммы!" />
      </Head>

      <div className="min-h-screen bg-aurex-obsidian-900">
        <Header />

        <main className="pb-12">
          {/* Hero Section with Background */}
          <section 
            className="relative overflow-hidden min-h-[550px] md:h-[550px] flex items-center justify-center pt-24 pb-8"
            style={{
              backgroundImage: 'url(/images/jackpots-bg.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-aurex-obsidian-900"></div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
              {/* Header */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.8 }}
                className="inline-block mb-6"
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-aurex-gold-500 rounded-full blur-3xl opacity-60"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 rounded-full flex items-center justify-center shadow-2xl">
                    <Crown className="w-12 h-12 md:w-16 md:h-16 text-aurex-obsidian-900" />
                  </div>
                </div>
              </motion.div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-2xl" style={{ fontFamily: 'Cinzel, serif' }}>
                {t('jackpots.title')}
              </h1>
              <p className="text-aurex-platinum-200 text-xl md:text-2xl max-w-3xl mx-auto mb-8">
                {t('jackpots.subtitle')}
              </p>

              {/* Total Jackpot */}
              <div className="mt-6">
                <div className="text-aurex-platinum-300 text-sm md:text-base mb-3 uppercase tracking-wider">{t('jackpots.totalPrizePool')}</div>
                <div className="text-4xl sm:text-5xl md:text-8xl font-black text-aurex-gold-500 drop-shadow-2xl">
                  ₽{formatNumber(jackpots.reduce((sum, jp) => sum + jp.amount, 0))}
                </div>
              </div>
            </div>
          </section>

          {/* Jackpots Grid Section */}
          <section className="bg-aurex-obsidian-900 py-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                {displayJackpots.map((jackpot, index) => (
                  <motion.div
                    key={jackpot.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className={`relative overflow-hidden rounded-2xl ${getTierGlow(jackpot.tier)}`}
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${jackpot.gradient} opacity-10`}></div>
                    
                    {/* Card content */}
                    <div className="relative aurex-card border-2 border-opacity-30" style={{ borderColor: jackpot.tier === 'emperor' ? '#D4AF37' : jackpot.tier === 'gold' ? '#F59E0B' : jackpot.tier === 'silver' ? '#9CA3AF' : '#B45309' }}>
                      {/* Tier badge */}
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${jackpot.gradient}`}></div>
                      
                      <div className="p-6 md:p-8">
                        {/* Icon and Title */}
                        <div className="flex items-center gap-4 mb-6">
                          {/* Custom Jackpot Icon */}
                          <div className="relative">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-br rounded-full blur-xl opacity-50"
                              style={{
                                background: jackpot.tier === 'emperor' ? 'linear-gradient(135deg, #FFD700, #D4AF37)' :
                                           jackpot.tier === 'gold' ? 'linear-gradient(135deg, #F59E0B, #B45309)' :
                                           jackpot.tier === 'silver' ? 'linear-gradient(135deg, #D1D5DB, #6B7280)' :
                                           'linear-gradient(135deg, #D97706, #78350F)'
                              }}
                              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <JackpotIcon tier={jackpot.tier} className="w-20 h-20 relative z-10" />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-1">{jackpot.name}</h3>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                jackpot.tier === 'emperor' ? 'bg-aurex-gold-500/20 text-aurex-gold-500 border border-aurex-gold-500/30' :
                                jackpot.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                jackpot.tier === 'silver' ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                                'bg-amber-700/20 text-amber-500 border border-amber-700/30'
                              }`}>
                                {translateJackpotTier(jackpot.tier)}
                              </span>
                              <span className="text-aurex-platinum-500 text-sm">
                                Мин. ставка: <span className="text-white font-semibold">₽{jackpot.minBet}</span>
                              </span>
                            </div>
                          </div>
                          
                          <motion.div
                            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <Sparkles className="w-10 h-10 text-aurex-gold-500/60" />
                          </motion.div>
                        </div>

                        {/* Jackpot Amount - Main Feature */}
                        <div className="relative mb-8 py-6 px-4 rounded-2xl bg-gradient-to-br from-aurex-obsidian-800/80 to-aurex-obsidian-900/80 border border-white/5">
                          <div className="absolute inset-0 overflow-hidden rounded-2xl">
                            <div className={`absolute inset-0 bg-gradient-to-r ${jackpot.gradient} opacity-5`}></div>
                          </div>
                          <div className="relative text-center">
                            <motion.div
                              className={`text-5xl md:text-6xl font-black bg-gradient-to-r ${jackpot.gradient} bg-clip-text text-transparent drop-shadow-2xl`}
                              key={jackpot.amount}
                              initial={{ scale: 1.05 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300 }}
                            >
                              {jackpot.currency}{formatNumber(jackpot.amount)}
                            </motion.div>
                            <motion.div 
                              className="mt-2 flex items-center justify-center gap-2 text-green-500 text-sm"
                              animate={{ opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <TrendingUp className="w-4 h-4" />
                              <span>Растёт каждую секунду</span>
                            </motion.div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-aurex-obsidian-800/60 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 text-aurex-platinum-500 text-xs mb-2">
                              <Timer className="w-4 h-4" />
                              Средний дроп
                            </div>
                            <div className="text-white font-bold text-lg">{jackpot.avgDropTime}</div>
                          </div>
                          <div className="bg-aurex-obsidian-800/60 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 text-aurex-platinum-500 text-xs mb-2">
                              <Trophy className="w-4 h-4" />
                              Последний выигрыш
                            </div>
                            <div className="text-aurex-gold-500 font-bold text-lg">₽{formatNumber(jackpot.lastWinAmount || 0)}</div>
                          </div>
                        </div>

                        {/* Play button */}
                        <motion.button 
                          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 group transition-all duration-300 ${
                            jackpot.tier === 'emperor' 
                              ? 'bg-gradient-to-r from-aurex-gold-500 to-amber-500 text-aurex-obsidian-900 hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]' 
                              : jackpot.tier === 'gold'
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-aurex-obsidian-900 hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                              : jackpot.tier === 'silver'
                              ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-aurex-obsidian-900 hover:shadow-[0_0_20px_rgba(156,163,175,0.5)]'
                              : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:shadow-[0_0_20px_rgba(180,83,9,0.5)]'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-lg">{t('jackpots.playForJackpot')}</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Recent Winners */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="aurex-card p-6 md:p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-aurex-gold-500" />
                    <h2 className="text-2xl font-bold text-white">Последние победители</h2>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex items-center gap-2 text-green-500 text-sm"
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Live
                  </motion.div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-aurex-platinum-500 text-sm">
                        <th className="pb-4">Игрок</th>
                        <th className="pb-4">Джекпот</th>
                        <th className="pb-4">Выигрыш</th>
                        <th className="pb-4 text-right">Время</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayWinners.map((winner, index) => (
                        <motion.tr
                          key={winner.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                          className="border-t border-aurex-obsidian-700"
                        >
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{winner.avatar}</span>
                              <span className="text-white font-medium">{winner.username}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                              winner.jackpot === 'Emperor' ? 'bg-aurex-gold-500/20 text-aurex-gold-500' :
                              winner.jackpot === 'Gold' ? 'bg-yellow-500/20 text-yellow-500' :
                              winner.jackpot === 'Silver' ? 'bg-gray-400/20 text-gray-400' :
                              'bg-amber-700/20 text-amber-600'
                            }`}>
                              {translateJackpotTier(winner.jackpot)}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="text-aurex-gold-500 font-bold">₽{formatNumber(winner.amount)}</span>
                          </td>
                          <td className="py-4 text-right text-aurex-platinum-400">
                            {winner.date}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* How it works */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6"
              >
                {[
                  { icon: <Play className="w-8 h-8" />, title: 'Играйте', desc: 'Делайте ставки в любых слотах с джекпотом' },
                  { icon: <TrendingUp className="w-8 h-8" />, title: 'Накапливайте', desc: 'Часть каждой ставки идёт в призовой фонд' },
                  { icon: <Zap className="w-8 h-8" />, title: 'Выигрывайте', desc: 'Джекпот может выпасть в любой момент' },
                  { icon: <Gem className="w-8 h-8" />, title: 'Получайте', desc: 'Мгновенный вывод выигрыша на баланс' },
                ].map((step, index) => (
                  <div key={index} className="aurex-card p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-aurex-gold-500/10 flex items-center justify-center text-aurex-gold-500 mx-auto mb-4">
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-aurex-platinum-400">{step.desc}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
