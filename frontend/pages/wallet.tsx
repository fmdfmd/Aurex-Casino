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
  ChevronDown,
  X,
  Zap,
  Percent,
  RefreshCw,
  Tag,
  Smartphone,
  Building2
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import ActiveBonusWidget from '../components/ActiveBonusWidget';
import { useAuthStore } from '../store/authStore';
import { useTranslation, useCurrency } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  transactionId?: string | number;
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
  const [availableBonus, setAvailableBonus] = useState<any>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [depositBankCode, setDepositBankCode] = useState('');
  const [showDepositBankDropdown, setShowDepositBankDropdown] = useState(false);
  const [nspkPhone, setNspkPhone] = useState('');
  const [nirvanaPaymentDetails, setNirvanaPaymentDetails] = useState<{
    receiver: string;
    bankName: string;
    recipientName: string;
    amount: number;
    transactionId: number;
  } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{
    crypto: { id: string; name: string; iconUrl?: string; icon?: string; subtitle?: string; color?: string; minDeposit?: number; maxDeposit?: number; minWithdraw?: number; depositFee?: number; withdrawFee?: number; paymentMethod?: string }[];
    fiat: { id: string; name: string; iconUrl?: string; icon?: string; subtitle?: string; color?: string; minDeposit?: number; maxDeposit?: number; minWithdraw?: number; depositFee?: number; withdrawFee?: number }[];
    banks: { code: string; name: string; iconUrl?: string; icon?: string }[];
  }>({ crypto: [], fiat: [], banks: [] });

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
          crypto: (data.data.crypto || []).map((m: any) => ({ ...m })),
          fiat: (data.data.fiat || []).map((m: any) => ({ ...m })),
          banks: data.data.banks || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      toast.error('Не удалось загрузить методы оплаты');
    }
  };

  // Fetch active + available bonuses from API
  useEffect(() => {
    if (token) {
      fetchActiveBonus();
      fetchAvailableBonus();
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
        setActiveBonus(data.data[0]);
      } else {
        setActiveBonus(null);
      }
    } catch (error) {
      console.error('Failed to fetch active bonus:', error);
      toast.error('Не удалось загрузить бонусы');
    }
  };

  const fetchAvailableBonus = async () => {
    try {
      const res = await fetch('/api/bonuses/available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const next = data.data.find((b: any) => b.available && !b.locked);
        setAvailableBonus(next || null);
      } else {
        setAvailableBonus(null);
      }
    } catch (error) {
      console.error('Failed to fetch available bonus:', error);
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
          createdAt: t.createdAt,
          transactionId: t.externalRef || t.id
        })));
      } else {
        // Пустой список если нет транзакций
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Не удалось загрузить историю транзакций');
    }
  };

  // Get next available deposit bonus (for showing in deposit form)
  const getCurrentBonus = () => {
    if (availableBonus) {
      return {
        percent: availableBonus.percent,
        maxBonus: availableBonus.maxBonus,
        wager: availableBonus.wager,
        name: availableBonus.title,
        key: availableBonus.type,
        freespins: 0,
        minDeposit: 1000
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

    const minDep = method.minDeposit || 5000;
    const maxDep = method.maxDeposit || 300000;
    if (depositAmount < minDep) {
      toast.error(`Минимальный депозит: ${minDep.toLocaleString('ru-RU')} ₽`);
      return;
    }
    if (depositAmount > maxDep) {
      toast.error(`Максимальный депозит: ${maxDep.toLocaleString('ru-RU')} ₽`);
      return;
    }

    // Check bonus minimum deposit
    if (currentBonus && acceptBonus && depositAmount < (currentBonus.minDeposit || 0)) {
      toast.error(`Минимальный депозит для бонуса: ₽${currentBonus.minDeposit}`);
      return;
    }

    setIsProcessing(true);

    try {
      // If accepting bonus, activate it (sets selectedBonus for webhook to apply on deposit confirmation)
      if (acceptBonus && availableBonus) {
        try {
          await fetch(`/api/bonuses/${availableBonus.type}/activate`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (e) {
          console.error('Failed to activate bonus:', e);
        }
      }

      const actualPaymentMethod = getActualPaymentMethod(method);

      const depositRes = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: depositAmount,
          paymentMethod: actualPaymentMethod,
          currency: 'RUB',
          ...(actualPaymentMethod === 'EXPAY_NSPK' && nspkPhone ? { nspkPhone: `7${nspkPhone}` } : {})
        })
      });
      const depositData = await depositRes.json();

      if (!depositRes.ok || !depositData.success) {
        throw new Error(depositData.message || 'Ошибка создания депозита');
      }

      // Nirvana Pay H2H — show receiver details
      const nirvanaDetails = depositData.data?.nirvanaDetails;
      if (nirvanaDetails && nirvanaDetails.receiver) {
        setNirvanaPaymentDetails({
          receiver: nirvanaDetails.receiver,
          bankName: nirvanaDetails.bankName || '',
          recipientName: nirvanaDetails.recipientName || '',
          amount: depositAmount,
          transactionId: depositData.data?.transaction?.id || 0
        });
        if (acceptBonus && currentBonus && bonusAmount > 0) {
          toast.success(`Бонус ${currentBonus.percent}% (+₽${bonusAmount.toLocaleString('ru-RU')}) будет применён после оплаты!`, { duration: 3000 });
        }
        toast.success('Переведите средства по реквизитам ниже');
        return;
      }

      // AVE PAY — redirect to payment page
      const redirectUrl = depositData.data?.redirectUrl;
      if (redirectUrl) {
        if (acceptBonus && currentBonus && bonusAmount > 0) {
          toast.success(`Бонус ${currentBonus.percent}% (+₽${bonusAmount.toLocaleString('ru-RU')}) будет применён после оплаты!`, { duration: 3000 });
        }
        toast.loading('Перенаправляем на страницу оплаты...', { duration: 2000 });
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        return;
      }

      // Fallback if no redirect
      await refreshUser();
      toast.success(`Заявка на депозит ₽${depositAmount.toLocaleString('ru-RU')} создана!`);

      setAmount('');
      setSelectedMethod(null);
      setAvailableBonus(null);
      fetchActiveBonus();
      fetchAvailableBonus();

    } catch (error) {
      toast.error('Ошибка при обработке депозита');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedMethod || depositAmount <= 0) {
      toast.error('Выберите метод и введите сумму');
      return;
    }

    const isCardMethod = ['P2P_CARD', 'NIRVANA_C2C', 'NIRVANA_TRANS_C2C', 'NIRVANA_SBER', 'NIRVANA_ALFA', 'NIRVANA_VTB', 'EXPAY_SBER', 'EXPAY_CARD'].includes(selectedMethod);
    const isPhoneMethod = ['P2P_SBP', 'NIRVANA_SBP', 'NIRVANA_SBER_SBP', 'NIRVANA_ALFA_SBP', 'NIRVANA_VTB_SBP', 'NIRVANA_TRANS_SBP', 'EXPAY_SBP'].includes(selectedMethod);

    if (isCardMethod && cardNumber.replace(/\s/g, '').length !== 16) {
      toast.error('Введите корректный номер карты (16 цифр)');
      return;
    }

    if (isPhoneMethod && phone.length !== 10) {
      toast.error('Введите корректный номер телефона');
      return;
    }

    if (selectedMethod === 'P2P_SBP' && !bankCode) {
      toast.error('Выберите банк');
      return;
    }

    if ((selectedMethod === 'CRYPTO' || selectedMethod?.startsWith('CRYPTO_')) && !withdrawAddress) {
      toast.error('Введите адрес кошелька');
      return;
    }

    if (depositAmount < 1000) {
      toast.error('Минимальная сумма вывода: 1 000 ₽');
      return;
    }

    if (depositAmount > (user?.balance || 0)) {
      toast.error('Недостаточно средств');
      return;
    }

    if (user?.wager?.active && (user.wager.completed || 0) < (user.wager.required || 0)) {
      toast.error(`Сначала отыграйте вейджер: ₽${((user.wager.required || 0) - (user.wager.completed || 0)).toFixed(2)} осталось`);
      return;
    }

    setIsProcessing(true);

    try {
      const actualMethod = getActualPaymentMethod(
        allMethods.find(m => m.id === selectedMethod) || { id: selectedMethod }
      );

      const body: any = {
        amount: depositAmount,
        paymentMethod: actualMethod,
        currency: 'RUB'
      };

      if (isCardMethod) {
        body.cardNumber = cardNumber.replace(/\s/g, '');
      } else if (isPhoneMethod) {
        body.phone = phone;
        if (selectedMethod === 'P2P_SBP') body.bankCode = bankCode;
      } else if (selectedMethod === 'CRYPTO' || selectedMethod?.startsWith('CRYPTO_')) {
        body.walletAddress = withdrawAddress;
      }

      const withdrawRes = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const withdrawData = await withdrawRes.json();

      if (!withdrawRes.ok || !withdrawData.success) {
        throw new Error(withdrawData.message || 'Ошибка создания заявки на вывод');
      }

      await refreshUser();

      const methodNames: Record<string, string> = {
        'P2P_CARD': `Карта •••• ${cardNumber.replace(/\s/g, '').slice(-4)}`,
        'P2P_SBP': `СБП ${paymentMethods.banks.find(b => b.code === bankCode)?.name || ''}`,
        'CRYPTO': 'Криптовалюта'
      };

      const newTransaction: Transaction = {
        id: withdrawData.data?.transaction?.id?.toString() || Date.now().toString(),
        type: 'withdrawal',
        amount: -depositAmount,
        status: 'pending',
        method: methodNames[selectedMethod] || selectedMethod,
        createdAt: withdrawData.data?.transaction?.created_at || new Date().toISOString()
      };

      setTransactions(prev => [newTransaction, ...prev]);
      toast.success(`Заявка на вывод ₽${depositAmount.toLocaleString('ru-RU')} создана!`);

      setAmount('');
      setCardNumber('');
      setPhone('');
      setBankCode('');
      setWithdrawAddress('');
      setSelectedMethod(null);

    } catch (error: any) {
      toast.error(error.message || 'Ошибка при создании заявки');
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

  const getActualPaymentMethod = (method: any) => method.paymentMethod || method.id;

  const allMethods = [...paymentMethods.fiat, ...paymentMethods.crypto];

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
                    setCardNumber('');
                    setPhone('');
                    setBankCode('');
                    setDepositBankCode('');
                    setWithdrawAddress('');
                    setShowBankDropdown(false);
                    setShowDepositBankDropdown(false);
                    setNirvanaPaymentDetails(null);
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
                                  До ₽{(currentBonus.maxBonus || 0).toLocaleString('ru-RU')} • Вейджер x{currentBonus.wager}
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

                      {/* Fiat Methods */}
                      <div className="mb-4">
                        <h3 className="text-sm text-aurex-platinum-400 uppercase tracking-wider mb-3">Способы оплаты</h3>
                        <div className="grid grid-cols-3 gap-3">
                          {paymentMethods.fiat.map((method: any) => (
                            <button
                              key={method.id}
                              onClick={() => { setSelectedMethod(method.id); setNirvanaPaymentDetails(null); }}
                              className={`relative p-3 rounded-xl border-2 transition-all group ${
                                selectedMethod === method.id
                                  ? 'border-aurex-gold-500 bg-aurex-gold-500/10 shadow-lg shadow-aurex-gold-500/5'
                                  : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/40 hover:bg-aurex-obsidian-700/50'
                              }`}
                            >
                              {selectedMethod === method.id && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-aurex-gold-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3.5 h-3.5 text-aurex-obsidian-900" />
                                </div>
                              )}
                              {method.iconUrl ? (
                                <img src={method.iconUrl} alt={method.name} className="w-full h-10 rounded-lg mx-auto mb-1.5 object-contain group-hover:scale-110 transition-transform" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-aurex-obsidian-700 flex items-center justify-center text-lg mx-auto mb-1.5">{method.icon}</div>
                              )}
                              <div className="text-white font-medium text-xs text-center">{method.name}</div>
                              <div className="text-[10px] text-aurex-platinum-500 text-center mt-0.5">
                                {method.subtitle || `от ${(method.minDeposit || 100).toLocaleString('ru-RU')} ₽`}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Crypto Methods — temporarily unavailable */}
                      {paymentMethods.crypto.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-sm text-aurex-platinum-400 uppercase tracking-wider mb-3">Криптовалюта</h3>
                          <div className="grid grid-cols-3 gap-3">
                            {paymentMethods.crypto.map((method) => (
                              <button
                                key={method.id}
                                onClick={() => setSelectedMethod(method.id)}
                                className={`relative p-4 rounded-xl border-2 transition-all group ${
                                  selectedMethod === method.id
                                    ? 'border-aurex-gold-500 bg-aurex-gold-500/10 shadow-lg shadow-aurex-gold-500/5'
                                    : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/40 hover:bg-aurex-obsidian-700/50'
                                }`}
                              >
                                {selectedMethod === method.id && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-aurex-gold-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-3.5 h-3.5 text-aurex-obsidian-900" />
                                  </div>
                                )}
                                {method.iconUrl ? (
                                  <img src={method.iconUrl} alt={method.name} className="w-11 h-11 rounded-full mx-auto mb-2 object-contain group-hover:scale-110 transition-transform" />
                                ) : (
                                  <div className="w-11 h-11 rounded-full bg-aurex-obsidian-700 flex items-center justify-center text-xl mx-auto mb-2">{method.icon}</div>
                                )}
                                <div className="text-white font-medium text-sm text-center">{method.name}</div>
                                {method.subtitle && (
                                  <div className="text-[11px] text-aurex-platinum-500 text-center mt-0.5">{method.subtitle}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bank selection not needed for deposits (confirmed by AVE PAY support) */}

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
                        <div className="flex flex-wrap gap-2 mt-3">
                          {[3000, 5000, 10000, 20000, 50000, 100000].map((preset) => (
                            <button
                              key={preset}
                              onClick={() => setAmount(String(preset))}
                              className={`flex-1 min-w-[60px] py-2.5 rounded-lg text-sm font-medium transition-all ${
                                amount === String(preset)
                                  ? 'bg-aurex-gold-500/20 text-aurex-gold-400 border border-aurex-gold-500/50'
                                  : 'bg-aurex-obsidian-700 text-aurex-platinum-300 border border-transparent hover:bg-aurex-obsidian-600'
                              }`}
                            >
                              {preset >= 1000 ? `${preset / 1000}K` : preset} ₽
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

                      {/* Nirvana Pay — payment details card */}
                      {nirvanaPaymentDetails && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6 p-5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/40 rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-5 h-5 text-green-500" />
                              <h3 className="text-white font-bold">Реквизиты для перевода</h3>
                            </div>
                            <button
                              onClick={() => setNirvanaPaymentDetails(null)}
                              className="text-aurex-platinum-500 hover:text-white transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-aurex-obsidian-900/60 rounded-lg">
                              <div>
                                <div className="text-xs text-aurex-platinum-500">Сумма</div>
                                <div className="text-white font-bold text-lg">₽{nirvanaPaymentDetails.amount.toLocaleString('ru-RU')}</div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-aurex-obsidian-900/60 rounded-lg">
                              <div>
                                <div className="text-xs text-aurex-platinum-500">{nirvanaPaymentDetails.bankName}</div>
                                <div className="text-white font-bold font-mono text-lg tracking-wider">{nirvanaPaymentDetails.receiver}</div>
                              </div>
                              <button
                                onClick={() => copyToClipboard(nirvanaPaymentDetails.receiver)}
                                className="p-2 bg-aurex-obsidian-700 rounded-lg hover:bg-aurex-obsidian-600 transition-colors"
                              >
                                <Copy className="w-4 h-4 text-aurex-gold-500" />
                              </button>
                            </div>

                            {nirvanaPaymentDetails.recipientName && (
                              <div className="p-3 bg-aurex-obsidian-900/60 rounded-lg">
                                <div className="text-xs text-aurex-platinum-500">Получатель</div>
                                <div className="text-white font-medium">{nirvanaPaymentDetails.recipientName}</div>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-yellow-300/80">
                                Переведите <strong>точную сумму</strong> по указанным реквизитам. Баланс пополнится автоматически после подтверждения платежа (обычно 1-5 минут).
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {selectedMethod === 'EXPAY_NSPK' && !user?.phone && (
                        <div className="mb-4">
                          <label className="block text-sm text-aurex-platinum-400 mb-2">Номер телефона (для НСПК)</label>
                          <div className="flex items-center bg-aurex-obsidian-800 border border-aurex-obsidian-600 rounded-xl overflow-hidden">
                            <span className="px-3 text-aurex-platinum-400 text-sm">+7</span>
                            <input
                              type="tel"
                              value={(() => {
                                const d = nspkPhone;
                                if (d.length === 0) return '';
                                let masked = '(' + d.slice(0, 3);
                                if (d.length >= 3) masked += ') ';
                                masked += d.slice(3, 6);
                                if (d.length >= 6) masked += '-';
                                masked += d.slice(6, 8);
                                if (d.length >= 8) masked += '-';
                                masked += d.slice(8, 10);
                                return masked;
                              })()}
                              onChange={e => {
                                const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setNspkPhone(raw);
                              }}
                              placeholder="(900) 123-45-67"
                              className="flex-1 bg-transparent text-white px-3 py-3 outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        onClick={handleDeposit}
                        disabled={!selectedMethod || depositAmount <= 0 || isProcessing || (selectedMethod === 'EXPAY_NSPK' && !user?.phone && nspkPhone.length !== 10)}
                        className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Обработка...</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-5 h-5" />
                            <span>Пополнить {depositAmount > 0 ? `₽${depositAmount.toLocaleString('ru-RU')}` : ''}</span>
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
                      <div className="mb-6 p-5 bg-gradient-to-r from-aurex-obsidian-900 to-aurex-obsidian-900/80 rounded-xl border border-aurex-gold-500/10">
                        <div className="text-sm text-aurex-platinum-400 mb-1">Доступно для вывода</div>
                        <div className="text-3xl font-black text-white">{formatCurrency(user?.balance || 0)}</div>
                      </div>

                      {/* Withdrawal methods */}
                      <div className="mb-6">
                        <h3 className="text-sm text-aurex-platinum-400 uppercase tracking-wider mb-3">Способ вывода</h3>

                        {/* Fiat */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {paymentMethods.fiat.filter((m: any) => m.minWithdraw != null).map((method: any) => (
                            <button
                              key={method.id}
                              onClick={() => {
                                setSelectedMethod(method.id);
                                setCardNumber('');
                                setPhone('');
                                setBankCode('');
                                setWithdrawAddress('');
                              }}
                              className={`relative p-4 rounded-xl border-2 transition-all group ${
                                selectedMethod === method.id
                                  ? 'border-aurex-gold-500 bg-aurex-gold-500/10 shadow-lg shadow-aurex-gold-500/5'
                                  : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/40 hover:bg-aurex-obsidian-700/50'
                              }`}
                            >
                              {selectedMethod === method.id && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-aurex-gold-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3.5 h-3.5 text-aurex-obsidian-900" />
                                </div>
                              )}
                              <div className="flex items-center space-x-3">
                                {method.iconUrl ? (
                                  <img src={method.iconUrl} alt={method.name} className="w-16 h-10 rounded-lg object-contain group-hover:scale-110 transition-transform" />
                                ) : (
                                  <div className="w-16 h-10 rounded-lg bg-aurex-obsidian-700 flex items-center justify-center text-xl">{method.icon}</div>
                                )}
                                <div className="text-left">
                                  <div className="text-white font-medium text-sm">{method.name}</div>
                                  <div className="text-xs text-aurex-platinum-500">от {(method.minWithdraw || 1000).toLocaleString('ru-RU')} ₽ • {method.withdrawFee || 5}%</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Crypto — hidden when unavailable */}
                        {paymentMethods.crypto.length > 0 && (
                          <div className="grid grid-cols-3 gap-3">
                            {paymentMethods.crypto.map((method) => (
                              <button
                                key={method.id}
                                onClick={() => {
                                  setSelectedMethod(method.id);
                                  setCardNumber('');
                                  setPhone('');
                                  setBankCode('');
                                  setWithdrawAddress('');
                                }}
                                className={`relative p-3 rounded-xl border-2 transition-all group ${
                                  selectedMethod === method.id
                                    ? 'border-aurex-gold-500 bg-aurex-gold-500/10 shadow-lg shadow-aurex-gold-500/5'
                                    : 'border-aurex-gold-500/20 hover:border-aurex-gold-500/40 hover:bg-aurex-obsidian-700/50'
                                }`}
                              >
                                {selectedMethod === method.id && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-aurex-gold-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-3.5 h-3.5 text-aurex-obsidian-900" />
                                  </div>
                                )}
                                {method.iconUrl ? (
                                  <img src={method.iconUrl} alt={method.name} className="w-9 h-9 rounded-full mx-auto mb-1.5 object-contain group-hover:scale-110 transition-transform" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-aurex-obsidian-700 flex items-center justify-center text-lg mx-auto mb-1.5">{method.icon}</div>
                                )}
                                <div className="text-white font-medium text-xs text-center">{method.name}</div>
                                {method.subtitle && (
                                  <div className="text-[10px] text-aurex-platinum-500 text-center">{method.subtitle}</div>
                                )}
                                <div className="text-[10px] text-aurex-platinum-600 text-center mt-0.5">{method.withdrawFee || 2}%</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dynamic inputs based on selected method */}
                      <AnimatePresence mode="wait">
                        {selectedMethod && ['P2P_CARD', 'NIRVANA_C2C', 'NIRVANA_TRANS_C2C', 'NIRVANA_SBER', 'NIRVANA_ALFA', 'NIRVANA_VTB', 'EXPAY_SBER', 'EXPAY_CARD'].includes(selectedMethod) && (
                          <motion.div
                            key="card-input"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6"
                          >
                            <label className="block text-sm text-aurex-platinum-400 mb-2 flex items-center space-x-2">
                              <CreditCard className="w-4 h-4" />
                              <span>Номер карты</span>
                            </label>
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                                setCardNumber(v.replace(/(\d{4})(?=\d)/g, '$1 '));
                              }}
                              placeholder="0000 0000 0000 0000"
                              maxLength={19}
                              className="w-full px-4 py-3.5 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-lg font-mono tracking-wider focus:border-aurex-gold-500/50 focus:outline-none focus:ring-1 focus:ring-aurex-gold-500/20 placeholder-aurex-platinum-600"
                            />
                          </motion.div>
                        )}

                        {selectedMethod && ['P2P_SBP', 'NIRVANA_SBP', 'NIRVANA_SBER_SBP', 'NIRVANA_ALFA_SBP', 'NIRVANA_VTB_SBP', 'NIRVANA_TRANS_SBP', 'EXPAY_SBP'].includes(selectedMethod) && (
                          <motion.div
                            key="sbp-input"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 space-y-4"
                          >
                            <div>
                              <label className="block text-sm text-aurex-platinum-400 mb-2 flex items-center space-x-2">
                                <Smartphone className="w-4 h-4" />
                                <span>Номер телефона</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-aurex-platinum-500 font-mono">+7</span>
                                <input
                                  type="text"
                                  value={phone}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setPhone(v);
                                  }}
                                  placeholder="9001234567"
                                  maxLength={10}
                                  className="w-full pl-12 pr-4 py-3.5 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-lg font-mono tracking-wider focus:border-aurex-gold-500/50 focus:outline-none focus:ring-1 focus:ring-aurex-gold-500/20 placeholder-aurex-platinum-600"
                                />
                              </div>
                            </div>

                            {selectedMethod === 'P2P_SBP' && (
                            <div>
                              <label className="block text-sm text-aurex-platinum-400 mb-2 flex items-center space-x-2">
                                <Building2 className="w-4 h-4" />
                                <span>Банк получателя</span>
                              </label>
                              <div className="relative">
                                <button
                                  onClick={() => setShowBankDropdown(!showBankDropdown)}
                                  className="w-full px-4 py-3.5 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-left flex items-center justify-between focus:border-aurex-gold-500/50 focus:outline-none focus:ring-1 focus:ring-aurex-gold-500/20 transition-all"
                                >
                                  <span className={`flex items-center space-x-2 ${bankCode ? 'text-white' : 'text-aurex-platinum-600'}`}>
                                    {bankCode && paymentMethods.banks.find(b => b.code === bankCode)?.iconUrl ? (
                                      <>
                                        <img src={paymentMethods.banks.find(b => b.code === bankCode)?.iconUrl} alt="" className="w-5 h-5 rounded" />
                                        <span>{paymentMethods.banks.find(b => b.code === bankCode)?.name}</span>
                                      </>
                                    ) : bankCode ? (
                                      <span>{paymentMethods.banks.find(b => b.code === bankCode)?.icon} {paymentMethods.banks.find(b => b.code === bankCode)?.name}</span>
                                    ) : (
                                      <span>Выберите банк</span>
                                    )}
                                  </span>
                                  <ChevronDown className={`w-5 h-5 text-aurex-platinum-500 transition-transform ${showBankDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                  {showBankDropdown && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute z-50 top-full left-0 right-0 mt-2 bg-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-xl overflow-hidden shadow-2xl shadow-black/50"
                                    >
                                      {paymentMethods.banks.map((bank) => (
                                        <button
                                          key={bank.code}
                                          onClick={() => {
                                            setBankCode(bank.code);
                                            setShowBankDropdown(false);
                                          }}
                                          className={`w-full px-4 py-3.5 text-left flex items-center space-x-3 transition-all ${
                                            bankCode === bank.code
                                              ? 'bg-aurex-gold-500/10 text-aurex-gold-400'
                                              : 'text-white hover:bg-aurex-obsidian-700'
                                          }`}
                                        >
                                          {bank.iconUrl ? (
                                            <img src={bank.iconUrl} alt={bank.name} className="w-6 h-6 rounded object-contain" />
                                          ) : (
                                            <span className="text-xl">{bank.icon}</span>
                                          )}
                                          <span className="font-medium">{bank.name}</span>
                                          {bankCode === bank.code && (
                                            <CheckCircle className="w-4 h-4 text-aurex-gold-500 ml-auto" />
                                          )}
                                        </button>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                            )}
                          </motion.div>
                        )}

                        {selectedMethod && (selectedMethod === 'CRYPTO' || selectedMethod.startsWith('CRYPTO_')) && (
                          <motion.div
                            key="crypto-input"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6"
                          >
                            <label className="block text-sm text-aurex-platinum-400 mb-2 flex items-center space-x-2">
                              <Bitcoin className="w-4 h-4" />
                              <span>Адрес кошелька</span>
                            </label>
                            <input
                              type="text"
                              value={withdrawAddress}
                              onChange={(e) => setWithdrawAddress(e.target.value)}
                              placeholder="Введите адрес кошелька"
                              className="w-full px-4 py-3.5 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white font-mono text-sm focus:border-aurex-gold-500/50 focus:outline-none focus:ring-1 focus:ring-aurex-gold-500/20 placeholder-aurex-platinum-600"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Amount */}
                      {selectedMethod && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mb-6"
                        >
                          <label className="block text-sm text-aurex-platinum-400 mb-2">Сумма вывода (₽)</label>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            max={user?.balance || 0}
                            className="w-full px-4 py-4 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-2xl font-bold focus:border-aurex-gold-500/50 focus:outline-none focus:ring-1 focus:ring-aurex-gold-500/20"
                          />
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex gap-2">
                              {[1000, 3000, 5000, 10000].map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => setAmount(String(preset))}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    amount === String(preset)
                                      ? 'bg-aurex-gold-500/20 text-aurex-gold-400 border border-aurex-gold-500/50'
                                      : 'bg-aurex-obsidian-700 text-aurex-platinum-400 hover:bg-aurex-obsidian-600'
                                  }`}
                                >
                                  {preset >= 1000 ? `${preset / 1000}K` : preset} ₽
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => setAmount(String(Math.floor(user?.balance || 0)))}
                              className="text-sm text-aurex-gold-500 hover:text-aurex-gold-400 font-medium transition-colors"
                            >
                              Всё
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Summary */}
                      {selectedMethod && depositAmount > 0 && (() => {
                        const method = allMethods.find(m => m.id === selectedMethod);
                        const feePercent = (selectedMethod === 'P2P_CARD' || selectedMethod === 'P2P_SBP') ? 5 : 2;
                        const feeAmt = Math.round(depositAmount * feePercent) / 100;
                        const totalDeducted = depositAmount + feeAmt;
                        return (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-6 p-4 bg-aurex-obsidian-900/50 rounded-xl border border-aurex-gold-500/10 space-y-2"
                          >
                            <div className="flex justify-between text-sm">
                              <span className="text-aurex-platinum-400">Сумма вывода</span>
                              <span className="text-white font-medium">₽{depositAmount.toLocaleString('ru-RU')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-aurex-platinum-400">Комиссия ({feePercent}%)</span>
                              <span className="text-red-400 font-medium">-₽{feeAmt.toLocaleString('ru-RU')}</span>
                            </div>
                            <div className="border-t border-aurex-gold-500/20 pt-2 flex justify-between font-bold">
                              <span className="text-white">Спишется со счёта</span>
                              <span className="text-aurex-gold-500">₽{totalDeducted.toLocaleString('ru-RU')}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-aurex-platinum-500">Получите на {selectedMethod === 'P2P_CARD' ? 'карту' : selectedMethod === 'P2P_SBP' ? 'СБП' : 'кошелёк'}</span>
                              <span className="text-aurex-platinum-400">₽{depositAmount.toLocaleString('ru-RU')}</span>
                            </div>
                          </motion.div>
                        );
                      })()}

                      {/* Submit */}
                      <button
                        onClick={handleWithdraw}
                        disabled={
                          !selectedMethod ||
                          depositAmount <= 0 ||
                          isProcessing ||
                          (['P2P_CARD', 'NIRVANA_C2C', 'NIRVANA_TRANS_C2C', 'NIRVANA_SBER', 'NIRVANA_ALFA', 'NIRVANA_VTB', 'EXPAY_SBER', 'EXPAY_CARD'].includes(selectedMethod) && cardNumber.replace(/\s/g, '').length !== 16) ||
                          (['P2P_SBP', 'NIRVANA_SBP', 'NIRVANA_SBER_SBP', 'NIRVANA_ALFA_SBP', 'NIRVANA_VTB_SBP', 'NIRVANA_TRANS_SBP', 'EXPAY_SBP'].includes(selectedMethod) && phone.length !== 10) ||
                          (selectedMethod === 'P2P_SBP' && !bankCode) ||
                          ((selectedMethod === 'CRYPTO' || selectedMethod?.startsWith('CRYPTO_')) && !withdrawAddress) ||
                          (user?.wager?.active && (user.wager?.completed || 0) < (user.wager?.required || 0))
                        }
                        className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Обработка...</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-5 h-5" />
                            <span>Вывести {depositAmount > 0 ? `₽${depositAmount.toLocaleString('ru-RU')}` : ''}</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-center space-x-2 mt-4">
                        <Shield className="w-3.5 h-3.5 text-aurex-platinum-500" />
                        <p className="text-xs text-aurex-platinum-500">
                          Выводы обрабатываются автоматически от 1 до 24 часов
                        </p>
                      </div>
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
                                <div
                                  className="flex items-center gap-1 text-xs text-aurex-platinum-500 mt-1 cursor-pointer hover:text-aurex-gold-400 transition-colors group"
                                  onClick={() => {
                                    const txId = tx.transactionId || tx.id;
                                    navigator.clipboard.writeText(`#${txId}`);
                                    toast.success('ID транзакции скопирован', { duration: 1500 });
                                  }}
                                  title="Нажмите чтобы скопировать — передайте ID в поддержку"
                                >
                                  <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                                  <span className="font-mono">#{tx.transactionId || tx.id}</span>
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
                            if (data.data?.type === 'balance' || data.data?.type === 'fixed') {
                              updateUser({ balance: (user?.balance || 0) + credited });
                            } else if (data.data?.type === 'bonus') {
                              updateUser({ bonusBalance: (user?.bonusBalance || 0) + credited });
                            }
                            await refreshUser();
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
                      <span>Быстрые автоматические выплаты</span>
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
