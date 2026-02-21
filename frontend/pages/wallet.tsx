import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Bitcoin,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  QrCode,
  Shield,
  Gift,
  Crown,
  TrendingUp,
  History,
  ChevronRight,
  X,
  Zap,
  Percent,
  RefreshCw,
  Tag
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import ActiveBonusWidget from '../components/ActiveBonusWidget';
import { useAuthStore } from '../store/authStore';
import { useTranslation, useCurrency } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bonus' | 'bet' | 'win' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  method: string;
  createdAt: string;
  description?: string;
}

// Payment methods will be fetched from API

interface ActiveBonus {
  id: string;
  bonusId: string;
  bonusName: string;
  percent: number;
  maxBonus: number;
  minDeposit: number;
  wagering: number;
  freespins: number;
  status: string;
}

export default function WalletPage() {
  const { user, updateUser, refreshUser, token } = useAuthStore();
  const { t } = useTranslation();
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showBonusInfo, setShowBonusInfo] = useState(false);
  const [acceptBonus, setAcceptBonus] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [isActivatingPromo, setIsActivatingPromo] = useState(false);
  const [activeBonus, setActiveBonus] = useState<ActiveBonus | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{
    crypto: { id: string; name: string; icon: string; color?: string; minDeposit?: number; fee?: number }[];
    fiat: { id: string; name: string; icon: string; color?: string; minDeposit?: number; fee?: number }[];
  }>({ crypto: [], fiat: [] });

  // Fetch payment methods from API
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch('/api/config/payment-methods');
      const data = await res.json();
      if (data.success) {
        setPaymentMethods({
          crypto: (data.data.crypto || []).map((m: any) => ({
            ...m,
            color: m.id === 'btc' ? 'from-orange-500 to-orange-600' :
                   m.id === 'eth' ? 'from-blue-500 to-indigo-600' :
                   m.id === 'usdt' ? 'from-green-500 to-emerald-600' :
                   m.id === 'ltc' ? 'from-gray-400 to-gray-600' : 'from-purple-500 to-pink-500'
          })),
          fiat: (data.data.fiat || []).map((m: any) => ({
            ...m,
            color: m.id === 'card' ? 'from-blue-600 to-purple-600' :
                   m.id === 'sbp' ? 'from-green-600 to-emerald-600' :
                   'from-gray-600 to-gray-700'
          }))
        });
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
    }
  };

  // Fetch active bonus from API
  useEffect(() => {
    if (token) {
      fetchActiveBonus();
      fetchTransactions();
    }
  }, [token]);

  const fetchActiveBonus = async () => {
    try {
      const res = await fetch('/api/bonuses/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setActiveBonus(data.data[0]); // First active bonus
      } else {
        setActiveBonus(null);
      }
    } catch (error) {
      console.error('Failed to fetch active bonus:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/auth/transactions?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data?.transactions?.length > 0) {
        setTransactions(data.data.transactions.map((t: any) => ({
          id: t.id || t._id,
          type: t.type,
          amount: t.amount,
          status: t.status,
          method: t.method || t.description || 'N/A',
          createdAt: t.createdAt
        })));
      } else {
        // Пустой список если нет транзакций
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  // Get current available bonus from API
  const getCurrentBonus = () => {
    if (activeBonus) {
      return {
        percent: activeBonus.percent,
        maxBonus: activeBonus.maxBonus,
        wager: activeBonus.wagering,
        name: activeBonus.bonusName,
        key: activeBonus.bonusId,
        freespins: activeBonus.freespins,
        minDeposit: activeBonus.minDeposit
      };
    }
    return null;
  };

  const currentBonus = getCurrentBonus();
  const depositAmount = parseFloat(amount) || 0;
  const bonusAmount = currentBonus && acceptBonus ? Math.min(depositAmount * (currentBonus.percent / 100), currentBonus.maxBonus) : 0;
  const wagerRequired = bonusAmount > 0 && currentBonus ? (depositAmount + bonusAmount) * currentBonus.wager : 0;

  const handleDeposit = async () => {
    if (!selectedMethod || depositAmount <= 0) {
      toast.error('Выберите метод и введите сумму');
      return;
    }

    const method = [...paymentMethods.crypto, ...paymentMethods.fiat].find(m => m.id === selectedMethod);
    if (!method) return;

    if (depositAmount < method.minDeposit) {
      toast.error(`Минимальный депозит: ₽${method.minDeposit}`);
      return;
    }

    // Check bonus minimum deposit
    if (currentBonus && acceptBonus && depositAmount < (currentBonus.minDeposit || 0)) {
      toast.error(`Минимальный депозит для бонуса: ₽${currentBonus.minDeposit}`);
      return;
    }

    setIsProcessing(true);

    try {
      let finalBonusAmount = 0;
      let finalWagerRequired = 0;
      let bonusMessage = '';

      // If accepting bonus, apply it via API
      if (acceptBonus && activeBonus) {
        const bonusRes = await fetch('/api/bonuses/activate-deposit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            depositAmount,
            paymentMethod: selectedMethod
          })
        });
        const bonusData = await bonusRes.json();
        
        if (bonusData.success && bonusData.data.hasBonus) {
          finalBonusAmount = bonusData.data.bonusAmount;
          finalWagerRequired = bonusData.data.wagerRequired;
          bonusMessage = bonusData.data.message;
        }
      }

      // Create deposit via real API
      const depositRes = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: depositAmount,
          paymentMethod: method.id || method.name,
          currency: 'RUB'
        })
      });
      const depositData = await depositRes.json();

      if (!depositRes.ok || !depositData.success) {
        throw new Error(depositData.message || 'Ошибка создания депозита');
      }

      // AVE PAY returns redirectUrl — send user to payment page
      const redirectUrl = depositData.data?.redirectUrl;
      if (redirectUrl) {
        if (finalBonusAmount > 0) {
          toast.success(`Бонус +₽${finalBonusAmount.toLocaleString('ru-RU')} будет применён после оплаты!`, { icon: '🎁', duration: 3000 });
        }
        toast.loading('Перенаправляем на страницу оплаты...', { duration: 2000 });
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        return;
      }

      // Fallback if no redirect (shouldn't happen with AVE PAY)
      await refreshUser();
      toast.success(`Заявка на депозит ₽${depositAmount.toLocaleString('ru-RU')} создана!`);

      setAmount('');
      setSelectedMethod(null);
      setActiveBonus(null);
      fetchActiveBonus();

    } catch (error) {
      toast.error('Ошибка при обработке депозита');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedMethod || depositAmount <= 0 || !withdrawAddress) {
      toast.error('Заполните все поля');
      return;
    }

    if (depositAmount > (user?.balance || 0)) {
      toast.error('Недостаточно средств');
      return;
    }

    // Check if wager is active
    if (user?.wager?.active && (user.wager.completed || 0) < (user.wager.required || 0)) {
      toast.error(`Сначала отыграйте вейджер: ₽${((user.wager.required || 0) - (user.wager.completed || 0)).toFixed(2)} осталось`);
      return;
    }

    setIsProcessing(true);

    try {
      // Create withdrawal via real API
      const withdrawRes = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: depositAmount,
          paymentMethod: selectedMethod,
          walletAddress: withdrawAddress,
          currency: 'RUB'
        })
      });
      const withdrawData = await withdrawRes.json();

      if (!withdrawRes.ok || !withdrawData.success) {
        throw new Error(withdrawData.message || 'Ошибка создания заявки на вывод');
      }

      // Refresh user data from server to get updated balance
      await refreshUser();

      const newTransaction: Transaction = {
        id: withdrawData.data?.transaction?.id?.toString() || Date.now().toString(),
        type: 'withdrawal',
        amount: -depositAmount,
        status: 'pending',
        method: selectedMethod,
        createdAt: withdrawData.data?.transaction?.created_at || new Date().toISOString(),
        description: withdrawAddress
      };

      setTransactions(prev => [newTransaction, ...prev]);
      toast.success(`Заявка на вывод ₽${depositAmount.toLocaleString('ru-RU')} создана!`);

      setAmount('');
      setWithdrawAddress('');
      setSelectedMethod(null);

    } catch (error) {
      toast.error('Ошибка при создании заявки');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'withdrawal': return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'bonus': return <Gift className="w-5 h-5 text-aurex-gold-500" />;
      case 'win': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'bet': return <Zap className="w-5 h-5 text-blue-500" />;
      default: return <Wallet className="w-5 h-5 text-gray-500" />;
    }
  };

  const wagerProgress = user?.wager?.active && user.wager.required > 0 ? ((user.wager.completed || 0) / user.wager.required) * 100 : 0;

  return (
    <AuthGuard>
      <Head>
        <title>{t('wallet.title')} - Кошелёк</title>
        <meta name="description" content="Пополнение и вывод средств в AUREX" />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-6xl mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-center mb-4">
                  <Image
                    src="/images/aurexlogo.png"
                    alt="AUREX"
                    width={100}
                    height={40}
                    className="h-10 w-auto"
                  />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                  <span className="aurex-imperial-text">{t('wallet.title')}</span>
                </h1>
                <p className="text-aurex-platinum-400">{t('wallet.subtitle')}</p>
              </motion.div>
            </div>

            {/* Balance Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {/* Main Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 rounded-2xl p-6 text-aurex-obsidian-900"
              >
                <div className="flex items-center justify-between mb-4">
                  <Wallet className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-80">{t('wallet.mainBalance')}</span>
                </div>
                <div className="text-4xl font-black mb-1">{formatCurrency(user?.balance || 0)}</div>
                <div className="text-sm opacity-80">Доступно для игры и вывода</div>
              </motion.div>

              {/* Bonus Balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 text-white"
              >
                <div className="flex items-center justify-between mb-4">
                  <Gift className="w-8 h-8" />
                  <span className="text-sm font-medium opacity-80">{t('wallet.bonusBalance')}</span>
                </div>
                <div className="text-4xl font-black mb-1">{formatCurrency(user?.bonusBalance || 0)}</div>
                <div className="text-sm opacity-80">Требует отыгрыша</div>
              </motion.div>

              {/* VIP Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-aurex-obsidian-700 to-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 text-white"
              >
                <div className="flex items-center justify-between mb-4">
                  <Crown className="w-8 h-8 text-aurex-gold-500" />
                  <span className="text-sm font-medium text-aurex-platinum-400">{t('wallet.vipLevel')}</span>
                </div>
                <div className="text-4xl font-black text-aurex-gold-500 mb-1">
                  {['Bronze', 'Silver', 'Gold', 'Platinum', 'Emperor'][Math.max(0, Math.min((user?.vipLevel || 1) - 1, 4))]}
                </div>
                <div className="text-sm text-aurex-platinum-400">{user?.vipPoints || 0} VIP очков</div>
              </motion.div>
            </div>

            {/* Wager Progress */}
            {user?.wager?.active && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 mb-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Percent className="w-6 h-6 text-aurex-gold-500" />
                    <div>
                      <h3 className="text-white font-bold">Активный вейджер</h3>
                      <p className="text-sm text-aurex-platinum-400">x{user?.wager?.multiplier || 0} отыгрыш</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-aurex-gold-500 font-bold">
                      ₽{(user?.wager?.completed || 0).toFixed(2)} / ₽{(user?.wager?.required || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-aurex-platinum-400">
                      Осталось: ₽{((user?.wager?.required || 0) - (user?.wager?.completed || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="relative h-3 bg-aurex-obsidian-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(wagerProgress, 100)}%` }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-400 rounded-full"
                  />
                </div>
                <div className="mt-2 text-xs text-aurex-platinum-500 text-right">
                  {wagerProgress.toFixed(1)}% выполнено
                </div>
              </motion.div>
            )}

            {/* Active Bonuses Widget */}
            <ActiveBonusWidget />

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'deposit', label: t('wallet.deposit'), icon: <ArrowDownLeft className="w-4 h-4" /> },
                { id: 'withdraw', label: t('wallet.withdraw'), icon: <ArrowUpRight className="w-4 h-4" /> },
                { id: 'history', label: t('wallet.history'), icon: <History className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSelectedMethod(null);
                    setAmount('');
                  }}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900'
                      : 'bg-aurex-obsidian-800 text-aurex-platinum-300 border border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <AnimatePresence mode="wait">
                  {activeTab === 'deposit' && (
                    <motion.div
                      key="deposit"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                    >
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                        <ArrowDownLeft className="w-6 h-6 text-green-500" />
                        <span>Пополнение баланса</span>
                      </h2>

                      {/* Available Bonus Banner */}
                      {currentBonus && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-aurex-gold-500/20 to-purple-500/20 border border-aurex-gold-500/30 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Gift className="w-8 h-8 text-aurex-gold-500" />
                              <div>
                                <div className="text-white font-bold">Бонус {currentBonus.percent}% на {currentBonus.name}</div>
                                <div className="text-sm text-aurex-platinum-400">
                                  До ₽{currentBonus.maxBonus} • Вейджер x{currentBonus.wager}
                                </div>
                              </div>
                            </div>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={acceptBonus}
                                onChange={(e) => setAcceptBonus(e.target.checked)}
                                className="w-5 h-5 rounded border-aurex-gold-500 text-aurex-gold-500 focus:ring-aurex-gold-500"
                              />
                              <span className="text-sm text-aurex-platinum-300">Активировать</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Crypto Methods */}
                      <div className="mb-6">
                        <h3 className="text-sm text-aurex-platinum-400 uppercase tracking-wider mb-3">{t('wallet.crypto')}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {paymentMethods.crypto.map((method) => (
                            <button
                              key={method.id}
                              onClick={() => setSelectedMethod(method.id)}
                              className={`relative p-4 rounded-xl border-2 transition-all ${
                                selectedMethod === method.id
                                  ? 'border-aurex-gold-500 bg-aurex-gold-500/10'
                                  : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center text-white font-bold text-xl mb-2`}>
                                {method.icon}
                              </div>
                              <div className="text-white font-medium text-sm">{method.name}</div>
                              <div className="text-xs text-aurex-platinum-500">Min: ₽{method.minDeposit}</div>
                              {method.fee === 0 && (
                                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">0% fee</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fiat Methods */}
                      <div className="mb-6">
                        <h3 className="text-sm text-aurex-platinum-400 uppercase tracking-wider mb-3">{t('wallet.cards')}</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {paymentMethods.fiat.map((method) => (
                            <button
                              key={method.id}
                              onClick={() => setSelectedMethod(method.id)}
                              className={`relative p-4 rounded-xl border-2 transition-all ${
                                selectedMethod === method.id
                                  ? 'border-aurex-gold-500 bg-aurex-gold-500/10'
                                  : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center text-2xl mb-2`}>
                                {method.icon}
                              </div>
                              <div className="text-white font-medium text-sm">{method.name}</div>
                              <div className="text-xs text-aurex-platinum-500">Min: ₽{method.minDeposit}</div>
                              {method.fee > 0 && (
                                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">{method.fee}% fee</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Amount Input */}
                      <div className="mb-6">
                        <label className="block text-sm text-aurex-platinum-400 mb-2">Сумма депозита (₽)</label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          className="w-full px-4 py-4 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-2xl font-bold focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                        <div className="flex gap-2 mt-3">
                          {[20, 50, 100, 200, 500, 1000].map((preset) => (
                            <button
                              key={preset}
                              onClick={() => setAmount(String(preset))}
                              className="flex-1 py-2 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg text-sm hover:bg-aurex-obsidian-600 transition-colors"
                            >
                              ₽{preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      {depositAmount > 0 && (
                        <div className="mb-6 p-4 bg-aurex-obsidian-900/50 rounded-xl space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-aurex-platinum-400">Депозит</span>
                            <span className="text-white">₽{depositAmount.toFixed(2)}</span>
                          </div>
                          {bonusAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-aurex-gold-500">Бонус {currentBonus?.percent}%</span>
                              <span className="text-aurex-gold-500">+₽{bonusAmount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="border-t border-aurex-gold-500/20 pt-2 flex justify-between font-bold">
                            <span className="text-white">Итого на счёт</span>
                            <span className="text-aurex-gold-500">₽{(depositAmount + bonusAmount).toFixed(2)}</span>
                          </div>
                          {wagerRequired > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-aurex-platinum-500">Вейджер для вывода</span>
                              <span className="text-aurex-platinum-400">₽{wagerRequired.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        onClick={handleDeposit}
                        disabled={!selectedMethod || depositAmount <= 0 || isProcessing}
                        className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Обработка...</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-5 h-5" />
                            <span>Пополнить ₽{depositAmount || 0}</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  {activeTab === 'withdraw' && (
                    <motion.div
                      key="withdraw"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                    >
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                        <ArrowUpRight className="w-6 h-6 text-red-500" />
                        <span>Вывод средств</span>
                      </h2>

                      {/* Wager Warning */}
                      {user?.wager?.active && (user.wager.completed || 0) < (user.wager.required || 0) && (
                        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                            <div>
                              <div className="text-yellow-400 font-bold">Активный вейджер</div>
                              <div className="text-sm text-yellow-300/80">
                                Для вывода необходимо отыграть ещё ₽{((user.wager.required || 0) - (user.wager.completed || 0)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Available for withdrawal */}
                      <div className="mb-6 p-4 bg-aurex-obsidian-900/50 rounded-xl">
                        <div className="text-sm text-aurex-platinum-400 mb-1">Доступно для вывода</div>
                        <div className="text-3xl font-bold text-white">{formatCurrency(user?.balance || 0)}</div>
                      </div>

                      {/* Crypto Methods Only for Withdraw */}
                      <div className="mb-6">
                        <h3 className="text-sm text-aurex-platinum-400 uppercase tracking-wider mb-3">Выберите криптовалюту</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {paymentMethods.crypto.map((method) => (
                            <button
                              key={method.id}
                              onClick={() => setSelectedMethod(method.id)}
                              className={`p-4 rounded-xl border-2 transition-all ${
                                selectedMethod === method.id
                                  ? 'border-aurex-gold-500 bg-aurex-gold-500/10'
                                  : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center text-white font-bold text-xl mb-2`}>
                                {method.icon}
                              </div>
                              <div className="text-white font-medium text-sm">{method.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Wallet Address */}
                      <div className="mb-6">
                        <label className="block text-sm text-aurex-platinum-400 mb-2">Адрес кошелька</label>
                        <input
                          type="text"
                          value={withdrawAddress}
                          onChange={(e) => setWithdrawAddress(e.target.value)}
                          placeholder="Введите адрес кошелька"
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>

                      {/* Amount */}
                      <div className="mb-6">
                        <label className="block text-sm text-aurex-platinum-400 mb-2">Сумма вывода (₽)</label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          max={user?.balance || 0}
                          className="w-full px-4 py-4 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-2xl font-bold focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                        <button
                          onClick={() => setAmount(String(user?.balance || 0))}
                          className="mt-2 text-sm text-aurex-gold-500 hover:underline"
                        >
                          Вывести всё ({formatCurrency(user?.balance || 0)})
                        </button>
                      </div>

                      {/* Submit */}
                      <button
                        onClick={handleWithdraw}
                        disabled={!selectedMethod || depositAmount <= 0 || !withdrawAddress || isProcessing || (user?.wager?.active && (user.wager?.completed || 0) < (user.wager?.required || 0))}
                        className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Обработка...</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-5 h-5" />
                            <span>Вывести ₽{depositAmount || 0}</span>
                          </>
                        )}
                      </button>

                      <p className="text-xs text-aurex-platinum-500 text-center mt-4">
                        Выводы обрабатываются в течение 1-24 часов
                      </p>
                    </motion.div>
                  )}

                  {activeTab === 'history' && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                    >
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                        <History className="w-6 h-6 text-aurex-gold-500" />
                        <span>История транзакций</span>
                      </h2>

                      {transactions.length === 0 ? (
                        <div className="text-center py-12 text-aurex-platinum-500">
                          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Транзакций пока нет</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {transactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-full bg-aurex-obsidian-700 flex items-center justify-center">
                                  {getTypeIcon(tx.type)}
                                </div>
                                <div>
                                  <div className="text-white font-medium capitalize">
                                    {tx.type === 'deposit' ? 'Депозит' : 
                                     tx.type === 'withdrawal' ? 'Вывод' :
                                     tx.type === 'bonus' ? 'Бонус' :
                                     tx.type === 'win' ? 'Выигрыш' :
                                     tx.type === 'bet' ? 'Ставка' : tx.type}
                                  </div>
                                  <div className="text-sm text-aurex-platinum-500">{tx.method}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {tx.amount >= 0 ? '+' : ''}₽{Math.abs(tx.amount).toFixed(2)}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-aurex-platinum-500">
                                  {getStatusIcon(tx.status)}
                                  <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">{t('wallet.statistics')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">Всего депозитов</span>
                      <span className="text-white font-bold">₽{(user?.totalDeposited || 0).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">Всего выводов</span>
                      <span className="text-white font-bold">₽{(user?.totalWithdrawn || 0).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">Количество депозитов</span>
                      <span className="text-white font-bold">{user?.depositCount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">Игр сыграно</span>
                      <span className="text-white font-bold">{user?.gamesPlayed || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Deposit Bonuses Progress */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Приветственные бонусы</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'firstDeposit', label: '1-й депозит', bonus: '200%' },
                      { key: 'secondDeposit', label: '2-й депозит', bonus: '150%' },
                      { key: 'thirdDeposit', label: '3-й депозит', bonus: '100%' },
                      { key: 'fourthDeposit', label: '4-й депозит', bonus: '75%' },
                    ].map((item) => {
                      const isUsed = user?.usedBonuses?.[item.key as keyof typeof user.usedBonuses];
                      return (
                        <div key={item.key} className="flex items-center justify-between p-3 bg-aurex-obsidian-900/50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            {isUsed ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Gift className="w-5 h-5 text-aurex-gold-500" />
                            )}
                            <span className={isUsed ? 'text-aurex-platinum-500' : 'text-white'}>{item.label}</span>
                          </div>
                          <span className={`font-bold ${isUsed ? 'text-aurex-platinum-500 line-through' : 'text-aurex-gold-500'}`}>
                            {item.bonus}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Promocode Activation */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <Tag className="w-5 h-5 text-aurex-gold-500" />
                    <span>Промокод</span>
                  </h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Введите промокод"
                      className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white font-mono uppercase placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (!promoCode.trim()) {
                          toast.error('Введите промокод');
                          return;
                        }
                        setIsActivatingPromo(true);
                        try {
                          const response = await fetch('/api/promocodes/activate', {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ code: promoCode })
                          });
                          const data = await response.json();
                          if (data.success) {
                            const credited = data.data?.creditedAmount || data.data?.value || 0;
                            const typeLabel = data.data?.type === 'freespins' ? `+${credited} фриспинов` : `+₽${credited.toLocaleString('ru-RU')}`;
                            toast.success(`Промокод активирован! ${typeLabel}`, { icon: '🎁' });
                            refreshUser?.();
                            setPromoCode('');
                          } else {
                            toast.error(data.message || 'Неверный промокод');
                          }
                        } catch (error) {
                          toast.error('Ошибка активации промокода');
                        } finally {
                          setIsActivatingPromo(false);
                        }
                      }}
                      disabled={isActivatingPromo || !promoCode.trim()}
                      className="w-full py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isActivatingPromo ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Gift className="w-5 h-5" />
                          <span>Активировать</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Security */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-aurex-gold-500" />
                    <span>Безопасность</span>
                  </h3>
                  <div className="space-y-3 text-sm text-aurex-platinum-400">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>SSL шифрование 256-bit</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Мгновенные крипто-выплаты</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Защита от мошенничества</span>
                    </div>
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
