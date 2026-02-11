import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Trophy, 
  Zap, 
  Star, 
  Play,
  Gift,
  Crown,
  TrendingUp,
  Users,
  Gamepad2
} from 'lucide-react';
import Layout from '../components/Layout';
import GameCard from '../components/GameCard';
import PromoBannerSlider from '../components/PromoBannerSlider';
import { useGamesQuery } from '../hooks/useGames';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { JackpotIcon } from '../components/JackpotIcons';

import CategoryCard from '../components/CategoryCard';
import { toast } from 'react-hot-toast';

interface PlatformStats {
  activePlayers: string;
  gamesAvailable: string;
  totalPayouts: string;
  averageRtp: string;
}

interface JackpotPool {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  
  const features = [
    {
      icon: Sparkles,
      title: t('features.instantPayouts'),
      description: t('features.instantPayoutsDesc')
    },
    {
      icon: Crown,
      title: t('features.vipProgram'),
      description: t('features.vipProgramDesc')
    },
    {
      icon: Gift,
      title: t('features.generousBonuses'),
      description: t('features.generousBonusesDesc')
    },
    {
      icon: Zap,
      title: t('features.tournaments247'),
      description: t('features.tournaments247Desc')
    }
  ];
  const { data: gamesData, isLoading: gamesLoading } = useGamesQuery();
  const [particles, setParticles] = useState<Array<{left: string, delay: string, duration: string}>>([]);
  const [isClient, setIsClient] = useState(false);
  
  // API data (initial values shown while loading)
  const [stats, setStats] = useState<PlatformStats>({
    activePlayers: '—',
    gamesAvailable: '—',
    totalPayouts: '—',
    averageRtp: '—'
  });
  const [jackpots, setJackpots] = useState<JackpotPool[]>([]);

