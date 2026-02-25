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
  id: number;
  odid: string;
  username: string;
  email: string;
  phone: string;
  balance: number;
  bonusBalance: number;
  vipLevel: number;
  vipPoints: number;
  isVerified: boolean;
  isAdmin: boolean;
  isActive: boolean;
  referralCode: string;
  referredBy: string;
  customReferralPercent: number | null;
  depositCount: number;
  lastLogin: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const PAGE_SIZE = 50;
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'add' | 'subtract' | 'set'>('add');
  const [balanceCategory, setBalanceCategory] = useState<'main' | 'bonus'>('main');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    isActive: true,
    isAdmin: false,
    vipLevel: 1,
    customReferralPercent: '' as string
  });
  const [editLoading, setEditLoading] = useState(false);

  // Fetch users
  useEffect(() => {
    if (token) {
      fetchUsers(currentPage);
    }
  }, [token, currentPage]);

  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (searchTerm) params.set('search', searchTerm);
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const usersArray = data.data?.users || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
        const total = data.data?.pagination?.total || data.data?.total || usersArray.length;
        const pages = data.data?.pagination?.pages || Math.max(1, Math.ceil(total / PAGE_SIZE));
        setUsers(usersArray);
        setTotalUsers(total);
        setTotalPages(pages);
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
      const response = await fetch(`/api/admin/users/${selectedUser.id}/balance`, {
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

      const data = await response.json();
      if (data.success) {
        const actionText = balanceType === 'add' ? 'добавлено' : balanceType === 'subtract' ? 'снято' : 'установлено';
        toast.success(`₽${amount.toFixed(2)} ${actionText} ${balanceCategory === 'main' ? 'на основной' : 'на бонусный'} баланс`);
        setShowBalanceModal(false);
        setBalanceAmount('');
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Ошибка обновления баланса');
      }
    } catch (error) {
      toast.error('Ошибка сервера при обновлении баланса');
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      vipLevel: user.vipLevel || 1,
      customReferralPercent: user.customReferralPercent != null ? String(user.customReferralPercent) : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;
    setEditLoading(true);
    try {
      const body: any = {
        isActive: editForm.isActive,
        isAdmin: editForm.isAdmin,
        vipLevel: editForm.vipLevel
      };
      if (editForm.customReferralPercent === '') {
        body.customReferralPercent = null;
      } else {
        const pct = parseFloat(editForm.customReferralPercent);
        if (!isNaN(pct) && pct >= 0 && pct <= 100) {
          body.customReferralPercent = pct;
        }
      }

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Пользователь обновлён');
        setShowEditModal(false);
        fetchUsers();
      } else {
        toast.error(data.error || 'Ошибка обновления');
      }
    } catch {
      toast.error('Ошибка сервера');
    } finally {
      setEditLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано!');
  };

  const usersArray = Array.isArray(users) ? users : [];
  const filteredUsers = usersArray.filter(user => 
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.odid || String(user.id) || '').toLowerCase().includes(searchTerm.toLowerCase())
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
                Всего: {totalUsers} пользователей · Страница {currentPage} из {totalPages}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => fetchUsers(currentPage)}
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
                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); fetchUsers(1); } }}
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

                      return (
                        <tr key={user.id} className="border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50 transition-colors">
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
                                onClick={() => copyToClipboard(user.odid || String(user.id))}
                                className="flex items-center space-x-1 text-xs text-aurex-gold-500 hover:text-aurex-gold-400 mt-1"
                              >
                                <span>{user.odid || `#${user.id}`}</span>
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
                            <span className="text-white">{user.depositCount || 0}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-aurex-gold-500 font-medium">
                              ₽{(user.bonusBalance || 0).toLocaleString('ru-RU')}
                            </span>
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
                                onClick={() => handleViewUser(user)}
                                className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                                title="Просмотр"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-aurex-obsidian-800 border border-aurex-gold-500/20 text-aurex-platinum-300 disabled:opacity-40 hover:border-aurex-gold-500/50 transition-all text-sm"
              >
                «
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg bg-aurex-obsidian-800 border border-aurex-gold-500/20 text-aurex-platinum-300 disabled:opacity-40 hover:border-aurex-gold-500/50 transition-all text-sm"
              >
                ‹ Назад
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} className="px-2 text-aurex-platinum-500">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        currentPage === p
                          ? 'bg-aurex-gold-500 text-aurex-obsidian-900 border-aurex-gold-500 font-bold'
                          : 'bg-aurex-obsidian-800 border-aurex-gold-500/20 text-aurex-platinum-300 hover:border-aurex-gold-500/50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-aurex-obsidian-800 border border-aurex-gold-500/20 text-aurex-platinum-300 disabled:opacity-40 hover:border-aurex-gold-500/50 transition-all text-sm"
              >
                Вперёд ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg bg-aurex-obsidian-800 border border-aurex-gold-500/20 text-aurex-platinum-300 disabled:opacity-40 hover:border-aurex-gold-500/50 transition-all text-sm"
              >
                »
              </button>
            </div>
          )}

          {/* View User Modal */}
          <AnimatePresence>
            {showViewModal && selectedUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowViewModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                      <Eye className="w-5 h-5 text-blue-400" />
                      <span>Информация о пользователе</span>
                    </h3>
                    <button onClick={() => setShowViewModal(false)} className="p-2 text-aurex-platinum-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'ID', value: `#${selectedUser.id}` },
                      { label: 'ODID', value: selectedUser.odid },
                      { label: 'Логин', value: selectedUser.username },
                      { label: 'Email', value: selectedUser.email || '—' },
                      { label: 'Телефон', value: selectedUser.phone || '—' },
                      { label: 'Основной баланс', value: `₽${(selectedUser.balance || 0).toLocaleString('ru-RU')}` },
                      { label: 'Бонусный баланс', value: `₽${(selectedUser.bonusBalance || 0).toLocaleString('ru-RU')}` },
                      { label: 'VIP уровень', value: getVipBadge(selectedUser.vipLevel).name },
                      { label: 'Депозитов', value: String(selectedUser.depositCount || 0) },
                      { label: 'Реферальный код', value: selectedUser.referralCode || '—' },
                      { label: 'Приглашён (referred_by)', value: selectedUser.referredBy || '—' },
                      { label: 'Реф. процент', value: selectedUser.customReferralPercent != null ? `${selectedUser.customReferralPercent}% (кастом)` : 'По умолчанию (5%)' },
                      { label: 'Статус', value: selectedUser.isActive ? 'Активен' : 'Заблокирован' },
                      { label: 'Администратор', value: selectedUser.isAdmin ? 'Да' : 'Нет' },
                      { label: 'Последний вход', value: selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString('ru-RU') : '—' },
                      { label: 'Регистрация', value: selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString('ru-RU') : '—' },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b border-aurex-obsidian-700/50 last:border-0">
                        <span className="text-aurex-platinum-400 text-sm">{row.label}</span>
                        <span className="text-white font-medium text-sm">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => { setShowViewModal(false); handleEditUser(selectedUser); }}
                      className="flex-1 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => { setShowViewModal(false); setShowBalanceModal(true); }}
                      className="flex-1 py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 font-bold rounded-xl border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all"
                    >
                      Изменить баланс
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit User Modal */}
          <AnimatePresence>
            {showEditModal && selectedUser && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowEditModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 w-full max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                      <Edit2 className="w-5 h-5 text-aurex-gold-500" />
                      <span>Редактировать: {selectedUser.username}</span>
                    </h3>
                    <button onClick={() => setShowEditModal(false)} className="p-2 text-aurex-platinum-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="space-y-5">
                    {/* Status */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Статус аккаунта</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditForm(f => ({ ...f, isActive: true }))}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${editForm.isActive ? 'bg-green-500 text-white' : 'bg-aurex-obsidian-700 text-aurex-platinum-300'}`}
                        >
                          Активен
                        </button>
                        <button
                          onClick={() => setEditForm(f => ({ ...f, isActive: false }))}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${!editForm.isActive ? 'bg-red-500 text-white' : 'bg-aurex-obsidian-700 text-aurex-platinum-300'}`}
                        >
                          Заблокирован
                        </button>
                      </div>
                    </div>

                    {/* Admin */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Права администратора</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditForm(f => ({ ...f, isAdmin: false }))}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${!editForm.isAdmin ? 'bg-aurex-gold-500 text-aurex-obsidian-900' : 'bg-aurex-obsidian-700 text-aurex-platinum-300'}`}
                        >
                          Пользователь
                        </button>
                        <button
                          onClick={() => setEditForm(f => ({ ...f, isAdmin: true }))}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${editForm.isAdmin ? 'bg-red-500 text-white' : 'bg-aurex-obsidian-700 text-aurex-platinum-300'}`}
                        >
                          Администратор
                        </button>
                      </div>
                    </div>

                    {/* VIP Level */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">VIP уровень</label>
                      <select
                        value={editForm.vipLevel}
                        onChange={(e) => setEditForm(f => ({ ...f, vipLevel: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                      >
                        <option value={1}>Bronze (1)</option>
                        <option value={2}>Silver (2)</option>
                        <option value={3}>Gold (3)</option>
                        <option value={4}>Platinum (4)</option>
                        <option value={5}>Emperor (5)</option>
                      </select>
                    </div>

                    {/* Custom Referral Percent */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">
                        Реферальный процент от GGR
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={editForm.customReferralPercent}
                          onChange={(e) => setEditForm(f => ({ ...f, customReferralPercent: e.target.value }))}
                          placeholder="По умолчанию (5%)"
                          min="0"
                          max="100"
                          step="0.5"
                          className="flex-1 px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-600 focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                        <span className="text-aurex-platinum-400 text-lg">%</span>
                      </div>
                      <p className="text-xs text-aurex-platinum-500 mt-1">
                        Оставьте пустым для стандартного процента. Для блогеров/стриммеров — ставьте выше.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleEditSubmit}
                    disabled={editLoading}
                    className="w-full mt-6 py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50"
                  >
                    {editLoading ? 'Сохраняем...' : 'Сохранить изменения'}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
