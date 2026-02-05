import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  Search, 
  User, 
  DollarSign, 
  Plus, 
  Minus, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Copy,
  Crown,
  Wallet,
  Gift,
  History
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface FoundUser {
  _id: string;
  odid: string;
  username: string;
  email: string;
  balance: number;
  bonusBalance: number;
  vipLevel: number;
  isActive: boolean;
  createdAt: string;
}

interface BalanceHistory {
  id: string;
  type: string;
  amount: number;
  balanceType: string;
  reason: string;
  oldBalance: number;
  newBalance: number;
  timestamp: string;
  username: string;
}

export default function AdminBalancePage() {
  const { token } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [amount, setAmount] = useState('');
  const [operationType, setOperationType] = useState<'add' | 'subtract' | 'set'>('add');
  const [balanceType, setBalanceType] = useState<'balance' | 'bonusBalance'>('balance');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<BalanceHistory[]>([]);

  const searchUser = async () => {
    if (!searchQuery.trim()) {
      toast.error('Введите ID или имя пользователя');
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setFoundUser(data.data);
        toast.success(`Найден: ${data.data.username}`);
      } else {
        toast.error(data.error || 'Пользователь не найден');
        setFoundUser(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Ошибка поиска');
    }
    setIsSearching(false);
  };

  const updateBalance = async () => {
    if (!foundUser) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/users/${foundUser._id}/balance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountNum,
          type: operationType,
          balanceType,
          reason: reason || undefined
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        
        // Update local state
        setFoundUser(prev => prev ? {
          ...prev,
          [balanceType]: data.data.newBalance
        } : null);
        
        // Add to history
        setHistory(prev => [{
          id: Date.now().toString(),
          type: operationType,
          amount: amountNum,
          balanceType,
          reason: reason || 'Без комментария',
          oldBalance: data.data.oldBalance,
          newBalance: data.data.newBalance,
          timestamp: new Date().toISOString(),
          username: foundUser.username
        }, ...prev]);
        
        setAmount('');
        setReason('');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Update balance error:', error);
      toast.error('Ошибка обновления баланса');
    }
    setIsProcessing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано!');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU');
  };

  return (
    <AuthGuard>
      <Head>
        <title>Управление балансом - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Управление балансом</h1>
            <p className="text-aurex-platinum-400">Поиск пользователей и управление их балансом</p>
          </div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-aurex-gold-500" />
              Поиск пользователя
            </h2>
            
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                placeholder="Введите ODID, ID или имя пользователя..."
                className="flex-1 px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/30 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500 outline-none font-mono"
              />
              <button
                onClick={searchUser}
                disabled={isSearching}
                className="px-6 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSearching ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Найти
              </button>
            </div>
            
            <p className="text-sm text-aurex-platinum-500 mt-3">
              Пример: AUREX-U-000001, testuser, user@email.com
            </p>
          </motion.div>

          {/* Found User Card */}
          {foundUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 mb-6"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 flex items-center justify-center text-2xl font-black text-aurex-obsidian-900">
                      {foundUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-white">{foundUser.username}</h3>
                        <span className="px-2 py-0.5 bg-aurex-gold-500/20 text-aurex-gold-500 text-xs rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          VIP {foundUser.vipLevel}
                        </span>
                        {foundUser.isActive ? (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Active</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Inactive</span>
                        )}
                      </div>
                      <p className="text-aurex-platinum-400">{foundUser.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-aurex-gold-400 bg-aurex-obsidian-900 px-2 py-1 rounded text-sm">
                          {foundUser.odid}
                        </span>
                        <button 
                          onClick={() => copyToClipboard(foundUser.odid)}
                          className="text-aurex-gold-500 hover:text-aurex-gold-400"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Current Balances */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl border border-aurex-gold-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-aurex-gold-500" />
                        <span className="text-sm text-aurex-platinum-500">Основной баланс</span>
                      </div>
                      <div className="text-2xl font-black text-white">
                        ₽{(foundUser.balance || 0).toLocaleString('ru-RU')}
                      </div>
                    </div>
                    <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-purple-500" />
                        <span className="text-sm text-aurex-platinum-500">Бонусный баланс</span>
                      </div>
                      <div className="text-2xl font-black text-purple-400">
                        ₽{(foundUser.bonusBalance || 0).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Control */}
                <div className="lg:w-96 p-6 bg-aurex-obsidian-900/50 rounded-xl border border-aurex-gold-500/20">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-aurex-gold-500" />
                    Изменить баланс
                  </h4>

                  {/* Balance Type */}
                  <div className="mb-4">
                    <label className="block text-sm text-aurex-platinum-500 mb-2">Тип баланса</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBalanceType('balance')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                          balanceType === 'balance'
                            ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                            : 'bg-aurex-obsidian-800 text-aurex-platinum-400 border border-aurex-gold-500/30'
                        }`}
                      >
                        Основной
                      </button>
                      <button
                        onClick={() => setBalanceType('bonusBalance')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                          balanceType === 'bonusBalance'
                            ? 'bg-purple-500 text-white'
                            : 'bg-aurex-obsidian-800 text-aurex-platinum-400 border border-purple-500/30'
                        }`}
                      >
                        Бонусный
                      </button>
                    </div>
                  </div>

                  {/* Operation Type */}
                  <div className="mb-4">
                    <label className="block text-sm text-aurex-platinum-500 mb-2">Операция</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOperationType('add')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
                          operationType === 'add'
                            ? 'bg-green-500 text-white'
                            : 'bg-aurex-obsidian-800 text-aurex-platinum-400 border border-green-500/30'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Добавить
                      </button>
                      <button
                        onClick={() => setOperationType('subtract')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
                          operationType === 'subtract'
                            ? 'bg-red-500 text-white'
                            : 'bg-aurex-obsidian-800 text-aurex-platinum-400 border border-red-500/30'
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                        Списать
                      </button>
                      <button
                        onClick={() => setOperationType('set')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
                          operationType === 'set'
                            ? 'bg-blue-500 text-white'
                            : 'bg-aurex-obsidian-800 text-aurex-platinum-400 border border-blue-500/30'
                        }`}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Установить
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <label className="block text-sm text-aurex-platinum-500 mb-2">Сумма (₽)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-xl text-white text-xl font-bold placeholder-aurex-platinum-600 focus:border-aurex-gold-500 outline-none"
                    />
                  </div>

                  {/* Reason */}
                  <div className="mb-4">
                    <label className="block text-sm text-aurex-platinum-500 mb-2">Причина (опционально)</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Комментарий к операции..."
                      className="w-full px-4 py-2 bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-xl text-white placeholder-aurex-platinum-600 focus:border-aurex-gold-500 outline-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={updateBalance}
                    disabled={isProcessing || !amount}
                    className={`w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      operationType === 'add' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                        : operationType === 'subtract'
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    {operationType === 'add' ? 'Пополнить' : operationType === 'subtract' ? 'Списать' : 'Установить'} баланс
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* History */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-aurex-gold-500" />
                История операций (эта сессия)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-aurex-platinum-500 text-sm">
                      <th className="pb-3 font-medium">Время</th>
                      <th className="pb-3 font-medium">Пользователь</th>
                      <th className="pb-3 font-medium">Операция</th>
                      <th className="pb-3 font-medium">Тип</th>
                      <th className="pb-3 font-medium text-right">Было</th>
                      <th className="pb-3 font-medium text-right">Изменение</th>
                      <th className="pb-3 font-medium text-right">Стало</th>
                      <th className="pb-3 font-medium">Причина</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-aurex-gold-500/10">
                    {(history || []).map(item => (
                      <tr key={item.id} className="text-white">
                        <td className="py-3 text-sm text-aurex-platinum-400">{formatDate(item.timestamp)}</td>
                        <td className="py-3 font-medium">{item.username}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            item.type === 'add' ? 'bg-green-500/20 text-green-400' :
                            item.type === 'subtract' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {item.type === 'add' ? 'Пополнение' : item.type === 'subtract' ? 'Списание' : 'Установка'}
                          </span>
                        </td>
                        <td className="py-3 text-sm">
                          <span className={item.balanceType === 'bonusBalance' ? 'text-purple-400' : 'text-aurex-gold-500'}>
                            {item.balanceType === 'bonusBalance' ? 'Бонусный' : 'Основной'}
                          </span>
                        </td>
                        <td className="py-3 text-right text-aurex-platinum-400">₽{item.oldBalance.toLocaleString('ru-RU')}</td>
                        <td className={`py-3 text-right font-bold ${
                          item.newBalance > item.oldBalance ? 'text-green-400' : 
                          item.newBalance < item.oldBalance ? 'text-red-400' : 'text-aurex-platinum-400'
                        }`}>
                          {item.newBalance > item.oldBalance ? '+' : ''}{(item.newBalance - item.oldBalance).toLocaleString('ru-RU')}
                        </td>
                        <td className="py-3 text-right font-bold text-white">₽{item.newBalance.toLocaleString('ru-RU')}</td>
                        <td className="py-3 text-sm text-aurex-platinum-500 max-w-[200px] truncate">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Quick Tips */}
          <div className="mt-6 p-4 bg-aurex-obsidian-800/50 border border-aurex-gold-500/20 rounded-xl">
            <h4 className="font-medium text-aurex-gold-500 mb-2">Подсказки:</h4>
            <ul className="text-sm text-aurex-platinum-500 space-y-1">
              <li>• Для поиска используйте ODID игрока (виден в профиле клиента)</li>
              <li>• Все операции логируются и видны в истории транзакций</li>
              <li>• Бонусный баланс имеет вейджер и не может быть выведен напрямую</li>
            </ul>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
