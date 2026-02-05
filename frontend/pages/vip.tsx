import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Star, 
  Gift, 
  Percent, 
  Zap, 
  Shield,
  Trophy,
  Users,
  Clock,
  CheckCircle,
  Lock,
  ChevronRight,
  Sparkles,
  Award,
  HeadphonesIcon,
  Loader2,
  ShoppingBag,
  Coins
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { VIPIcon } from '../components/VIPIcons';

interface VipLevel {
  level: number;
  name: string;
  nameRu: string;
  icon: string;
  color: string;
  gradient: string;
  pointsRequired: number;
  cashback: number;
  withdrawalPriority: string;
  weeklyBonus: number;
  birthdayBonus: number;
  personalManager: boolean;
  exclusiveTournaments: boolean;
  benefits: string[];
}

export default function VipPage() {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const [vipLevels, setVipLevels] = useState<VipLevel[]>([]);
  const [pointsPerRub, setPointsPerRub] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [userVipData, setUserVipData] = useState<any>(null);

  // Helper function to translate level names
  const getLevelTranslation = (levelName: string): string => {
    const levelMap: Record<string, string> = {
      'Bronze': t('vip.bronze'),
      'Silver': t('vip.silver'),
      'Gold': t('vip.gold'),
      'Platinum': t('vip.platinum'),
      'Emperor': t('vip.emperor'),
      'Бронза': t('vip.bronze'),
      'Серебро': t('vip.silver'),
      'Золото': t('vip.gold'),
      'Платина': t('vip.platinum'),
      'Император': t('vip.emperor'),
    };
    return levelMap[levelName] || levelName;
  };

  // Fetch VIP config from API
  useEffect(() => {
    const fetchVipConfig = async () => {
      try {
        const res = await fetch('/api/config/vip');
        const data = await res.json();
        if (data.success && data.data?.levels) {
          const mappedLevels = data.data.levels.map((l: any) => ({
            level: l.level,
            name: l.name,
            nameRu: l.nameRu,
            icon: l.icon,
            color: l.level === 1 ? 'text-amber-700' : l.level === 2 ? 'text-gray-400' : l.level === 3 ? 'text-aurex-gold-500' : l.level === 4 ? 'text-aurex-platinum-300' : 'text-purple-400',
            gradient: l.color,
            pointsRequired: l.pointsRequired,
            cashback: l.cashbackPercent,
            withdrawalPriority: l.withdrawalPriority === 'standard' ? 'Стандартный (24ч)' : l.withdrawalPriority === 'priority' ? 'Быстрый (12ч)' : l.withdrawalPriority === 'express' ? 'Приоритетный (6ч)' : 'Мгновенный',
            weeklyBonus: l.weeklyBonus,
            birthdayBonus: l.birthdayBonus,
            personalManager: l.personalManager,
            exclusiveTournaments: l.exclusiveGames,
            benefits: l.benefits
          }));
          setVipLevels(mappedLevels);
          setPointsPerRub(data.data.pointsPerRub);
        }
      } catch (error) {
        console.error('Failed to fetch VIP config:', error);
      }
      setIsLoading(false);
    };

    const fetchUserVip = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/config/vip/my-level', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUserVipData(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch user VIP data:', error);
      }
    };

    fetchVipConfig();
    if (token) fetchUserVip();
  }, [token]);
  const [selectedLevel, setSelectedLevel] = useState<VipLevel | null>(null);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Fetch loyalty shop
  useEffect(() => {
    const fetchShop = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/loyalty/shop', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data?.items) {
          setShopItems(data.data.items);
        }
      } catch (error) {
        console.error('Failed to fetch loyalty shop:', error);
      }
    };
    fetchShop();
  }, [token, user?.vipPoints]);

  // Purchase item
  const handlePurchase = async (itemId: string) => {
    setIsPurchasing(itemId);
    setPurchaseMessage(null);
    try {
      const res = await fetch('/api/loyalty/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ itemId })
      });
      const data = await res.json();
      if (data.success) {
        setPurchaseMessage({ type: 'success', text: data.message });
        // Обновляем очки в UI
        if (user) {
          user.vipPoints = data.data.remainingPoints;
        }
        // Обновляем магазин
        const shopRes = await fetch('/api/loyalty/shop', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const shopData = await shopRes.json();
        if (shopData.success) {
          setShopItems(shopData.data.items);
        }
      } else {
        setPurchaseMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setPurchaseMessage({ type: 'error', text: 'Ошибка при покупке' });
    }
    setIsPurchasing(null);
    setTimeout(() => setPurchaseMessage(null), 5000);
  };

  // Default level for when vipLevels is not yet loaded
  const defaultLevel: VipLevel = {
    level: 1,
    name: 'Bronze',
    nameRu: t('vip.bronze'),
    icon: '🥉',
    color: 'text-orange-400',
    gradient: 'from-orange-600 to-orange-800',
    pointsRequired: 0,
    cashback: 5,
    weeklyBonus: 0,
    birthdayBonus: 10,
    personalManager: false,
    exclusiveTournaments: false,
    withdrawalPriority: 'Стандартный',
    benefits: [],
  };

  const currentLevel = vipLevels.find(l => l.level === (user?.vipLevel || 1)) || vipLevels[0] || defaultLevel;
  const nextLevel = vipLevels.find(l => l.level === currentLevel.level + 1);
  const userPoints = user?.vipPoints || 0;
  const pointsToNextLevel = nextLevel ? nextLevel.pointsRequired - userPoints : 0;
  const progressPercent = nextLevel 
    ? ((userPoints - currentLevel.pointsRequired) / (nextLevel.pointsRequired - currentLevel.pointsRequired)) * 100
    : 100;

  return (
    <AuthGuard>
      <Head>
        <title>{t('vip.title')} - AUREX VIP</title>
        <meta name="description" content="VIP программа AUREX - повышенный кэшбэк, эксклюзивные бонусы и персональный сервис" />
      </Head>

      <Layout>
        {/* Hero Section with Background */}
        <section 
          className="relative h-[500px] md:h-[600px] flex items-center justify-center"
          style={{
            backgroundImage: 'url(/images/vip-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-purple-900/40 to-aurex-obsidian-900"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
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
                {t('vip.title')}
              </h1>
              
              <p className="text-2xl sm:text-3xl text-aurex-platinum-200 mb-8 max-w-4xl mx-auto drop-shadow-lg">
                {t('vip.subtitle')}
              </p>

              {/* VIP Benefits Preview */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-black text-aurex-gold-500">15%</div>
                  <div className="text-sm text-aurex-platinum-300">{t('vip.cashback')}</div>
                </div>
                <div className="w-px bg-aurex-gold-500/30"></div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-black text-aurex-gold-500">5</div>
                  <div className="text-sm text-aurex-platinum-300">{t('vip.levels')}</div>
                </div>
                <div className="w-px bg-aurex-gold-500/30"></div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-black text-aurex-gold-500">24/7</div>
                  <div className="text-sm text-aurex-platinum-300">{t('vip.support')}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <div className="min-h-screen bg-aurex-obsidian-900 pt-12 pb-12">
          <div className="max-w-7xl mx-auto px-4">
            {/* Current Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-12 p-8 bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-3xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-aurex-gold-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center space-x-4 mb-6">
                    <VIPIcon level={currentLevel.level} className="w-20 h-20" />
                    <div>
                      <div className="text-sm text-aurex-platinum-400 uppercase tracking-wider">{t('vip.yourLevel')}</div>
                      <div className={`text-3xl font-black ${currentLevel.color}`}>{getLevelTranslation(currentLevel.name)}</div>
                      <div className="text-aurex-platinum-400">{getLevelTranslation(currentLevel.nameRu)}</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-aurex-platinum-400">{t('vip.vipPoints')}</span>
                      <span className="text-white font-bold">{userPoints.toLocaleString('ru-RU')}</span>
                    </div>
                    {nextLevel && (
                      <>
                        <div className="relative h-3 bg-aurex-obsidian-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${currentLevel.gradient} rounded-full`}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-aurex-platinum-500">
                          <span>{getLevelTranslation(currentLevel.name)}</span>
                          <span>{pointsToNextLevel.toLocaleString('ru-RU')} очков до {getLevelTranslation(nextLevel.name)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-sm text-aurex-platinum-400">
                    <p>Зарабатывайте очки за каждую ставку: ₽100 = 1 VIP очко</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                    <Percent className="w-8 h-8 mx-auto mb-2 text-aurex-gold-500" />
                    <div className="text-2xl font-bold text-white">{currentLevel.cashback}%</div>
                    <div className="text-xs text-aurex-platinum-400">{t('vip.cashback')}</div>
                  </div>
                  <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                    <Gift className="w-8 h-8 mx-auto mb-2 text-aurex-gold-500" />
                    <div className="text-2xl font-bold text-white">₽{(currentLevel.weeklyBonus * 100).toLocaleString('ru-RU')}</div>
                    <div className="text-xs text-aurex-platinum-400">{t('vip.weeklyBonus')}</div>
                  </div>
                  <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-aurex-gold-500" />
                    <div className="text-sm font-bold text-white">{currentLevel.withdrawalPriority}</div>
                    <div className="text-xs text-aurex-platinum-400">{t('vip.withdrawalSpeed')}</div>
                  </div>
                  <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                    <Award className="w-8 h-8 mx-auto mb-2 text-aurex-gold-500" />
                    <div className="text-2xl font-bold text-white">₽{(currentLevel.birthdayBonus * 100).toLocaleString('ru-RU')}</div>
                    <div className="text-xs text-aurex-platinum-400">{t('vip.birthdayBonus')}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* VIP Levels Grid */}
            <h2 className="text-2xl font-bold text-white mb-6 text-center">{t('vip.allLevels')}</h2>
            
            <div className="grid md:grid-cols-5 gap-4 mb-12">
              {vipLevels.map((level, index) => {
                const isCurrentLevel = level.level === currentLevel.level;
                const isUnlocked = level.level <= currentLevel.level;
                
                return (
                  <motion.div
                    key={level.level}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedLevel(level)}
                    className={`relative p-6 rounded-2xl cursor-pointer transition-all ${
                      isCurrentLevel
                        ? 'bg-gradient-to-br ' + level.gradient + ' ring-2 ring-aurex-gold-500'
                        : 'bg-aurex-obsidian-800 border border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                    } ${!isUnlocked ? 'opacity-60' : ''}`}
                  >
                    {isCurrentLevel && (
                      <div className="absolute -top-2 -right-2 px-2 py-1 bg-aurex-gold-500 text-aurex-obsidian-900 text-xs font-bold rounded-full">
                        ВАШ
                      </div>
                    )}
                    
                    {!isUnlocked && (
                      <Lock className="absolute top-4 right-4 w-4 h-4 text-aurex-platinum-500" />
                    )}

                    <div className="flex justify-center mb-3">
                      <VIPIcon level={level.level} className="w-16 h-16" />
                    </div>
                    <div className={`text-lg font-bold text-center ${isCurrentLevel ? 'text-white' : level.color}`}>
                      {getLevelTranslation(level.name)}
                    </div>
                    <div className={`text-xs text-center mb-3 ${isCurrentLevel ? 'text-white/80' : 'text-aurex-platinum-500'}`}>
                      {level.pointsRequired.toLocaleString('ru-RU')} очков
                    </div>
                    
                    <div className={`text-center text-sm ${isCurrentLevel ? 'text-white' : 'text-aurex-platinum-400'}`}>
                      <div>{level.cashback}% {t('vip.cashback')}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Benefits Comparison */}
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden mb-12">
              <div className="p-6 border-b border-aurex-gold-500/20">
                <h2 className="text-xl font-bold text-white">Сравнение привилегий</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-aurex-gold-500/20">
                      <th className="text-left px-6 py-4 text-aurex-platinum-400">Привилегия</th>
                      {vipLevels.map((level) => (
                        <th key={level.level} className="text-center px-4 py-4">
                          <div className="flex justify-center mb-2">
                            <VIPIcon level={level.level} className="w-12 h-12" />
                          </div>
                          <div className={`text-sm font-medium ${level.color}`}>{getLevelTranslation(level.name)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-aurex-gold-500/10">
                      <td className="px-6 py-4 text-aurex-platinum-300">{t('vip.cashback')}</td>
                      {vipLevels.map((level) => (
                        <td key={level.level} className="text-center px-4 py-4 text-white font-bold">
                          {level.cashback}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-aurex-gold-500/10">
                      <td className="px-6 py-4 text-aurex-platinum-300">Еженедельный бонус</td>
                      {vipLevels.map((level) => (
                        <td key={level.level} className="text-center px-4 py-4 text-white">
                          {level.weeklyBonus > 0 ? `₽${(level.weeklyBonus * 100).toLocaleString('ru-RU')}` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-aurex-gold-500/10">
                      <td className="px-6 py-4 text-aurex-platinum-300">Бонус на день рождения</td>
                      {vipLevels.map((level) => (
                        <td key={level.level} className="text-center px-4 py-4 text-white">
                          ₽{(level.birthdayBonus * 100).toLocaleString('ru-RU')}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-aurex-gold-500/10">
                      <td className="px-6 py-4 text-aurex-platinum-300">Персональный менеджер</td>
                      {vipLevels.map((level) => (
                        <td key={level.level} className="text-center px-4 py-4">
                          {level.personalManager ? (
                            <CheckCircle className="w-5 h-5 mx-auto text-green-500" />
                          ) : (
                            <span className="text-aurex-platinum-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-aurex-gold-500/10">
                      <td className="px-6 py-4 text-aurex-platinum-300">VIP турниры</td>
                      {vipLevels.map((level) => (
                        <td key={level.level} className="text-center px-4 py-4">
                          {level.exclusiveTournaments ? (
                            <CheckCircle className="w-5 h-5 mx-auto text-green-500" />
                          ) : (
                            <span className="text-aurex-platinum-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-aurex-platinum-300">Скорость вывода</td>
                      {vipLevels.map((level) => (
                        <td key={level.level} className="text-center px-4 py-4 text-xs text-aurex-platinum-400">
                          {level.withdrawalPriority}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* How to Earn Points */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <Zap className="w-6 h-6 text-aurex-gold-500" />
                  <span>Как заработать очки</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-aurex-gold-500/20 flex items-center justify-center text-aurex-gold-500 font-bold flex-shrink-0">1</div>
                    <div>
                      <div className="text-white font-medium">Играйте в любые игры</div>
                      <div className="text-sm text-aurex-platinum-400">Каждая ставка ₽100 = 1 VIP очко</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-aurex-gold-500/20 flex items-center justify-center text-aurex-gold-500 font-bold flex-shrink-0">2</div>
                    <div>
                      <div className="text-white font-medium">Участвуйте в турнирах</div>
                      <div className="text-sm text-aurex-platinum-400">Бонусные очки за призовые места</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-aurex-gold-500/20 flex items-center justify-center text-aurex-gold-500 font-bold flex-shrink-0">3</div>
                    <div>
                      <div className="text-white font-medium">Приглашайте друзей</div>
                      <div className="text-sm text-aurex-platinum-400">10% от их ставок в ваши очки</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <HeadphonesIcon className="w-6 h-6 text-aurex-gold-500" />
                  <span>VIP Поддержка</span>
                </h3>
                <div className="space-y-4 text-aurex-platinum-400">
                  <p>
                    Игроки уровня Platinum и Emperor получают персонального менеджера, доступного 24/7.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Приоритетная поддержка</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Индивидуальные бонусы</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Эксклюзивные подарки</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty Shop */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                  <ShoppingBag className="w-7 h-7 text-aurex-gold-500" />
                  <span>Магазин VIP очков</span>
                </h2>
                <div className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-800 rounded-xl border border-aurex-gold-500/30">
                  <Coins className="w-5 h-5 text-aurex-gold-500" />
                  <span className="text-white font-bold">{userPoints.toLocaleString('ru-RU')}</span>
                  <span className="text-aurex-platinum-400 text-sm">очков</span>
                </div>
              </div>

              {purchaseMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 p-4 rounded-xl ${
                    purchaseMessage.type === 'success' 
                      ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                      : 'bg-red-500/20 border border-red-500/50 text-red-400'
                  }`}
                >
                  {purchaseMessage.text}
                </motion.div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shopItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative p-5 bg-aurex-obsidian-800 border rounded-2xl transition-all ${
                      item.canAfford 
                        ? 'border-aurex-gold-500/30 hover:border-aurex-gold-500/60 hover:shadow-lg hover:shadow-aurex-gold-500/10' 
                        : 'border-aurex-platinum-700/30 opacity-60'
                    }`}
                  >
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                    <p className="text-sm text-aurex-platinum-400 mb-4 min-h-[40px]">{item.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Coins className="w-4 h-4 text-aurex-gold-500" />
                        <span className="text-aurex-gold-400 font-bold">{item.pointsCost.toLocaleString('ru-RU')}</span>
                      </div>
                      <button
                        onClick={() => handlePurchase(item.id)}
                        disabled={!item.canAfford || isPurchasing === item.id}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          item.canAfford
                            ? 'bg-aurex-gold-500 text-aurex-obsidian-900 hover:bg-aurex-gold-400'
                            : 'bg-aurex-obsidian-700 text-aurex-platinum-500 cursor-not-allowed'
                        }`}
                      >
                        {isPurchasing === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : item.canAfford ? (
                          'Купить'
                        ) : (
                          'Мало очков'
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center p-12 bg-gradient-to-br from-aurex-obsidian-800 to-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-3xl"
            >
              <h2 className="text-3xl font-black mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="aurex-imperial-text">Начните восхождение!</span>
              </h2>
              <p className="text-aurex-platinum-300 mb-8 max-w-xl mx-auto">
                Играйте в любимые игры и получайте VIP привилегии
              </p>
              <Link
                href="/games"
                className="inline-flex items-center space-x-2 glow-button px-8 py-4 text-lg font-bold"
              >
                <Crown className="w-6 h-6" />
                <span>Начать играть</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
