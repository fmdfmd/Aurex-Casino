import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Gift, 
  Crown, 
  Zap, 
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Trophy,
  Percent,
  Bitcoin,
  Coins,
  Users,
  Calendar,
  Shield,
  Timer,
  Lock,
  Loader2
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';

interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bonus: string;
  bonusType: 'percent' | 'fixed' | 'freespins';
  maxBonus?: string;
  minDeposit: string;
  wagering: string;
  validDays: number;
  image?: string;
  gradient: string;
  icon: React.ReactNode;
  features: string[];
  isNew?: boolean;
  isHot?: boolean;
  isVip?: boolean;
}

export default function PromotionsPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user, token } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState('welcome');
  const [activeBonuses, setActiveBonuses] = useState<string[]>([]);
  const [activatingBonus, setActivatingBonus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Promotions data from API
  const [welcomePackage, setWelcomePackage] = useState<any[]>([]);
  const [reloadBonuses, setReloadBonuses] = useState<any[]>([]);
  const [cashbackBonuses, setCashbackBonuses] = useState<any[]>([]);
  const [cryptoBonuses, setCryptoBonuses] = useState<any[]>([]);
  const [vipBonuses, setVipBonuses] = useState<any[]>([]);

  // Fetch promotions from API
  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/config/promotions');
      const data = await res.json();
      if (data.success) {
        // Add icons to promotions (icons can't come from API)
        const addIcon = (promo: any, icon: React.ReactNode) => ({ ...promo, icon });
        
        setWelcomePackage((data.data.welcomePackage || []).map((p: any, i: number) => 
          addIcon(p, i === 0 ? <Crown className="w-8 h-8" /> : <Star className="w-8 h-8" />)
        ));
        setReloadBonuses((data.data.reloadBonuses || []).map((p: any) => 
          addIcon(p, <Zap className="w-8 h-8" />)
        ));
        setCashbackBonuses((data.data.cashbackBonuses || []).map((p: any) => 
          addIcon(p, <Percent className="w-8 h-8" />)
        ));
        setCryptoBonuses((data.data.cryptoBonuses || []).map((p: any) => 
          addIcon(p, <Bitcoin className="w-8 h-8" />)
        ));
        setVipBonuses((data.data.vipBonuses || []).map((p: any) => 
          addIcon(p, <Crown className="w-8 h-8" />)
        ));
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    }
    setIsLoading(false);
  };

  // Fetch active bonuses on mount
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchActiveBonuses();
    }
  }, [isAuthenticated, token]);

  const fetchActiveBonuses = async () => {
    try {
      const res = await fetch('/api/bonuses/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setActiveBonuses(data.data.map((b: any) => b.bonusId || b.id));
      }
    } catch (error) {
      console.error('Failed to fetch active bonuses:', error);
    }
  };

  const activateBonus = async (bonusId: string) => {
    if (!isAuthenticated) {
      toast.error('Войдите для активации бонуса');
      return;
    }

    setActivatingBonus(bonusId);
    try {
      const res = await fetch(`/api/bonuses/${bonusId}/activate`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || 'Бонус активирован!');
        setActiveBonuses(prev => [...prev, bonusId]);
      } else {
        toast.error(data.error || 'Ошибка активации');
      }
    } catch (error) {
      console.error('Activate bonus error:', error);
      toast.error('Ошибка сервера');
    }
    setActivatingBonus(null);
  };

  const deactivateBonus = async (bonusId: string) => {
    try {
      const res = await fetch(`/api/bonuses/${bonusId}/deactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Бонус деактивирован');
        setActiveBonuses(prev => prev.filter(id => id !== bonusId));
      }
    } catch (error) {
      console.error('Deactivate bonus error:', error);
    }
  };

  // Get user's bonus status
  const usedBonuses = user?.usedBonuses || {
    firstDeposit: false,
    secondDeposit: false,
    thirdDeposit: false,
    fourthDeposit: false
  };
  const depositCount = user?.depositCount || 0;

  const categories = [
    { id: 'welcome', label: t('promotions.welcome'), icon: <Gift className="w-4 h-4" /> },
    { id: 'reload', label: t('promotions.reload'), icon: <Coins className="w-4 h-4" /> },
    { id: 'cashback', label: t('promotions.cashback'), icon: <Percent className="w-4 h-4" /> },
    { id: 'vip', label: t('promotions.vipBonuses'), icon: <Crown className="w-4 h-4" /> },
    { id: 'crypto', label: t('promotions.cryptoBonuses'), icon: <Bitcoin className="w-4 h-4" /> },
  ];

  // Promotions data now comes from API (see fetchPromotions useEffect)
  // welcomePackage, reloadBonuses, cashbackBonuses, cryptoBonuses, vipBonuses are state variables

  // Determine bonus status for each deposit
  const getBonusStatus = (promoId: string): 'available' | 'locked' | 'used' => {
    switch (promoId) {
      case 'first-deposit':
        if (usedBonuses.firstDeposit) return 'used';
        return 'available';
      case 'second-deposit':
        if (usedBonuses.secondDeposit) return 'used';
        if (!usedBonuses.firstDeposit) return 'locked';
        return 'available';
      case 'third-deposit':
        if (usedBonuses.thirdDeposit) return 'used';
        if (!usedBonuses.secondDeposit) return 'locked';
        return 'available';
      case 'fourth-deposit':
        if (usedBonuses.fourthDeposit) return 'used';
        if (!usedBonuses.thirdDeposit) return 'locked';
        return 'available';
      default:
        return 'available';
    }
  };

  // Get all welcome bonuses with status
  const getWelcomeBonusesWithStatus = () => {
    return welcomePackage.map(promo => ({
      ...promo,
      status: getBonusStatus(promo.id)
    }));
  };

  // Filter welcome bonuses based on user's deposit history (legacy for other uses)
  const getAvailableWelcomeBonuses = () => {
    return welcomePackage.filter((promo) => {
      switch (promo.id) {
        case 'first-deposit':
          return !usedBonuses.firstDeposit;
        case 'second-deposit':
          return !usedBonuses.secondDeposit && usedBonuses.firstDeposit;
        case 'third-deposit':
          return !usedBonuses.thirdDeposit && usedBonuses.secondDeposit;
        case 'fourth-deposit':
          return !usedBonuses.fourthDeposit && usedBonuses.thirdDeposit;
        default:
          return true;
      }
    });
  };

  const getPromotionsByCategory = () => {
    switch (activeCategory) {
      case 'welcome':
        return getWelcomeBonusesWithStatus();
      case 'reload':
        return reloadBonuses.map(b => ({ ...b, status: 'available' as const }));
      case 'cashback':
        return cashbackBonuses.map(b => ({ ...b, status: 'available' as const }));
      case 'crypto':
        return cryptoBonuses.map(b => ({ ...b, status: 'available' as const }));
      case 'vip':
        return vipBonuses.map(b => ({ ...b, status: 'available' as const }));
      default:
        return getWelcomeBonusesWithStatus();
    }
  };

  // Calculate remaining welcome bonus
  const availableWelcomeBonuses = getAvailableWelcomeBonuses();
  const allWelcomeBonusesUsed = availableWelcomeBonuses.length === 0;

  // Calculate total welcome bonus from API data
  const calculateTotalBonus = () => {
    if (welcomePackage.length === 0) return 'загрузка...';
    
    // Extract max bonus amounts and sum them
    let totalAmount = 0;
    welcomePackage.forEach(p => {
      const match = p.maxBonus?.match(/(\d[\d\s,]*)/);
      if (match) {
        totalAmount += parseInt(match[1].replace(/[\s,]/g, ''));
      }
    });
    
    // Count freespins from features
    let totalFS = 0;
    welcomePackage.forEach(p => {
      p.features?.forEach((f: string) => {
        const fsMatch = f.match(/(\d+)\s*(фриспин|FS|спин)/i);
        if (fsMatch) totalFS += parseInt(fsMatch[1]);
      });
    });
    
    return `₽${totalAmount.toLocaleString('ru-RU')}${totalFS > 0 ? ` + ${totalFS} FS` : ''}`;
  };
  
  const totalWelcomeBonus = calculateTotalBonus();

  return (
    <AuthGuard>
      <Head>
        <title>Акции и Бонусы - AUREX Golden Empire</title>
        <meta name="description" content="Эксклюзивные бонусы AUREX: приветственный пакет до ₽140,000, кэшбэк до 15%, крипто-бонусы и VIP привилегии" />
        <meta name="keywords" content="бонусы казино, приветственный бонус, кэшбэк, крипто бонус, VIP бонусы, AUREX" />
      </Head>

      <Layout>
        {/* Hero Section with Background */}
        <section 
          className="relative h-[500px] md:h-[600px] flex items-center justify-center"
          style={{
            backgroundImage: 'url(/images/promotions-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-aurex-obsidian-900"></div>
          
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
                  width={150}
                  height={60}
                  className="h-14 w-auto"
                />
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-8xl font-black mb-6 text-white drop-shadow-2xl" style={{ fontFamily: 'Cinzel, serif' }}>
                {t('promotions.title')}
              </h1>
              
              <p className="text-2xl sm:text-3xl md:text-4xl text-aurex-platinum-200 mb-8 max-w-4xl mx-auto">
                {t('promotions.welcomePackage')} до{' '}
                <span className="text-aurex-gold-500 font-bold">{totalWelcomeBonus}</span>
              </p>

              {/* Welcome Package Summary */}
              <div className="inline-flex flex-wrap justify-center gap-3 md:gap-6 p-6 md:p-8 bg-black/60 border-2 border-aurex-gold-500/50 rounded-2xl backdrop-blur-md">
                {welcomePackage.map((promo, idx) => (
                  <div key={promo.id} className="text-center px-3 md:px-6">
                    <div className="text-3xl sm:text-4xl md:text-5xl font-black text-aurex-gold-500">{promo.bonus}</div>
                    <div className="text-sm md:text-base text-aurex-platinum-300 mt-1">{idx + 1}-й депозит</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <div className="min-h-screen bg-aurex-obsidian-900 pt-12 pb-12">
          <div className="max-w-7xl mx-auto px-4">
            {/* Category Tabs */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-12">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 shadow-aurex-gold'
                      : 'bg-aurex-obsidian-800 text-aurex-platinum-300 border border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                  }`}
                >
                  {cat.icon}
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Welcome Package Banner */}
            {activeCategory === 'welcome' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative mb-12 p-8 bg-gradient-to-r from-aurex-obsidian-800 via-aurex-obsidian-900 to-aurex-obsidian-800 border rounded-3xl overflow-hidden ${
                  allWelcomeBonusesUsed ? 'border-green-500/30' : 'border-aurex-gold-500/30'
                }`}
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-aurex-gold-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-aurex-platinum-300/10 rounded-full blur-2xl"></div>
                
                {allWelcomeBonusesUsed ? (
                  /* All bonuses used */
                  <div className="relative text-center py-8">
                    <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black mb-4 text-green-400" style={{ fontFamily: 'Cinzel, serif' }}>
                      Приветственный пакет активирован!
                    </h2>
                    <p className="text-aurex-platinum-400 text-lg max-w-xl mx-auto mb-6">
                      Вы успешно использовали все приветственные бонусы. 
                      Проверьте другие акции ниже!
                    </p>
                    <div className="flex justify-center gap-2">
                      {['1-й', '2-й', '3-й', '4-й'].map((dep, idx) => (
                        <div key={idx} className="flex items-center space-x-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" />
                          <span>{dep}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Bonuses still available */
                  <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="text-center lg:text-left">
                      <div className="flex items-center justify-center lg:justify-start space-x-2 mb-4">
                        <Crown className="w-8 h-8 text-aurex-gold-500" />
                        <span className="text-sm uppercase tracking-widest text-aurex-gold-500">{t('promotions.welcomePackage')}</span>
                      </div>
                      <h2 className="text-4xl sm:text-5xl font-black mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
                        <span className="aurex-imperial-text">{totalWelcomeBonus}</span>
                      </h2>
                      <p className="text-aurex-platinum-400 text-lg max-w-xl">
                        {depositCount === 0 
                          ? 'На первые 4 депозита! Начните своё путешествие в Golden Empire.'
                          : `Осталось ${4 - depositCount} бонуса(ов)! Продолжайте получать выгоду.`
                        }
                      </p>
                      {/* Deposit progress */}
                      <div className="flex gap-2 mt-4">
                        {[
                          { label: '1-й', used: usedBonuses.firstDeposit },
                          { label: '2-й', used: usedBonuses.secondDeposit },
                          { label: '3-й', used: usedBonuses.thirdDeposit },
                          { label: '4-й', used: usedBonuses.fourthDeposit },
                        ].map((dep, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                              dep.used 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-aurex-gold-500/20 text-aurex-gold-500'
                            }`}
                          >
                            {dep.used ? <CheckCircle className="w-3 h-3" /> : <Gift className="w-3 h-3" />}
                            <span>{dep.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link
                        href="/wallet"
                        className="glow-button px-8 py-4 text-lg font-bold"
                      >
                        <Gift className="w-5 h-5 mr-2" />
                        {t('promotions.getBonus')}
                      </Link>
                      <Link
                        href="#terms"
                        className="aurex-black-button px-8 py-4 text-lg font-bold"
                      >
                        {t('promotions.conditions')}
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Promotions Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {getPromotionsByCategory().map((promo, index) => {
                const isLocked = promo.status === 'locked';
                const isUsed = promo.status === 'used';
                const isAvailable = promo.status === 'available';
                const promoImage = promo.image || '/images/promos/bonus.png';

                return (
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`group relative bg-aurex-obsidian-800 border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col h-full ${
                      isLocked 
                        ? 'border-aurex-platinum-700/30 opacity-70' 
                        : isUsed 
                          ? 'border-green-500/30' 
                          : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                    }`}
                  >
                    {/* Locked Overlay */}
                    {isLocked && (
                      <div className="absolute inset-0 z-50 bg-aurex-obsidian-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-aurex-obsidian-800 rounded-full flex items-center justify-center mb-4 border-2 border-aurex-platinum-600">
                          <Lock className="w-10 h-10 text-aurex-platinum-500" />
                        </div>
                        <p className="text-aurex-platinum-400 text-lg font-bold mb-1">Заблокировано</p>
                        <p className="text-aurex-platinum-500 text-sm">Сначала активируйте предыдущий бонус</p>
                      </div>
                    )}

                    {/* Used Badge Overlay */}
                    {isUsed && (
                      <div className="absolute top-4 left-4 z-50 flex items-center space-x-2 px-3 py-2 bg-green-500/90 rounded-full">
                        <CheckCircle className="w-5 h-5 text-white" />
                        <span className="text-white font-bold text-sm">Использовано</span>
                      </div>
                    )}

                    {/* Header with banner image or gradient */}
                    <div className={`relative p-6 min-h-[220px] flex flex-col justify-between overflow-hidden`}>
                      {/* Background Image - always show */}
                      <Image
                        src={promoImage}
                        alt={promo.title}
                        fill
                        className={`object-cover ${isUsed ? 'grayscale-[30%]' : ''}`}
                      />
                      {/* Dark overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>

                      {/* Badges */}
                      <div className="absolute top-4 right-4 flex gap-2 z-10">
                        {promo.isNew && isAvailable && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">NEW</span>
                        )}
                        {promo.isHot && isAvailable && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">HOT</span>
                        )}
                        {promo.isVip && (
                          <span className="px-2 py-1 bg-aurex-gold-500 text-aurex-obsidian-900 text-xs font-bold rounded-full">VIP</span>
                        )}
                      </div>

                      <div className="relative z-10 flex items-center space-x-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                          {promo.icon}
                        </div>
                        <div>
                          <div className="text-sm uppercase tracking-wider opacity-80 text-white drop-shadow-md">{promo.subtitle}</div>
                          <h3 className="text-2xl font-black text-white drop-shadow-lg">{promo.title}</h3>
                        </div>
                      </div>

                      {/* Big Bonus Display */}
                      <div className="relative z-10 mt-6 text-center">
                        <div className="text-5xl sm:text-6xl font-black text-white drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                          {promo.bonus}
                        </div>
                        {promo.maxBonus && (
                          <div className="text-lg text-white/90 drop-shadow-md">{promo.maxBonus}</div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      <p className="text-aurex-platinum-400 mb-6">{promo.description}</p>

                      {/* Features */}
                      <div className="space-y-3 mb-6 flex-grow">
                        {promo.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-3 text-sm">
                            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isUsed ? 'text-green-500' : 'text-aurex-gold-500'}`} />
                            <span className="text-aurex-platinum-300">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Terms */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-aurex-obsidian-900/50 rounded-xl mb-6 mt-auto">
                        <div className="text-center">
                          <div className="text-xs text-aurex-platinum-500 uppercase">Мин. депозит</div>
                          <div className="text-sm font-bold text-white">{promo.minDeposit}</div>
                        </div>
                        <div className="text-center border-x border-aurex-gold-500/20">
                          <div className="text-xs text-aurex-platinum-500 uppercase">Вейджер</div>
                          <div className="text-sm font-bold text-white">{promo.wagering}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-aurex-platinum-500 uppercase">Срок</div>
                          <div className="text-sm font-bold text-white">{promo.validDays} дней</div>
                        </div>
                      </div>

                      {/* CTA */}
                      {isUsed ? (
                        <div className="block w-full text-center py-3 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/30">
                          <span className="flex items-center justify-center space-x-2">
                            <CheckCircle className="w-5 h-5" />
                            <span>Бонус получен</span>
                          </span>
                        </div>
                      ) : isLocked ? (
                        <div className="block w-full text-center py-3 bg-aurex-obsidian-700 text-aurex-platinum-500 font-bold rounded-xl border border-aurex-platinum-700/30 cursor-not-allowed">
                          <span className="flex items-center justify-center space-x-2">
                            <Lock className="w-5 h-5" />
                            <span>Недоступно</span>
                          </span>
                        </div>
                      ) : activeBonuses.includes(promo.id) ? (
                        <div className="space-y-2">
                          <div className="block w-full text-center py-2 bg-green-500/20 text-green-400 font-bold rounded-xl border border-green-500/30">
                            <span className="flex items-center justify-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span>Активировано!</span>
                            </span>
                          </div>
                          <Link
                            href="/wallet"
                            className="block w-full text-center py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
                          >
                            <span className="flex items-center justify-center space-x-2">
                              <span>Пополнить и получить</span>
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </Link>
                        </div>
                      ) : !isAuthenticated ? (
                        <Link
                          href="/register"
                          className="block w-full text-center py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all group-hover:scale-[1.02]"
                        >
                          <span className="flex items-center justify-center space-x-2">
                            <span>Зарегистрироваться</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => activateBonus(promo.id)}
                          disabled={activatingBonus === promo.id}
                          className="block w-full text-center py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all group-hover:scale-[1.02] disabled:opacity-70"
                        >
                          <span className="flex items-center justify-center space-x-2">
                            {activatingBonus === promo.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Активация...</span>
                              </>
                            ) : (
                              <>
                                <span>{t('promotions.activate')}</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Golden Drops Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <div className="relative p-8 sm:p-12 bg-gradient-to-br from-aurex-obsidian-800 to-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-3xl overflow-hidden">
                <div className="absolute inset-0 aurex-shimmer opacity-30"></div>
                
                <div className="relative text-center">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-aurex-gold-500/20 rounded-full mb-6">
                    <Sparkles className="w-5 h-5 text-aurex-gold-500" />
                    <span className="text-aurex-gold-500 font-medium">Эксклюзивная механика</span>
                  </div>
                  
                  <h2 className="text-4xl sm:text-5xl font-black mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
                    <span className="aurex-imperial-text">Golden Drops</span>
                  </h2>
                  
                  <p className="text-xl text-aurex-platinum-300 mb-8 max-w-2xl mx-auto">
                    Случайные фриспины падают активным игрокам прямо во время игры!
                    Чем больше играете — тем чаще получаете.
                  </p>

                  <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                    <div className="p-6 bg-aurex-obsidian-800/50 rounded-xl border border-aurex-gold-500/20">
                      <div className="text-3xl font-black text-aurex-gold-500 mb-2">10-100</div>
                      <div className="text-aurex-platinum-400">Фриспинов за дроп</div>
                    </div>
                    <div className="p-6 bg-aurex-obsidian-800/50 rounded-xl border border-aurex-gold-500/20">
                      <div className="text-3xl font-black text-aurex-gold-500 mb-2">24/7</div>
                      <div className="text-aurex-platinum-400">Дропы круглосуточно</div>
                    </div>
                    <div className="p-6 bg-aurex-obsidian-800/50 rounded-xl border border-aurex-gold-500/20">
                      <div className="text-3xl font-black text-aurex-gold-500 mb-2">x0</div>
                      <div className="text-aurex-platinum-400">Вейджер отсутствует</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Terms Section */}
            <section id="terms" className="mb-16">
              <div className="bg-aurex-obsidian-800/50 border border-aurex-gold-500/20 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
                  <Shield className="w-6 h-6 text-aurex-gold-500" />
                  <span>Общие условия бонусов</span>
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6 text-sm text-aurex-platinum-400">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                      <span>Бонусы активируются автоматически при соответствующем депозите</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                      <span>Вейджер должен быть отыгран до вывода бонусных средств</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                      <span>Максимальная ставка при активном бонусе: ₽5 или эквивалент</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                      <span>Фриспины начисляются после внесения депозита</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                      <span>Один бонус на аккаунт/IP-адрес/устройство</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                      <span>AUREX оставляет за собой право изменять условия акций</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="p-12 bg-gradient-to-br from-aurex-obsidian-800 via-aurex-obsidian-900 to-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-3xl">
                <h2 className="text-3xl sm:text-4xl font-black mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
                  <span className="aurex-imperial-text">Готовы начать?</span>
                </h2>
                <p className="text-xl text-aurex-platinum-300 mb-8 max-w-2xl mx-auto">
                  Присоединяйтесь к Golden Empire и получите приветственный бонус до {totalWelcomeBonus}
                </p>
                <Link
                  href={isAuthenticated ? '/wallet' : '/register'}
                  className="inline-flex items-center space-x-3 glow-button px-10 py-5 text-xl font-bold"
                >
                  <Crown className="w-6 h-6" />
                  <span>Вступить в Империю</span>
                </Link>
              </div>
            </motion.section>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
