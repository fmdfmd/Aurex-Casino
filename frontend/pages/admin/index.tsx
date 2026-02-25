import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Crown,
  Gift,
  Gamepad2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  DollarSign,
  Activity,
  PieChart,
  BarChart3
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';

interface DashboardStats {
  users: {
    total: number;
    today: number;
    active: number;
  };
  finance: {
    totalDeposits: number;
    todayDeposits: number;
    totalWithdrawals: number;
    todayWithdrawals: number;
    pendingWithdrawals: number;
    revenue: number;
  };
  games: {
    totalSessions: number;
    activeSessions: number;
    todaySessions: number;
  };
  bonuses: {
    totalIssued: number;
    activeWagers: number;
  };
}

interface RecentTransaction {
  id: string;
  odid: string;
  username: string;
  type: 'deposit' | 'withdrawal' | 'bonus';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  method: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    users: { total: 0, today: 0, active: 0 },
    finance: { totalDeposits: 0, todayDeposits: 0, totalWithdrawals: 0, todayWithdrawals: 0, pendingWithdrawals: 0, revenue: 0 },
    games: { totalSessions: 0, activeSessions: 0, todaySessions: 0 },
    bonuses: { totalIssued: 0, activeWagers: 0 }
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch dashboard stats from API
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setStats({
          users: { 
            total: data.data.users?.total || 0, 
            today: data.data.users?.today || 0, 
            active: data.data.users?.active || 0 
          },
          finance: { 
            totalDeposits: data.data.finance?.totalDeposits || 0, 
            todayDeposits: data.data.finance?.todayDeposits || 0, 
            totalWithdrawals: data.data.finance?.totalWithdrawals || 0, 
            todayWithdrawals: data.data.finance?.todayWithdrawals || 0,
            pendingWithdrawals: data.data.finance?.pendingWithdrawals || 0,
            revenue: data.data.finance?.revenue || 0
          },
          games: { 
            totalSessions: data.data.games?.totalSessions || 0, 
            activeSessions: data.data.games?.activeSessions || 0, 
            todaySessions: data.data.games?.todaySessions || 0 
          },
          bonuses: { 
            totalIssued: data.data.bonuses?.activeAmount || data.data.bonuses?.totalIssued || 0, 
            activeWagers: data.data.bonuses?.activeCount || data.data.bonuses?.activeWagers || 0 
          }
        });