  useEffect(() => {
    setIsClient(true);
    // Generate particles only on client side
    const particleArray = Array.from({ length: 50 }).map(() => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 6}s`,
      duration: `${6 + Math.random() * 4}s`
    }));
    setParticles(particleArray);

    // Fetch platform stats
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/config/stats');
        const data = await res.json();
        if (data.success) {
          setStats({
            activePlayers: data.data.activePlayers,
            gamesAvailable: data.data.gamesAvailable,
            totalPayouts: data.data.totalPayouts,
            averageRtp: data.data.averageRtp
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    // Fetch jackpots (with polling for real-time)
    const fetchJackpots = async () => {
      try {
        const res = await fetch('/api/config/jackpots');
        const data = await res.json();
        if (data.success && data.data?.pools) {
          setJackpots(data.data.pools);
        }
      } catch (error) {
        console.error('Failed to fetch jackpots:', error);
      }
    };

    fetchStats();
    fetchJackpots();

    // Poll jackpots every 5 seconds for real-time updates
    const jackpotInterval = setInterval(fetchJackpots, 5000);
    return () => clearInterval(jackpotInterval);
  }, []);

  const statsDisplay = [
    { label: t('stats.activePlayers'), value: stats.activePlayers, icon: Users },
    { label: t('stats.gamesAvailable'), value: stats.gamesAvailable, icon: Gamepad2 },
    { label: t('stats.totalPayouts'), value: stats.totalPayouts, icon: TrendingUp },
    { label: t('stats.averageRtp'), value: stats.averageRtp, icon: Trophy },
  ];

  const featuredGames = gamesData?.data?.data?.data?.groups?.[0]?.games?.slice(0, 12) || gamesData?.data?.games?.slice(0, 12) || [];
  
  // Fake data for Category Cards (visuals)
  const slotGames = featuredGames.slice(0, 4).map(g => ({ id: g.id, name: g.name, image: g.image || g.imageUrl }));
  const liveGames = [
    { id: 'evo-crazy-time', name: 'Crazy Time', image: 'https://img.slotgrator.com/games/evolution/crazy_time.png' },
    { id: 'evo-blackjack', name: 'Blackjack VIP', image: 'https://img.slotgrator.com/games/evolution/blackjack_vip.png' },
    { id: 'evo-roulette', name: 'Lightning Roulette', image: 'https://img.slotgrator.com/games/evolution/lightning_roulette.png' },
    { id: 'evo-monopoly', name: 'Monopoly Live', image: 'https://img.slotgrator.com/games/evolution/monopoly_live.png' }
  ];

  const handleSportClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.error('Раздел "Спорт" находится в разработке. Скоро открытие!', {
      style: {
        background: '#1F2937',
        color: '#fff',
        border: '1px solid #D4AF37',
      },
      icon: '🚧',
    });
  };

  return (
    <>
      <Head>
        <title>AUREX - The Golden Empire of Win | Премиум Крипто Казино</title>
        <meta name="description" content="AUREX - премиальная игровая платформа для High-roller и Crypto-investors. Мгновенные крипто-выплаты, VIP программа, эксклюзивные игры. The Golden Empire of Win." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </Head>

      <Layout>
        {/* Hero Section - AUREX Empire */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="/images/hero-bg.png"
              alt="AUREX - The Golden Empire"
              fill
              className="object-cover object-center"
              priority
              quality={100}
            />
            {/* Dark overlay for better readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-aurex-obsidian-900 via-aurex-obsidian-900/60 to-aurex-obsidian-900/20"></div>
            {/* Extra center darkening for text area */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-aurex-obsidian-900/40 to-aurex-obsidian-900"></div>
          </div>
          
          {/* AUREX Golden particles */}
          {isClient && (
            <div className="particles">
              {particles.map((particle, i) => (
                <div
                  key={i}
                  className="aurex-particle"
                  style={{
                    left: particle.left,
                    animationDelay: particle.delay,
                    animationDuration: particle.duration
                  }}
                />
              ))}
            </div>
          )}

          <div className="relative z-10 text-center max-w-6xl mx-auto px-4 pt-32">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Spacer for the AUREX text on background */}
              <div className="h-24 sm:h-32 md:h-40"></div>
              
              {/* Text with backdrop for readability */}
              <div className="backdrop-blur-sm bg-aurex-obsidian-900/50 rounded-2xl px-8 py-6 mb-12 max-w-3xl mx-auto border border-aurex-gold-500/10">
                <p className="text-xl md:text-2xl text-white mb-2 leading-relaxed font-medium drop-shadow-lg">
                  {t('hero.title')} <span className="text-aurex-gold-500 font-bold">{t('hero.highroller')}</span> {t('hero.and')} <span className="text-aurex-gold-500 font-bold">{t('hero.crypto')}</span>
                </p>
                <p className="text-base md:text-lg text-aurex-platinum-300">
                  {t('hero.subtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
                {!isAuthenticated ? (
                  <>
                    <Link href="/register">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="glow-button px-10 py-4 rounded-xl font-black text-lg text-aurex-obsidian-900 tracking-wide aurex-shimmer shadow-aurex-gold-lg"
                      >
                        <Crown className="inline-block w-6 h-6 mr-2" />
                        {t('hero.joinEmpire')}
                      </motion.button>
                    </Link>
                    
                    <Link href="/games">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="aurex-black-button px-10 py-4 rounded-xl font-bold text-lg tracking-wide"
                      >
                        <Play className="inline-block w-6 h-6 mr-2" />
                        {t('hero.demoMode')}
                      </motion.button>
                    </Link>
                  </>
                ) : (
                  <Link href="/games">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="glow-button px-10 py-4 rounded-xl font-black text-lg text-aurex-obsidian-900 tracking-wide shadow-aurex-gold-lg"
                    >
                      <Play className="inline-block w-6 h-6 mr-2" />
                      {t('hero.joinEmpire')}
                    </motion.button>
                  </Link>
                )}
              </div>

              {/* Premium Welcome Bonus */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="inline-block"
              >
                <div className="aurex-vip-card rounded-2xl p-8 backdrop-blur-sm shadow-aurex-gold-lg">
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-aurex-gold-500 blur-xl opacity-50"></div>
                      <Gift className="relative w-16 h-16 text-aurex-gold-500 drop-shadow-2xl" />
                    </div>
                    <div className="text-center md:text-left">
                      <p className="text-aurex-platinum-400 text-sm uppercase tracking-widest mb-2 font-semibold">
                        {t('hero.welcomeBonus')}
                      </p>
                      <p className="text-4xl md:text-5xl font-black aurex-imperial-text mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                        {t('hero.upTo')} 100 000₽
                      </p>
                      <p className="text-aurex-gold-500 text-xl font-bold tracking-wider">
                        + 200 {t('hero.freeSpins')}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Promo Banner Slider */}
        <PromoBannerSlider />

        {/* Stats Section - AUREX Empire */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-aurex-obsidian-900 via-aurex-gold-900/30 to-aurex-obsidian-900"></div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(212, 175, 55, 0.5) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          {/* Golden glow effects */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-aurex-gold-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
          
          {/* Golden divider top */}
          <div className="aurex-divider mb-16"></div>
          
          <div className="relative max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-4 aurex-imperial-text" style={{ fontFamily: 'Cinzel, serif' }}>
                {t('stats.title')}
              </h2>
              <p className="text-aurex-platinum-400 text-lg">{t('stats.subtitle')}</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {statsDisplay.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-aurex-gold-500 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>
                    <div className="relative aurex-empire-border rounded-2xl p-4 bg-aurex-obsidian-800/70 backdrop-blur-sm border border-aurex-gold-500/20">
                      <stat.icon className="w-12 h-12 text-aurex-gold-400 mx-auto drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="text-4xl font-black aurex-imperial-text mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                    {stat.value}
                  </div>
                  <div className="text-aurex-platinum-400 font-medium tracking-wide">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          {/* Golden divider bottom */}
          <div className="aurex-divider mt-16"></div>
        </section>

        {/* Main Categories - Dragon Style */}
        <section className="py-12 relative z-20 -mt-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* SLOTS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="h-[320px]"
              >
                <CategoryCard
                  title="Слоты"
                  onlineCount={1692}
                  href="/games"
                  gradient="bg-gradient-to-br from-[#4f46e5] to-[#0f172a]" // Indigo to Dark Blue
                  // image="/images/slots-char.png" 
                  buttonText="Играть"
                  games={slotGames.length > 0 ? slotGames : [
                    { id: 1, name: 'Sweet Bonanza', image: 'https://img.slotgrator.com/games/pragmatic/sweet_bonanza.png' },
                    { id: 2, name: 'Gates of Olympus', image: 'https://img.slotgrator.com/games/pragmatic/gates_of_olympus.png' },
                    { id: 3, name: 'The Dog House', image: 'https://img.slotgrator.com/games/pragmatic/the_dog_house.png' },
                    { id: 4, name: 'Sugar Rush', image: 'https://img.slotgrator.com/games/pragmatic/sugar_rush.png' }
                  ]}
                />
              </motion.div>

              {/* LIVE DEALERS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="h-[320px]"
              >
                <CategoryCard
                  title="Live Dealers"
                  onlineCount={845}
                  href="/games/live"
                  gradient="bg-gradient-to-br from-[#059669] to-[#022c22]" // Emerald to Dark Green
                  // image="/images/live-char.png"
                  buttonText="Играть"
                  games={liveGames}
                />
              </motion.div>

              {/* SPORT */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="h-[320px]"
              >
                <CategoryCard
                  title="Sport"
                  onlineCount={312}
                  href="/sport"
                  gradient="bg-gradient-to-br from-[#dc2626] to-[#450a0a]" // Red to Dark Red
                  // image="/images/sport-char.png"
                  buttonText="Ставки"
                  isSport={true}
                  onClick={handleSportClick}
                />
              </motion.div>

            </div>
          </div>
        </section>

        {/* Featured Games - AUREX Collection */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-aurex-obsidian-900 via-aurex-obsidian-800 to-aurex-obsidian-900"></div>
          {/* Decorative gaming lights */}
          <div className="absolute top-20 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-0 w-80 h-80 bg-aurex-gold-500/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-aurex-gold-500/5 rounded-full blur-3xl"></div>
          <div className="relative max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-aurex-gold-500"></div>
                <Gamepad2 className="w-8 h-8 text-aurex-gold-500" />
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-aurex-gold-500"></div>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-black mb-6 aurex-imperial-text" style={{ fontFamily: 'Cinzel, serif' }}>
                {t('games.title')}
              </h2>
              <p className="text-xl text-aurex-platinum-400 max-w-3xl mx-auto leading-relaxed">
                {t('games.subtitle')}
                <br />
                <span className="text-aurex-gold-500 font-semibold">{t('games.features')}</span>
              </p>
            </motion.div>

            {gamesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="shimmer h-48 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                {featuredGames.map((game, index) => (
                  <motion.div
                    key={game.id || index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GameCard game={game} />
                  </motion.div>
                ))}
              </div>
            )}

            <div className="text-center mt-16">
              <Link href="/games">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="aurex-black-button px-12 py-4 rounded-xl font-bold text-lg tracking-wide inline-flex items-center gap-3 shadow-aurex-gold"
                >
                  <Gamepad2 className="w-6 h-6" />
                  {t('games.openCollection')}
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    →
                  </motion.span>
                </motion.button>
              </Link>
            </div>
          </div>
        </section>

        {/* Imperial Jackpots Widget */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-aurex-obsidian-900 via-amber-900/20 to-aurex-obsidian-900"></div>
          {/* Jackpot gold glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-aurex-gold-500/15 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <Crown className="w-8 h-8 text-aurex-gold-500" />
                <h2 className="text-3xl md:text-4xl font-black text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                  IMPERIAL <span className="text-aurex-gold-500">JACKPOTS</span>
                </h2>
                <Crown className="w-8 h-8 text-aurex-gold-500" />
              </div>
              <p className="text-aurex-platinum-400">{t('jackpots.subtitle')}</p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {jackpots.map((jp, index) => {
                const gradient = jp.color || 'from-aurex-gold-500 to-amber-500';
                return (
                  <motion.div
                    key={jp.id || jp.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="relative group cursor-pointer"
                  >
                    <Link href="/jackpots">
                      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-25 rounded-2xl group-hover:opacity-40 transition-opacity`}></div>
                      <div className="relative aurex-card p-4 md:p-6 text-center border-2 border-transparent group-hover:border-aurex-gold-500/30 transition-all">
                        <div className="flex justify-center mb-3">
                          <JackpotIcon tier={jp.id} className="w-16 h-16 md:w-20 md:h-20" />
                        </div>
                        <div className="text-xs md:text-sm text-aurex-platinum-500 uppercase tracking-wider mb-2">{jp.name?.replace(' JACKPOT', '') || jp.id?.toUpperCase()}</div>
                        <motion.div
                          className="text-xl md:text-3xl font-black text-white drop-shadow-lg"
                          animate={{ opacity: [1, 0.9, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          ₽{Math.round(jp.amount || 0).toLocaleString('ru-RU')}
                        </motion.div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link href="/jackpots">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="glow-button px-8 py-3 rounded-xl font-bold text-aurex-obsidian-900"
                >
                  {t('jackpots.playForJackpot')}
                </motion.button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section - AUREX Advantages */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-aurex-obsidian-800 via-aurex-gold-900/15 to-aurex-obsidian-800"></div>
          
          {/* Decorative elements - более яркие */}
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-aurex-gold-500/20 rounded-full blur-3xl -translate-y-1/2"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-center mb-20"
            >
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-aurex-gold-500"></div>
                <Star className="w-8 h-8 text-aurex-gold-500" />
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-aurex-gold-500"></div>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-black mb-6 aurex-imperial-text" style={{ fontFamily: 'Cinzel, serif' }}>
                {t('features.title')}
              </h2>
              <p className="text-xl text-aurex-platinum-400 max-w-2xl mx-auto">
                {t('features.subtitle')}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div className="relative aurex-empire-border rounded-2xl p-8 bg-aurex-obsidian-800/70 backdrop-blur-sm hover:bg-aurex-gold-900/30 transition-all duration-500 h-full border border-aurex-gold-500/10 hover:border-aurex-gold-500/30">
                    {/* Icon container */}
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-aurex-gold-500 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500"></div>
                      <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 flex items-center justify-center shadow-aurex-gold">
                        <feature.icon className="w-8 h-8 text-aurex-obsidian-900 drop-shadow" />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-aurex-gold-500 mb-3 group-hover:text-aurex-gold-400 transition-colors" style={{ fontFamily: 'Cinzel, serif' }}>
                      {feature.title}
                    </h3>
                    <p className="text-aurex-platinum-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - AUREX Imperial Invitation */}
        {!isAuthenticated && (
          <section className="py-32 relative overflow-hidden">
            {/* Premium gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-aurex-obsidian-900 via-aurex-gold-900/20 to-aurex-obsidian-900"></div>
            
            {/* Radial overlays */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full">
              <div className="absolute inset-0 bg-gradient-radial from-aurex-gold-500/20 via-transparent to-transparent"></div>
            </div>
            
            {/* Decorative corners */}
            <div className="absolute top-0 left-0 w-64 h-64 border-t-2 border-l-2 border-aurex-gold-500/30 rounded-tl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 border-b-2 border-r-2 border-aurex-gold-500/30 rounded-br-3xl"></div>
            
            <div className="relative max-w-5xl mx-auto text-center px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                {/* AUREX Logo in CTA */}
                <motion.div
                  className="flex justify-center mb-8"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-aurex-gold-500 blur-3xl opacity-50 animate-pulse"></div>
                    <Image
                      src="/images/aurexlogo.png"
                      alt="AUREX"
                      width={200}
                      height={80}
                      className="relative w-32 sm:w-40 md:w-48 h-auto drop-shadow-2xl"
                    />
                  </div>
                </motion.div>
                
                <h2 className="text-5xl md:text-7xl font-black mb-6 aurex-imperial-text" style={{ fontFamily: 'Cinzel, serif' }}>
                  {t('cta.title')}
                </h2>
                
                <div className="aurex-divider w-48 mx-auto my-8"></div>
                
                <p className="text-2xl md:text-3xl text-aurex-platinum-300 mb-6 leading-relaxed">
                  {t('cta.subtitle')}
                </p>
                
                <p className="text-xl text-aurex-platinum-400 mb-12 max-w-3xl mx-auto">
                  {t('cta.description')}
                  <br />
                  <span className="text-2xl font-bold text-aurex-gold-500">100,000₽ + 200 {t('hero.freeSpins')}</span>
                </p>
                
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="glow-button px-12 py-5 rounded-2xl font-black text-xl text-aurex-obsidian-900 tracking-wide aurex-shimmer shadow-aurex-glow inline-flex items-center gap-3"
                  >
                    <Crown className="w-7 h-7" />
                    {t('cta.startReign')}
                    <Sparkles className="w-7 h-7" />
                  </motion.button>
                </Link>
                
                {/* Trust indicators */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-12 flex flex-wrap justify-center items-center gap-8 text-aurex-platinum-400 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-aurex-gold-500" />
                    <span>Мгновенные крипто-выплаты</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-aurex-gold-500" />
                    <span>VIP-менеджер 24/7</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-aurex-gold-500" />
                    <span>Эксклюзивные турниры</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>
        )}
      </Layout>
    </>
  );
}