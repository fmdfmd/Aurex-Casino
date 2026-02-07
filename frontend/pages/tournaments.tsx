import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Crown, 
  Users, 
  Clock, 
  Star,
  Medal,
  Gamepad2,
  Calendar,
  Gift,
  TrendingUp,
  Play,
  Timer,
  Zap,
  Flame,
  Award,
  Target,
  Swords,
  Bitcoin,
  ChevronRight
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';

interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special' | 'vip';
  status: 'upcoming' | 'active' | 'finished';
  startTime: Date;
  endTime: Date;
  prizePool: number;
  currency: string;
  entryFee: number;
  maxParticipants: number;
  currentParticipants: number;
  game: string;
  gameIcon: string;
  prizes: { position: string; prize: string; icon?: React.ReactNode }[];
  requirements?: string[];
  isCrypto?: boolean;
  isVip?: boolean;
  isHot?: boolean;
}

export default function TournamentsPage() {
  const { t } = useTranslation();
  const { isAuthenticated, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('active');
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: { days: number; hours: number; minutes: number; seconds: number } }>({});
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tournaments from API
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await fetch('/api/tournaments');
        const data = await res.json();
        if (data.success) {
          // Map API data to Tournament interface
          const mappedTournaments: Tournament[] = data.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            type: t.type || 'daily',
            status: t.status,
            startTime: new Date(t.startDate || t.startTime),
            endTime: new Date(t.endDate || t.endTime),
            prizePool: t.prizePool || parseFloat(t.prize_pool || '0'),
            currency: '₽',
            entryFee: t.entryFee || t.minBet || 0,
            maxParticipants: t.maxParticipants || 0,
            currentParticipants: t.participantCount || t.participants?.length || 0,
            game: t.game || 'Все слоты',
            gameIcon: t.type === 'vip' ? '👑' : '🎰',
            prizes: t.prizes || [
              { position: '1', prize: `₽${((t.prizePool || 0) * 0.4).toLocaleString('ru-RU')}`, icon: <Crown className="w-5 h-5 text-aurex-gold-500" /> },
              { position: '2', prize: `₽${((t.prizePool || 0) * 0.25).toLocaleString('ru-RU')}`, icon: <Medal className="w-5 h-5 text-gray-300" /> },
              { position: '3', prize: `₽${((t.prizePool || 0) * 0.15).toLocaleString('ru-RU')}`, icon: <Medal className="w-5 h-5 text-amber-600" /> },
              { position: '4-10', prize: `₽${((t.prizePool || 0) * 0.02).toLocaleString('ru-RU')}` },
            ],
            isVip: t.type === 'vip',
            isHot: t.status === 'active',
          }));
          
          setTournaments(mappedTournaments);
        }
      } catch (error) {
        console.error('Failed to fetch tournaments:', error);
        // Пустой список при ошибке API
        setTournaments([]);
      }
      setIsLoading(false);
    };

    fetchTournaments();
  }, []);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<{ type: string; time: string; prize: string }[]>([]);

  // Fetch tournament schedule from API
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const res = await fetch('/api/tournaments/schedule');
        const data = await res.json();
        if (data.success) {
          setSchedule(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
      }
    };
    fetchSchedule();
  }, []);

  // Fetch leaderboard from API
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Get the active tournament for leaderboard
        const activeTournament = tournaments.find(t => t.status === 'active');
        if (activeTournament) {
          const res = await fetch(`/api/tournaments/${activeTournament.id}/leaderboard`);
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            setLeaderboard(data.data.map((entry: any, index: number) => ({
              position: index + 1,
              username: entry.username || 'Игрок',
              points: entry.points || entry.score || 0,
              prize: `₽${(entry.prize || 0).toLocaleString('ru-RU')}`,
              avatar: index === 0 ? '👑' : index === 1 ? '💎' : index === 2 ? '🦅' : '🎮'
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      }
    };
    
    if (tournaments.length > 0) {
      fetchLeaderboard();
    }
  }, [tournaments]);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const newTimeLeft: { [key: string]: { days: number; hours: number; minutes: number; seconds: number } } = {};

      tournaments.forEach(tournament => {
        const targetTime = tournament.status === 'upcoming' ? tournament.startTime : tournament.endTime;
        const difference = targetTime.getTime() - now.getTime();

        if (difference > 0) {
          newTimeLeft[tournament.id] = {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((difference % (1000 * 60)) / 1000),
          };
        } else {
          newTimeLeft[tournament.id] = { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }
      });

      setTimeLeft(newTimeLeft);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'active', label: t('tournaments.active'), icon: <Flame className="w-4 h-4" />, count: tournaments.filter(t => t.status === 'active').length },
    { id: 'upcoming', label: t('tournaments.upcoming'), icon: <Clock className="w-4 h-4" />, count: tournaments.filter(t => t.status === 'upcoming').length },
    { id: 'finished', label: 'Завершённые', icon: <Trophy className="w-4 h-4" />, count: 0 },
    { id: 'my', label: t('tournaments.myTournaments'), icon: <Target className="w-4 h-4" />, count: 0 },
  ];

  const filteredTournaments = tournaments.filter(tournament => {
    if (activeTab === 'my') return false;
    if (activeTab === 'finished') return tournament.status === 'finished';
    return tournament.status === activeTab;
  });

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'daily':
        return 'from-blue-500 via-indigo-500 to-blue-700';
      case 'weekly':
        return 'from-aurex-gold-500 via-amber-500 to-aurex-gold-600';
      case 'monthly':
        return 'from-purple-500 via-violet-500 to-purple-700';
      case 'special':
        return 'from-orange-500 via-red-500 to-orange-700';
      case 'vip':
        return 'from-aurex-gold-500 via-aurex-platinum-300 to-aurex-gold-500';
      default:
        return 'from-gray-500 to-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Ежедневный';
      case 'weekly': return 'Недельный';
      case 'monthly': return 'Месячный';
      case 'special': return 'Специальный';
      case 'vip': return 'VIP';
      default: return type;
    }
  };

  const formatTimeUnit = (value: number) => String(value).padStart(2, '0');

  // Calculate stats dynamically from tournaments data
  const totalPrizePool = tournaments.reduce((sum, t) => sum + t.prizePool, 0);
  const activeParticipants = tournaments.reduce((sum, t) => sum + t.currentParticipants, 0);
  const activeTournamentsCount = tournaments.filter(t => t.status === 'active').length;
  const weeklyPaidOut = tournaments.filter(t => t.status === 'finished').reduce((sum, t) => sum + t.prizePool, 0);
  
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `₽${(amount / 1000000).toFixed(0)}M`;
    if (amount >= 1000) return `₽${(amount / 1000).toFixed(0)}K`;
    return `₽${amount}`;
  };

  const stats = [
    { label: 'Призовой фонд сегодня', value: formatAmount(totalPrizePool), icon: <Trophy className="w-7 h-7" />, gradient: 'from-aurex-gold-500 to-amber-500' },
    { label: 'Активных участников', value: activeParticipants.toLocaleString('ru-RU'), icon: <Users className="w-7 h-7" />, gradient: 'from-blue-500 to-indigo-500' },
    { label: 'Турниров сегодня', value: String(activeTournamentsCount || tournaments.length), icon: <Calendar className="w-7 h-7" />, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Выплачено за неделю', value: formatAmount(weeklyPaidOut), icon: <Award className="w-7 h-7" />, gradient: 'from-purple-500 to-violet-500' },
  ];

  return (
    <AuthGuard>
      <Head>
        <title>{t('tournaments.title')} - AUREX Golden Empire</title>
        <meta name="description" content="Участвуйте в турнирах AUREX и выигрывайте крупные призы до ₽25,000,000! Ежедневные, недельные и VIP турниры." />
      </Head>

      <Layout>
        {/* Hero Section with Background */}
        <section 
          className="relative h-[500px] md:h-[600px] flex items-center justify-center"
          style={{
            backgroundImage: 'url(/images/tournaments-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-900/50 to-aurex-obsidian-900"></div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <Image
                    src="/images/aurexlogo.png"
                    alt="AUREX"
                    width={120}
                    height={50}
                    className="h-12 w-auto aurex-logo-glow"
                  />
                </div>

                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Swords className="w-8 h-8 text-aurex-gold-500" />
                  <span className="text-sm uppercase tracking-[0.3em] text-aurex-gold-500 font-medium">Арена Империи</span>
                  <Swords className="w-8 h-8 text-aurex-gold-500 transform scale-x-[-1]" />
                </div>

                <h1 className="text-5xl sm:text-6xl md:text-8xl font-black mb-6 text-white drop-shadow-2xl" style={{ fontFamily: 'Cinzel, serif' }}>
                  {t('tournaments.title')}
                </h1>
                
                <p className="text-xl sm:text-2xl md:text-3xl text-aurex-platinum-200 mb-8 max-w-4xl mx-auto">
                  {t('tournaments.subtitle')}
                  <br />
                  <span className="text-aurex-gold-500 font-bold text-3xl md:text-4xl">Призовой фонд до ₽25,000,000</span>
                </p>

                {/* Live indicator */}
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="text-red-400 font-medium">{tournaments.filter(t => t.status === 'active').length} турниров идут прямо сейчас</span>
                </div>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <div className="min-h-screen bg-aurex-obsidian-900 pt-12 pb-12">
          <div className="max-w-7xl mx-auto px-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-12 -mt-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div className={`relative p-4 sm:p-6 bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-lg h-full min-h-[100px] sm:min-h-[120px] flex flex-col justify-center`}>
                    <div className="flex items-center gap-3 text-white">
                      <div className="flex-shrink-0">{stat.icon}</div>
                      <div className="min-w-0">
                        <div className="text-xl sm:text-2xl md:text-3xl font-black truncate">{stat.value}</div>
                        <div className="text-[10px] sm:text-xs opacity-80 leading-tight">{stat.label}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Tournaments List */}
              <div className="lg:col-span-2">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 shadow-aurex-gold'
                          : 'bg-aurex-obsidian-800 text-aurex-platinum-300 border border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.count > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          activeTab === tab.id ? 'bg-aurex-obsidian-900 text-aurex-gold-500' : 'bg-aurex-gold-500/20 text-aurex-gold-500'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tournament Cards */}
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6"
                  >
                    {filteredTournaments.length === 0 ? (
                      <div className="text-center py-16 bg-aurex-obsidian-800/50 rounded-2xl border border-aurex-gold-500/20">
                        <Trophy className="w-16 h-16 mx-auto text-aurex-platinum-600 mb-4" />
                        <h3 className="text-xl font-bold text-aurex-platinum-400 mb-2">Нет турниров</h3>
                        <p className="text-aurex-platinum-500">В этой категории пока нет турниров</p>
                      </div>
                    ) : (
                      filteredTournaments.map((tournament, index) => (
                        <motion.div
                          key={tournament.id}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden hover:border-aurex-gold-500/50 transition-all duration-300"
                        >
                          {/* Header with Background Image */}
                          <div 
                            className="relative p-6 min-h-[200px]"
                            style={{
                              backgroundImage: tournament.type === 'daily' 
                                ? 'url(/images/tournaments/tournament-daily.jpg)'
                                : tournament.type === 'weekly'
                                ? 'url(/images/tournaments/tournament-weekly.jpg)'
                                : `linear-gradient(135deg, ${tournament.type === 'monthly' ? '#8B5CF6, #7C3AED' : tournament.type === 'special' ? '#F97316, #EF4444' : '#D4AF37, #B8860B'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            {/* Overlay for readability */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/30"></div>

                            <div className="relative z-10">
                              {/* Top row: Title + Badges */}
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <div className="text-xs uppercase tracking-wider text-aurex-gold-400 mb-1">{getTypeLabel(tournament.type)}</div>
                                  <h3 className="text-2xl sm:text-3xl font-black text-white">{tournament.name}</h3>
                                </div>
                                
                                {/* Badges */}
                                <div className="flex flex-col gap-2">
                                  {tournament.isHot && (
                                    <span className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                                      <Flame className="w-3 h-3" />
                                      <span>HOT</span>
                                    </span>
                                  )}
                                  {tournament.isCrypto && (
                                    <span className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-full text-center">CRYPTO</span>
                                  )}
                                  {tournament.isVip && (
                                    <span className="px-3 py-1.5 bg-aurex-gold-500 text-aurex-obsidian-900 text-xs font-bold rounded-full text-center">VIP</span>
                                  )}
                                </div>
                              </div>

                              {/* Timer - on its own row */}
                              <div className="flex justify-center mb-4">
                                <div className="flex items-center space-x-2 bg-black/40 px-4 py-2 rounded-xl backdrop-blur-sm">
                                  <Timer className="w-5 h-5 text-aurex-gold-500" />
                                  <div className="flex space-x-1 font-mono text-white">
                                    {timeLeft[tournament.id] && (
                                      <>
                                        <span className="bg-white/20 px-2 py-1 rounded">{formatTimeUnit(timeLeft[tournament.id].days)}d</span>
                                        <span className="bg-white/20 px-2 py-1 rounded">{formatTimeUnit(timeLeft[tournament.id].hours)}h</span>
                                        <span className="bg-white/20 px-2 py-1 rounded">{formatTimeUnit(timeLeft[tournament.id].minutes)}m</span>
                                        <span className="bg-white/20 px-2 py-1 rounded animate-pulse">{formatTimeUnit(timeLeft[tournament.id].seconds)}s</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Prize Pool */}
                            <div className="relative z-10 text-center">
                              <div className="text-sm uppercase tracking-wider text-aurex-platinum-300 mb-2">{t('tournaments.prizePool')}</div>
                              <div className="text-5xl sm:text-6xl font-black text-white drop-shadow-2xl">
                                {tournament.currency}{tournament.prizePool.toLocaleString('ru-RU')}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <p className="text-aurex-platinum-400 mb-6">{tournament.description}</p>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                              <div className="text-center p-3 bg-aurex-obsidian-900/50 rounded-xl">
                                <Users className="w-5 h-5 mx-auto text-aurex-gold-500 mb-1" />
                                <div className="text-lg font-bold text-white">{tournament.currentParticipants}/{tournament.maxParticipants}</div>
                                <div className="text-xs text-aurex-platinum-500">Участников</div>
                              </div>
                              <div className="text-center p-3 bg-aurex-obsidian-900/50 rounded-xl">
                                <Gamepad2 className="w-5 h-5 mx-auto text-aurex-gold-500 mb-1" />
                                <div className="text-lg font-bold text-white">{tournament.game}</div>
                                <div className="text-xs text-aurex-platinum-500">Игры</div>
                              </div>
                              <div className="text-center p-3 bg-aurex-obsidian-900/50 rounded-xl">
                                <Gift className="w-5 h-5 mx-auto text-aurex-gold-500 mb-1" />
                                <div className="text-lg font-bold text-white">
                                  {tournament.entryFee === 0 ? 'Бесплатно' : `${tournament.currency}${tournament.entryFee}`}
                                </div>
                                <div className="text-xs text-aurex-platinum-500">Взнос</div>
                              </div>
                            </div>

                            {/* Requirements */}
                            {tournament.requirements && (
                              <div className="mb-6">
                                <div className="text-xs uppercase tracking-wider text-aurex-platinum-500 mb-2">Требования:</div>
                                <div className="flex flex-wrap gap-2">
                                  {tournament.requirements.map((req, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-aurex-gold-500/10 text-aurex-gold-500 text-sm rounded-full border border-aurex-gold-500/30">
                                      {req}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Prizes */}
                            <div className="mb-6">
                              <div className="text-xs uppercase tracking-wider text-aurex-platinum-500 mb-3">Призовые места:</div>
                              <div className="flex flex-wrap gap-2">
                                {tournament.prizes.slice(0, 5).map((prize, idx) => (
                                  <div key={idx} className="flex items-center space-x-2 px-3 py-2 bg-aurex-obsidian-900/50 rounded-lg border border-aurex-gold-500/20">
                                    {prize.icon || <Star className="w-4 h-4 text-aurex-platinum-500" />}
                                    <span className="text-aurex-platinum-400 text-sm">{prize.position}:</span>
                                    <span className="text-aurex-gold-500 font-bold text-sm">{prize.prize}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* CTAs */}
                            <div className="flex flex-col sm:flex-row gap-3">
                              {isAuthenticated && tournament.status === 'active' && (
                                <button className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all">
                                  <Play className="w-5 h-5" />
                                  <span>{t('tournaments.join')}</span>
                                </button>
                              )}
                              {isAuthenticated && tournament.status === 'upcoming' && (
                                <button className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all">
                                  <Zap className="w-5 h-5" />
                                  <span>Записаться</span>
                                </button>
                              )}
                              {!isAuthenticated && (
                                <button className="flex-1 flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all">
                                  <Crown className="w-5 h-5" />
                                  <span>Войти для участия</span>
                                </button>
                              )}
                              <button className="flex items-center justify-center space-x-2 px-6 py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 font-medium rounded-xl border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all">
                                <span>Подробнее</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Live Leaderboard */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-aurex-gold-500/20 to-transparent border-b border-aurex-gold-500/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-aurex-gold-500" />
                        <span>Live Рейтинг</span>
                      </h3>
                      <span className="flex items-center space-x-1 text-xs text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span>LIVE</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-2">
                      {leaderboard.map((player, idx) => (
                        <motion.div 
                          key={player.position}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                            player.position <= 3 
                              ? 'bg-gradient-to-r from-aurex-gold-500/10 to-transparent border border-aurex-gold-500/20' 
                              : 'bg-aurex-obsidian-900/50 hover:bg-aurex-obsidian-700/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                              player.position === 1 ? 'bg-aurex-gold-500 text-aurex-obsidian-900' :
                              player.position === 2 ? 'bg-gray-400 text-aurex-obsidian-900' :
                              player.position === 3 ? 'bg-amber-600 text-white' :
                              'bg-aurex-obsidian-700 text-aurex-platinum-400'
                            }`}>
                              {player.position}
                            </div>
                            <div className="text-2xl">{player.avatar}</div>
                            <div>
                              <div className="text-white font-medium text-sm">{player.username}</div>
                              <div className="text-aurex-platinum-500 text-xs">{player.points.toLocaleString('ru-RU')} pts</div>
                            </div>
                          </div>
                          <div className="text-aurex-gold-500 font-bold text-sm">
                            {player.prize}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    <button className="w-full mt-4 px-4 py-3 border border-aurex-gold-500/30 text-aurex-gold-500 rounded-xl hover:bg-aurex-gold-500/10 transition-colors font-medium">
                      Полная таблица
                    </button>
                  </div>
                </div>

                {/* Tournament Rules */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <Star className="w-5 h-5 text-aurex-gold-500" />
                    <span>Правила турниров</span>
                  </h3>
                  <div className="space-y-3 text-sm text-aurex-platinum-400">
                    {[
                      'Очки начисляются за выигрышные спины',
                      'Множитель x100+ даёт двойные очки',
                      'Минимальная ставка: ₽20',
                      'Призы зачисляются автоматически',
                      'Вейджер на призы: x3',
                    ].map((rule, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-aurex-gold-500 rounded-full mt-2"></div>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-aurex-gold-500" />
                    <span>Расписание</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {schedule.length > 0 ? schedule.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-aurex-gold-500/10 last:border-0">
                        <div>
                          <div className="text-white font-medium text-sm">{item.type}</div>
                          <div className="text-aurex-platinum-500 text-xs">{item.time}</div>
                        </div>
                        <div className="text-aurex-gold-500 font-bold text-sm">{item.prize}</div>
                      </div>
                    )) : (
                      <div className="text-aurex-platinum-500 text-sm">Загрузка расписания...</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
