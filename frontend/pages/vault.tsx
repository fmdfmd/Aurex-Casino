import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vault,
  Gift,
  Lock,
  Unlock,
  Clock,
  Sparkles,
  Crown,
  Zap,
  TrendingUp,
  Shield,
  Star,
  ChevronRight,
  Check,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

interface VaultBonus {
  id: string;
  type: 'freespins' | 'cashback' | 'reload' | 'birthday' | 'vip' | 'special';
  name: string;
  description: string;
  value: string;
  icon: string;
  expiresAt: string;
  isLocked: boolean;
  unlockCondition?: string;
  wagerRequired?: number;
  wagerCompleted?: number;
  status?: 'available' | 'activated' | 'used';
  gradient?: string;
  valueAmount?: number;
  activatedAt?: string;
}

interface VaultStats {
  totalBonuses: number;
  activeBonuses: number;
  lockedBonuses: number;
  totalValue: number;
  savedThisMonth: number;
}

export default function VaultPage() {
  const { t } = useTranslation();
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'available' | 'locked' | 'history'>('available');
  const [selectedBonus, setSelectedBonus] = useState<VaultBonus | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for API data
  const [vaultStats, setVaultStats] = useState<VaultStats>({
    totalBonuses: 0,
    activeBonuses: 0,
    lockedBonuses: 0,
    totalValue: 0,
    savedThisMonth: 0
  });
  const [bonuses, setBonuses] = useState<VaultBonus[]>([]);

  // Fetch vault data from API
  useEffect(() => {
    if (token) {
      fetchVaultData();
    }
  }, [token]);

  const fetchVaultData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch('/api/vault/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsData.success) {
        setVaultStats(statsData.data);
      }

      // Fetch bonuses
      const bonusesRes = await fetch('/api/vault/bonuses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bonusesData = await bonusesRes.json();
      if (bonusesData.success && Array.isArray(bonusesData.data)) {
        setBonuses(bonusesData.data.map((b: any) => ({
          id: b.id,
          type: b.type,
          name: b.name,
          description: b.description,
          value: b.value,
          icon: b.icon,
          expiresAt: b.expiresAt,
          isLocked: b.isLocked,
          unlockCondition: b.unlockCondition,
          wagerRequired: b.wagerRequired,
          wagerCompleted: b.wagerCompleted
        })));
      }
    } catch (error) {
      console.error('Failed to fetch vault data:', error);
      setBonuses([]);
    }
    setIsLoading(false);
  };

  const availableBonuses = bonuses.filter(b => !b.isLocked && b.status !== 'used' && b.status !== 'activated');
  const lockedBonuses = bonuses.filter(b => b.isLocked && b.status !== 'used' && b.status !== 'activated');
  const usedBonuses = bonuses.filter(b => b.status === 'used' || b.status === 'activated');

  const handleActivateBonus = async (bonus: VaultBonus) => {
    setIsActivating(true);
    // API request to activate bonus
    try {
      const res = await fetch(`/api/vault/activate/${bonus.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || t('wallet.bonusActivated', { name: bonus.name }));
        fetchVaultData(); // Refresh
      } else {
        toast.error(data.error || t('wallet.activationFailed'));
      }
    } catch (error) {
      toast.error(t('common.serverError'));
    } finally {
      setIsActivating(false);
      setSelectedBonus(null);
    }
  };

  const getBonusTypeColor = (type: string) => {
    switch (type) {
      case 'freespins': return 'from-purple-500 to-pink-500';
      case 'cashback': return 'from-green-500 to-emerald-500';
      case 'reload': return 'from-blue-500 to-cyan-500';
      case 'birthday': return 'from-pink-500 to-rose-500';
      case 'vip': return 'from-aurex-gold-500 to-amber-500';
      case 'special': return 'from-indigo-500 to-purple-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <AuthGuard>
      <Head>
        <title>{t('wallet.title')} — {t('wallet.vaultTitle')}</title>
        <meta name="description" content={t('wallet.vaultDescription')} />
      </Head>

      <div className="min-h-screen bg-aurex-obsidian-900">
        <Header />

        <main className="pt-20 pb-12">
          {/* Hero Section */}
          <section className="relative overflow-hidden py-16">
            {/* Animated Background */}
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-aurex-gold-500/10 via-transparent to-transparent"></div>
              <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-aurex-gold-500/20 rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
                animate={{
                  scale: [1.2, 1, 1.2],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 5, repeat: Infinity }}
              />
            </div>

            <div className="relative max-w-7xl mx-auto px-4">
              {/* Header with Vault Icon */}
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', duration: 0.8 }}
                  className="inline-block mb-6"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-aurex-gold-500 rounded-3xl blur-xl opacity-50"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 rounded-3xl flex items-center justify-center shadow-aurex-gold">
                      <Vault className="w-12 h-12 text-aurex-obsidian-900" />
                    </div>
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-black text-white mb-4"
                >
                  AUREX <span className="text-aurex-gold-500">VAULT</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-aurex-platinum-400 text-lg max-w-2xl mx-auto"
                >
                  {t('wallet.vaultSubtitle')}
                </motion.p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[
                  { label: t('wallet.totalBonuses'), value: vaultStats.totalBonuses, icon: <Gift className="w-6 h-6" />, color: 'from-aurex-gold-500 to-amber-500' },
                  { label: t('wallet.available'), value: vaultStats.activeBonuses, icon: <Unlock className="w-6 h-6" />, color: 'from-green-500 to-emerald-500' },
                  { label: t('wallet.locked'), value: vaultStats.lockedBonuses, icon: <Lock className="w-6 h-6" />, color: 'from-purple-500 to-violet-500' },
                  { label: t('wallet.totalValue'), value: `₽${vaultStats.totalValue.toLocaleString('ru-RU')}`, icon: <TrendingUp className="w-6 h-6" />, color: 'from-cyan-500 to-blue-500' },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="aurex-card p-4 md:p-6"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                      {stat.icon}
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-aurex-platinum-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex bg-aurex-obsidian-800 rounded-xl p-1.5 border border-aurex-obsidian-700">
                  {[
                    { id: 'available', label: t('wallet.availableTab'), icon: <Unlock className="w-4 h-4" />, count: availableBonuses.length },
                    { id: 'locked', label: t('wallet.lockedTab'), icon: <Lock className="w-4 h-4" />, count: lockedBonuses.length },
                    { id: 'history', label: t('wallet.history'), icon: <Clock className="w-4 h-4" /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                          : 'text-aurex-platinum-400 hover:text-white'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.count !== undefined && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          activeTab === tab.id ? 'bg-aurex-obsidian-900/20' : 'bg-aurex-obsidian-700'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bonuses Grid */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {activeTab === 'available' && availableBonuses.map((bonus, index) => (
                    <motion.div
                      key={bonus.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="group"
                    >
                      <div className="aurex-card overflow-hidden hover:border-aurex-gold-500/50 transition-all duration-300">
                        {/* Header */}
                        <div className={`h-2 bg-gradient-to-r ${getBonusTypeColor(bonus.type)}`}></div>
                        
                        <div className="p-6">
                          {/* Icon & Title */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="text-4xl">{bonus.icon}</div>
                              <div>
                                <h3 className="text-lg font-bold text-white">{bonus.name}</h3>
                                <p className="text-sm text-aurex-platinum-400">{bonus.description}</p>
                              </div>
                            </div>
                          </div>

                          {/* Value */}
                          <div className="mb-4">
                            <div className="text-3xl font-black text-aurex-gold-500">{bonus.value}</div>
                          </div>

                          {/* Wager Progress (if applicable) */}
                          {bonus.wagerRequired && (
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-aurex-platinum-400">{t('wallet.wager')}</span>
                                <span className="text-white">
                                  ₽{bonus.wagerCompleted?.toLocaleString('ru-RU')} / ₽{bonus.wagerRequired.toLocaleString('ru-RU')}
                                </span>
                              </div>
                              <div className="h-2 bg-aurex-obsidian-700 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-400"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((bonus.wagerCompleted || 0) / bonus.wagerRequired) * 100}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Expiry & Action */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-aurex-platinum-500" />
                              <span className={`${getDaysRemaining(bonus.expiresAt) <= 3 ? 'text-red-400' : 'text-aurex-platinum-400'}`}>
                                {getDaysRemaining(bonus.expiresAt)} {t('wallet.days')}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedBonus(bonus)}
                              className="glow-button px-4 py-2 rounded-lg text-sm font-bold text-aurex-obsidian-900"
                            >
                              {t('promotions.activate')}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {activeTab === 'locked' && lockedBonuses.map((bonus, index) => (
                    <motion.div
                      key={bonus.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative"
                    >
                      <div className="aurex-card overflow-hidden opacity-75">
                        {/* Lock Overlay */}
                        <div className="absolute inset-0 bg-aurex-obsidian-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-aurex-obsidian-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-aurex-obsidian-600">
                              <Lock className="w-8 h-8 text-aurex-platinum-500" />
                            </div>
                            <p className="text-sm text-aurex-platinum-400 max-w-[200px]">
                              {bonus.unlockCondition}
                            </p>
                          </div>
                        </div>

                        {/* Header */}
                        <div className={`h-2 bg-gradient-to-r ${getBonusTypeColor(bonus.type)} opacity-50`}></div>
                        
                        <div className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="text-4xl grayscale">{bonus.icon}</div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{bonus.name}</h3>
                              <p className="text-sm text-aurex-platinum-400">{bonus.description}</p>
                            </div>
                          </div>
                          <div className="text-3xl font-black text-aurex-platinum-500">{bonus.value}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {activeTab === 'history' && usedBonuses.length > 0 && usedBonuses.map((bonus, index) => (
                    <motion.div
                      key={bonus.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="aurex-card overflow-hidden opacity-60"
                    >
                      <div className={`h-2 bg-gradient-to-r ${bonus.gradient || 'from-gray-500 to-gray-600'}`}></div>
                      <div className="p-5">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-aurex-obsidian-700 flex items-center justify-center text-2xl">
                            {bonus.icon || '🎁'}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-white">{bonus.name}</h3>
                            <p className="text-sm text-aurex-platinum-500">{bonus.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-black text-aurex-gold-500">{bonus.value}</div>
                          <div className="flex items-center gap-2 text-sm text-green-500">
                            <CheckCircle className="w-4 h-4" />
                            <span>Использован</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {activeTab === 'history' && usedBonuses.length === 0 && (
                    <div className="col-span-full">
                      <div className="aurex-card p-8 text-center">
                        <Clock className="w-16 h-16 text-aurex-platinum-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">{t('wallet.activationHistory')}</h3>
                        <p className="text-aurex-platinum-400">{t('wallet.activationHistoryDesc')}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Vault Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-12 aurex-card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-aurex-gold-500" />
                  <h3 className="text-xl font-bold text-white">{t('wallet.howItWorks')}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: <Gift className="w-8 h-8" />, title: t('wallet.accumulate'), desc: t('wallet.accumulateDesc') },
                    { icon: <Clock className="w-8 h-8" />, title: t('wallet.store'), desc: t('wallet.storeDesc') },
                    { icon: <Zap className="w-8 h-8" />, title: t('wallet.activate'), desc: t('wallet.activateDesc') },
                  ].map((tip, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-aurex-gold-500/10 flex items-center justify-center text-aurex-gold-500 flex-shrink-0">
                        {tip.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">{tip.title}</h4>
                        <p className="text-sm text-aurex-platinum-400">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <Footer />

        {/* Activation Modal */}
        <AnimatePresence>
          {selectedBonus && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedBonus(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="aurex-card p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">{selectedBonus.icon}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedBonus.name}</h3>
                  <p className="text-aurex-platinum-400">{selectedBonus.description}</p>
                </div>

                <div className="bg-aurex-obsidian-800 rounded-xl p-4 mb-6">
                  <div className="text-center">
                    <div className="text-sm text-aurex-platinum-400 mb-1">{t('wallet.youWillReceive')}</div>
                    <div className="text-3xl font-black text-aurex-gold-500">{selectedBonus.value}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedBonus(null)}
                    className="flex-1 aurex-black-button py-3 rounded-xl font-bold"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={() => handleActivateBonus(selectedBonus)}
                    disabled={isActivating}
                    className="flex-1 glow-button py-3 rounded-xl font-bold text-aurex-obsidian-900 disabled:opacity-50"
                  >
                    {isActivating ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-5 h-5" />
                        </motion.div>
                        {t('wallet.activating')}
                      </span>
                    ) : (
                      t('promotions.activate')
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}
