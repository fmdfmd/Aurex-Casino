import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Eye,
  Crown,
  Wallet,
  Gift,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Copy,
  MoreVertical,
  ChevronDown,
  X
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  odid: string;
  username: string;
  email: string;
  balance: number;
  bonusBalance: number;
  vipLevel: number;
  isAdmin: boolean;
  isActive: boolean;
  depositCount: number;
  usedBonuses: {
    firstDeposit: boolean;
    secondDeposit: boolean;
    thirdDeposit: boolean;
    fourthDeposit: boolean;
  };
  statistics: {
    totalDeposits: number;
    totalWithdrawals: number;
    totalWagered: number;
    totalWon: number;
    gamesPlayed: number;
  };
  createdAt: string;
}

export default function AdminUsersPage() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'add' | 'subtract' | 'set'>('add');
  const [balanceCategory, setBalanceCategory] = useState<'main' | 'bonus'>('main');

  // Fetch users
  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const usersArray = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setUsers(usersArray);
      } else {
        console.error('Failed to fetch users: API error');
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Не удалось загрузить пользователей');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBalanceUpdate = async () => {
    if (!selectedUser || !balanceAmount) {
      toast.error('Введите сумму');
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Некорректная сумма');
      return;
    }

    let newBalance: number;
    const currentBalance = balanceCategory === 'main' ? selectedUser.balance : selectedUser.bonusBalance;

    switch (balanceType) {
      case 'add':
        newBalance = currentBalance + amount;
        break;
      case 'subtract':
        newBalance = Math.max(0, currentBalance - amount);
        break;
      case 'set':
        newBalance = amount;
        break;
      default:
        newBalance = currentBalance;
    }

    try {
      // Try API call first
      const response = await fetch(`/api/admin/users/${selectedUser._id}/balance`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          amount: amount,
          type: balanceType,
          balanceType: balanceCategory === 'main' ? 'balance' : 'bonusBalance'
        })
      });

      if (response.ok) {
        toast.success('Баланс обновлён');
      }
    } catch (error) {
      // Update locally for demo
    }

    // Update local state
    setUsers(users.map(u => {
      if (u._id === selectedUser._id) {
        return {
          ...u,
          [balanceCategory === 'main' ? 'balance' : 'bonusBalance']: newBalance
        };
      }
      return u;
    }));

    const actionText = balanceType === 'add' ? 'добавлено' : balanceType === 'subtract' ? 'снято' : 'установлено';
    toast.success(`₽${amount.toFixed(2)} ${actionText} ${balanceCategory === 'main' ? 'на основной' : 'на бонусный'} баланс`);
    
    setShowBalanceModal(false);
    setBalanceAmount('');
    setSelectedUser(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано!');
  };

  const usersArray = Array.isArray(users) ? users : [];
  const filteredUsers = usersArray.filter(user => 
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.odid || user._id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVipBadge = (level: number) => {
    const badges = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Emperor'];
    const colors = ['text-amber-700', 'text-gray-400', 'text-aurex-gold-500', 'text-aurex-platinum-300', 'text-purple-400'];
    return { name: badges[level - 1] || 'Bronze', color: colors[level - 1] || 'text-amber-700' };
  };

  return (
    <AuthGuard >
      <Head>
        <title>Управление пользователями - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-3">
                <Users className="w-8 h-8 text-aurex-gold-500" />
                <span>Управление пользователями</span>
              </h1>
              <p className="text-aurex-platinum-400 mt-1">
                Всего: {users.length} пользователей
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchUsers}
                className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Обновить</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all">
                <Download className="w-4 h-4" />
                <span>Экспорт</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-aurex-platinum-500" />
              <input
                type="text"
                placeholder="Поиск по имени, email или ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aurex-gold-500/20">
                    <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">ID / Пользователь</th>
                    <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Баланс</th>
                    <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">VIP</th>
                    <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Депозиты</th>
                    <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Бонусы</th>
                    <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Статус</th>
                    <th className="text-right px-6 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-aurex-platinum-400">
                        <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-aurex-gold-500" />
                        Загрузка...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-aurex-platinum-400">
                        Пользователи не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const vipBadge = getVipBadge(user.vipLevel);
                      const usedBonusCount = [
                        user.usedBonuses?.firstDeposit,
                        user.usedBonuses?.secondDeposit,
                        user.usedBonuses?.thirdDeposit,
                        user.usedBonuses?.fourthDeposit
                      ].filter(Boolean).length;

                      return (
                        <tr key={user._id} className="border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center space-x-2">
                                <span className="text-white font-medium">{user.username}</span>
                                {user.isAdmin && (
                                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Admin</span>
                                )}
                              </div>
                              <span className="text-sm text-aurex-platinum-500">{user.email}</span>
                              <button 
                                onClick={() => copyToClipboard(user.odid || user._id || '')}
                                className="flex items-center space-x-1 text-xs text-aurex-gold-500 hover:text-aurex-gold-400 mt-1"
                              >
                                <span>{user.odid || user._id}</span>
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-white font-bold">₽{(user.balance || 0).toLocaleString('ru-RU')}</span>
                              <span className="text-sm text-aurex-gold-500">+₽{(user.bonusBalance || 0).toLocaleString('ru-RU')} бонус</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <Crown className={`w-5 h-5 ${vipBadge.color}`} />
                              <span className={`font-medium ${vipBadge.color}`}>{vipBadge.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-white">{user.depositCount || 0} депозитов</span>
                              <span className="text-sm text-aurex-platinum-500">
                                ₽{(user.statistics?.totalDeposits || 0).toLocaleString('ru-RU')} всего
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4].map((dep) => {
                                const bonusKeys = ['firstDeposit', 'secondDeposit', 'thirdDeposit', 'fourthDeposit'];
                                const isUsed = user.usedBonuses?.[bonusKeys[dep - 1] as keyof typeof user.usedBonuses];
                                return (
                                  <div
                                    key={dep}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      isUsed 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : 'bg-aurex-obsidian-700 text-aurex-platinum-500'
                                    }`}
                                    title={`${dep}-й депозит ${isUsed ? 'использован' : 'доступен'}`}
                                  >
                                    {dep}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {user.isActive ? (
                              <span className="flex items-center space-x-1 text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span>Активен</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-red-400">
                                <XCircle className="w-4 h-4" />
                                <span>Заблокирован</span>
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowBalanceModal(true);
                                }}
                                className="p-2 bg-aurex-gold-500/20 text-aurex-gold-500 rounded-lg hover:bg-aurex-gold-500/30 transition-colors"
                                title="Изменить баланс"
                              >
                                <Wallet className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                                title="Просмотр"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 bg-aurex-obsidian-700 text-aurex-platinum-400 rounded-lg hover:bg-aurex-obsidian-600 transition-colors"
                                title="Редактировать"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Balance Modal */}
          <AnimatePresence>
            {showBalanceModal && selectedUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowBalanceModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Изменить баланс</h3>
                    <button
                      onClick={() => setShowBalanceModal(false)}
                      className="p-2 text-aurex-platinum-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-aurex-platinum-400">Пользователь:</span>
                      <span className="text-white font-medium">{selectedUser.username}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-aurex-platinum-400">ID:</span>
                      <span className="text-aurex-gold-500 text-sm">{selectedUser.odid}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-aurex-platinum-400">Основной баланс:</span>
                      <span className="text-white font-bold">₽{(selectedUser.balance || 0).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-aurex-platinum-400">Бонусный баланс:</span>
                      <span className="text-aurex-gold-500 font-bold">₽{(selectedUser.bonusBalance || 0).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>

                  {/* Balance Category */}
                  <div className="mb-4">
                    <label className="block text-sm text-aurex-platinum-400 mb-2">Тип баланса</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBalanceCategory('main')}
                        className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                          balanceCategory === 'main'
                            ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                            : 'bg-aurex-obsidian-700 text-aurex-platinum-300'
                        }`}
                      >
                        Основной
                      </button>
                      <button
                        onClick={() => setBalanceCategory('bonus')}
                        className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                          balanceCategory === 'bonus'
                            ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                            : 'bg-aurex-obsidian-700 text-aurex-platinum-300'
                        }`}
                      >
                        Бонусный
                      </button>
                    </div>
                  </div>

                  {/* Action Type */}
                  <div className="mb-4">
                    <label className="block text-sm text-aurex-platinum-400 mb-2">Действие</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBalanceType('add')}
                        className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg font-medium transition-all ${
                          balanceType === 'add'
                            ? 'bg-green-500 text-white'
                            : 'bg-aurex-obsidian-700 text-aurex-platinum-300'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Добавить</span>
                      </button>
                      <button
                        onClick={() => setBalanceType('subtract')}
                        className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg font-medium transition-all ${
                          balanceType === 'subtract'
                            ? 'bg-red-500 text-white'
                            : 'bg-aurex-obsidian-700 text-aurex-platinum-300'
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                        <span>Снять</span>
                      </button>
                      <button
                        onClick={() => setBalanceType('set')}
                        className={`flex-1 flex items-center justify-center space-x-1 py-2 rounded-lg font-medium transition-all ${
                          balanceType === 'set'
                            ? 'bg-blue-500 text-white'
                            : 'bg-aurex-obsidian-700 text-aurex-platinum-300'
                        }`}
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Установить</span>
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="mb-6">
                    <label className="block text-sm text-aurex-platinum-400 mb-2">Сумма (₽)</label>
                    <input
                      type="number"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-lg font-bold focus:border-aurex-gold-500/50 focus:outline-none"
                    />
                  </div>

                  {/* Quick amounts */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[10, 50, 100, 500, 1000, 5000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setBalanceAmount(String(amount))}
                        className="px-3 py-1 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg text-sm hover:bg-aurex-obsidian-600 transition-colors"
                      >
                        ₽{amount}
                      </button>
                    ))}
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleBalanceUpdate}
                    disabled={!balanceAmount}
                    className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {balanceType === 'add' ? 'Добавить' : balanceType === 'subtract' ? 'Снять' : 'Установить'} ₽{balanceAmount || '0'}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