        // Set recent transactions if available
        if (data.data.recentTransactions) {
          setRecentTransactions((data.data.recentTransactions || []).map((t: any) => ({
            id: t.id || t._id,
            odid: t.odid || t.userOdid || 'N/A',
            username: t.username || t.user?.username || 'Unknown',
            type: t.type,
            amount: t.amount,
            status: t.status,
            method: t.method || t.description || 'N/A',
            createdAt: t.createdAt
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Пустые данные при ошибке - не используем моки
    }

    setIsLoading(false);
  };

  const statCards = [
    {
      title: 'Всего пользователей',
      value: stats.users.total.toLocaleString('ru-RU'),
      subtitle: `+${stats.users.today} сегодня`,
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-indigo-600',
      link: '/admin/users'
    },
    {
      title: 'Депозиты сегодня',
      value: `₽${stats.finance.todayDeposits.toLocaleString('ru-RU')}`,
      subtitle: `Всего: ₽${stats.finance.totalDeposits.toLocaleString('ru-RU')}`,
      icon: <ArrowDownLeft className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-600',
    },
    {
      title: 'Выводы на рассмотрении',
      value: `₽${stats.finance.pendingWithdrawals.toLocaleString('ru-RU')}`,
      subtitle: `Сегодня: ₽${stats.finance.todayWithdrawals.toLocaleString('ru-RU')}`,
      icon: <ArrowUpRight className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      link: '/admin/withdrawals'
    },
    {
      title: 'Чистая прибыль',
      value: `₽${stats.finance.revenue.toLocaleString('ru-RU')}`,
      subtitle: 'Депозиты - Выводы',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-aurex-gold-500 to-amber-600',
    },
    {
      title: 'Активные игроки',
      value: stats.users.active.toString(),
      subtitle: `${stats.games.activeSessions} сессий`,
      icon: <Activity className="w-6 h-6" />,
      color: 'from-purple-500 to-violet-600'
    },
    {
      title: 'Игровые сессии',
      value: stats.games.todaySessions.toLocaleString('ru-RU'),
      subtitle: `Всего: ${stats.games.totalSessions.toLocaleString('ru-RU')}`,
      icon: <Gamepad2 className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-600'
    },
    {
      title: 'Выдано бонусов',
      value: `₽${stats.bonuses.totalIssued.toLocaleString('ru-RU')}`,
      subtitle: `${stats.bonuses.activeWagers} активных вейджеров`,
      icon: <Gift className="w-6 h-6" />,
      color: 'from-pink-500 to-rose-600'
    },
    {
      title: 'VIP игроки',
      value: (stats as any).vipPlayers?.toString() || '0',
      subtitle: 'Gold и выше',
      icon: <Crown className="w-6 h-6" />,
      color: 'from-aurex-gold-500 to-yellow-600'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center space-x-1 text-green-400"><CheckCircle className="w-4 h-4" /><span>Выполнен</span></span>;
      case 'pending':
        return <span className="flex items-center space-x-1 text-yellow-400"><Clock className="w-4 h-4" /><span>Ожидает</span></span>;
      case 'failed':
        return <span className="flex items-center space-x-1 text-red-400"><XCircle className="w-4 h-4" /><span>Отклонён</span></span>;
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

  return (
    <AuthGuard >
      <Head>
        <title>Empire Control Center - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-3">
                <LayoutDashboard className="w-8 h-8 text-aurex-gold-500" />
                <span>Empire Control Center</span>
              </h1>
              <p className="text-aurex-platinum-400 mt-1">
                Обзор платформы AUREX
              </p>
            </div>
            
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative group"
              >
                {card.link ? (
                  <Link href={card.link} className="block">
                    <div className={`p-5 bg-gradient-to-br ${card.color} rounded-2xl group-hover:shadow-lg transition-all`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          {card.icon}
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-white mb-1">{card.value}</div>
                      <div className="text-sm text-white/80">{card.title}</div>
                      <div className="text-xs text-white/60 mt-1">{card.subtitle}</div>
                    </div>
                  </Link>
                ) : (
                  <div className={`p-5 bg-gradient-to-br ${card.color} rounded-2xl`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        {card.icon}
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white mb-1">{card.value}</div>
                    <div className="text-sm text-white/80">{card.title}</div>
                    <div className="text-xs text-white/60 mt-1">{card.subtitle}</div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <div className="lg:col-span-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-aurex-gold-500/20 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Последние транзакции</h2>
                <Link href="/admin/transactions" className="text-sm text-aurex-gold-500 hover:underline">
                  Все транзакции →
                </Link>
              </div>
              
              <div className="divide-y divide-aurex-gold-500/10">
                {(recentTransactions || []).map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-aurex-obsidian-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-aurex-obsidian-700 flex items-center justify-center">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{tx.username}</span>
                            <span className="text-xs text-aurex-gold-500">{tx.odid}</span>
                          </div>
                          <div className="text-sm text-aurex-platinum-500">{tx.method}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${tx.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.type === 'withdrawal' ? '-' : '+'}₽{tx.amount.toLocaleString('ru-RU')}
                        </div>
                        <div className="text-xs">{getStatusBadge(tx.status)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
              {/* Pending Actions */}
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Требуют внимания</h3>
                <div className="space-y-3">
                  <Link href="/admin/withdrawals" className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl hover:bg-orange-500/20 transition-colors">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      <span className="text-white">Выводы на проверку</span>
                    </div>
                    <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded">{(stats as any).pendingWithdrawalsCount ?? '–'}</span>
                  </Link>
                  <Link href="/admin/verification" className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-blue-500" />
                      <span className="text-white">KYC верификация</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">{(stats as any).pendingKycCount ?? '–'}</span>
                  </Link>
                  <Link href="/admin/tickets" className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-5 h-5 text-purple-500" />
                      <span className="text-white">Тикеты поддержки</span>
                    </div>
                    <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded">{(stats as any).openTicketsCount ?? '–'}</span>
                  </Link>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Быстрые действия</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/admin/users" className="flex flex-col items-center p-4 bg-aurex-obsidian-700/50 rounded-xl hover:bg-aurex-obsidian-700 transition-colors">
                    <Users className="w-6 h-6 text-aurex-gold-500 mb-2" />
                    <span className="text-sm text-aurex-platinum-300">Пользователи</span>
                  </Link>
                  <Link href="/admin/bonuses" className="flex flex-col items-center p-4 bg-aurex-obsidian-700/50 rounded-xl hover:bg-aurex-obsidian-700 transition-colors">
                    <Gift className="w-6 h-6 text-aurex-gold-500 mb-2" />
                    <span className="text-sm text-aurex-platinum-300">Бонусы</span>
                  </Link>
                  <Link href="/admin/games" className="flex flex-col items-center p-4 bg-aurex-obsidian-700/50 rounded-xl hover:bg-aurex-obsidian-700 transition-colors">
                    <Gamepad2 className="w-6 h-6 text-aurex-gold-500 mb-2" />
                    <span className="text-sm text-aurex-platinum-300">Игры</span>
                  </Link>
                  <Link href="/admin/analytics" className="flex flex-col items-center p-4 bg-aurex-obsidian-700/50 rounded-xl hover:bg-aurex-obsidian-700 transition-colors">
                    <BarChart3 className="w-6 h-6 text-aurex-gold-500 mb-2" />
                    <span className="text-sm text-aurex-platinum-300">Аналитика</span>
                  </Link>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Статус системы</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-aurex-platinum-400">API сервер</span>
                    <span className="flex items-center text-green-400">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-aurex-platinum-400">Платёжный шлюз</span>
                    <span className="flex items-center text-green-400">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-aurex-platinum-400">Игровой провайдер</span>
                    <span className="flex items-center text-green-400">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                      Online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
