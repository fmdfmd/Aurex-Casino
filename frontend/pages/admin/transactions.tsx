import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  Wallet,
  Calendar
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  odid: string;
  username: string;
  email: string;
  type: 'deposit' | 'withdrawal' | 'bonus' | 'bet' | 'win';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  method: string;
  walletAddress?: string;
  createdAt: string;
  processedAt?: string;
}

export default function AdminTransactionsPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [totalCount, setTotalCount] = useState(0);

  // Read type from URL query param on mount
  useEffect(() => {
    if (router.isReady) {
      const typeFromUrl = router.query.type as string;
      if (typeFromUrl && typeFromUrl !== 'all') {
        setFilterType(typeFromUrl);
      }
    }
  }, [router.isReady, router.query.type]);

  // Re-fetch when filterType changes (server-side filtering)
  useEffect(() => {
    if (token) fetchTransactions(filterType, filterStatus);
  }, [filterType, filterStatus, token]);

  const fetchTransactions = async (type = 'all', status = 'all') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (type && type !== 'all') params.set('type', type);
      if (status && status !== 'all') params.set('status', status);

      const res = await fetch(`/api/admin/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      const txList = Array.isArray(data.data) ? data.data : (data.data?.transactions || []);
      setTotalCount(data.total || txList.length);
      if (data.success) {
        setTransactions(txList.map((t: any) => ({
          id: t.id || t._id,
          odid: t.odid || t.userOdid || 'N/A',
          username: t.username || t.user?.username || 'Unknown',
          email: t.email || t.user?.email || '',
          type: t.type,
          amount: Math.abs(t.amount),
          status: t.status,
          method: t.paymentMethod || t.method || t.description || 'N/A',
          walletAddress: t.externalRef || t.walletAddress || t.wallet_address,
          createdAt: t.createdAt || t.created_at,
          processedAt: t.processedAt || t.processed_at
        })));
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
    }
    setIsLoading(false);
  };

  const handleApprove = async (txId: string) => {
    try {
      const res = await fetch(`/api/admin/transactions/${txId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTransactions(prev => prev.map(tx =>
        tx.id === txId ? { ...tx, status: 'completed', processedAt: new Date().toISOString() } : tx
      ));
      toast.success('Транзакция одобрена');
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`);
    }
  };

  const handleReject = async (txId: string) => {
    try {
      const res = await fetch(`/api/admin/transactions/${txId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setTransactions(prev => prev.map(tx =>
        tx.id === txId ? { ...tx, status: 'failed' } : tx
      ));
      toast.success('Транзакция отклонена, баланс возвращён');
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs"><CheckCircle className="w-3 h-3" /><span>Выполнен</span></span>;
      case 'pending':
        return <span className="flex items-center space-x-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs"><Clock className="w-3 h-3" /><span>Ожидает</span></span>;
      case 'failed':
        return <span className="flex items-center space-x-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs"><XCircle className="w-3 h-3" /><span>Отклонён</span></span>;
      case 'cancelled':
        return <span className="flex items-center space-x-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs"><X className="w-3 h-3" /><span>Отменён</span></span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'withdrawal':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'bonus':
        return <Gift className="w-5 h-5 text-aurex-gold-500" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'deposit': return 'Депозит';
      case 'withdrawal': return 'Вывод';
      case 'bonus': return 'Бонус';
      case 'bet': return 'Ставка';
      case 'win': return 'Выигрыш';
      default: return type;
    }
  };

  // Filtering is done server-side for type/status; only search is done client-side
  const filteredTransactions = (transactions || []).filter(tx => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      tx.username.toLowerCase().includes(q) ||
      tx.odid.toLowerCase().includes(q) ||
      tx.email.toLowerCase().includes(q) ||
      String(tx.id).includes(q) ||
      (tx.walletAddress || '').toLowerCase().includes(q)
    );
  });

  const pendingWithdrawals = (transactions || []).filter(tx => tx.type === 'withdrawal' && tx.status === 'pending');

  return (
    <AuthGuard >
      <Head>
        <title>Транзакции - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-3">
                <Wallet className="w-8 h-8 text-aurex-gold-500" />
                <span>Транзакции</span>
              </h1>
              <p className="text-aurex-platinum-400 mt-1">
                Всего: {totalCount} • Ожидают: {pendingWithdrawals.length}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => fetchTransactions(filterType, filterStatus)}
                className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Обновить</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all">
                <Download className="w-4 h-4" />
                <span>Экспорт</span>
              </button>
            </div>
          </div>

          {/* Pending Withdrawals Alert */}
          {pendingWithdrawals.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-yellow-500" />
                <div>
                  <div className="text-yellow-400 font-bold">{pendingWithdrawals.length} выводов ожидают проверки</div>
                  <div className="text-sm text-yellow-300/80">
                    На сумму ₽{pendingWithdrawals.reduce((sum, tx) => sum + tx.amount, 0).toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-aurex-platinum-500" />
              <input
                type="text"
                placeholder="Поиск по #ID, имени, email, AUREX-ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
            >
              <option value="all">Все типы</option>
              <option value="deposit">Депозиты</option>
              <option value="withdrawal">Выводы</option>
              <option value="bonus">Бонусы</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="completed">Выполнен</option>
              <option value="failed">Отклонён</option>
            </select>
          </div>

          {/* Transactions Table */}
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aurex-gold-500/20">
                    <th className="text-left px-3 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">#ID</th>
                    <th className="text-left px-3 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Пользователь</th>
                    <th className="text-left px-3 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Сумма</th>
                    <th className="text-left px-3 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Метод / Реквизит</th>
                    <th className="text-left px-3 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Статус</th>
                    <th className="text-left px-3 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Дата</th>
                    <th className="text-left px-3 py-4 text-xs uppercase tracking-wider text-aurex-platinum-500">Действия</th>
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
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-aurex-platinum-400">
                        Транзакции не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50 transition-colors">
                        <td className="px-3 py-4">
                          <span className="font-mono text-aurex-gold-400 text-sm">#{tx.id}</span>
                        </td>
                        <td className="px-3 py-4">
                          <div>
                            <div className="text-white font-medium text-sm">{tx.username}</div>
                            <div className="text-xs text-aurex-gold-500">{tx.odid}</div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <span className={`font-bold ${tx.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>
                            {tx.type === 'withdrawal' ? '-' : '+'}₽{tx.amount.toLocaleString('ru-RU')}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div>
                            <div className="text-white text-sm">{tx.method}</div>
                            {tx.walletAddress && (
                              <div className="text-xs text-aurex-platinum-500 font-mono">{tx.walletAddress}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          {getStatusBadge(tx.status)}
                        </td>
                        <td className="px-3 py-4">
                          <div className="text-xs text-aurex-platinum-400">
                            {new Date(tx.createdAt).toLocaleString('ru-RU', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center space-x-2">
                            {tx.status === 'pending' && tx.type === 'withdrawal' && (
                              <>
                                <button
                                  onClick={() => handleApprove(tx.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-xs font-medium"
                                  title="Одобрить и отправить в платёжку"
                                >
                                  <Check className="w-3 h-3" />
                                  Выплатить
                                </button>
                                <button
                                  onClick={() => handleReject(tx.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs font-medium"
                                  title="Отклонить и вернуть деньги"
                                >
                                  <X className="w-3 h-3" />
                                  Отменить
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
