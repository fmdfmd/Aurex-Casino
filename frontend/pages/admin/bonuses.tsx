import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Gift, 
  Percent,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Edit2,
  Eye,
  Crown,
  Zap,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';

interface BonusStats {
  totalActiveBonuses: number;
  totalBonusAmount: number;
  averageWager: number;
  conversionRate: number;
}

interface ActiveBonus {
  id: string;
  odid: string;
  username: string;
  bonusType: string;
  amount: number;
  wagerRequired: number;
  wagerCompleted: number;
  expiresAt: string;
  status: string;
}

export default function AdminBonusesPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<BonusStats>({
    totalActiveBonuses: 0,
    totalBonusAmount: 0,
    averageWager: 0,
    conversionRate: 0
  });
  const [activeBonuses, setActiveBonuses] = useState<ActiveBonus[]>([]);

  useEffect(() => {
    fetchBonusData();
  }, []);

  const fetchBonusData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bonuses/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        // Set stats
        setStats({
          totalActiveBonuses: data.data.stats?.activeCount || 0,
          totalBonusAmount: data.data.stats?.totalBonusAmount || 0,
          averageWager: data.data.stats?.averageWager || 0,
          conversionRate: data.data?.stats?.usedCount > 0 
            ? Math.round((data.data.stats.usedCount / (data.data.stats.usedCount + (data.data.stats?.activeCount || 0))) * 100)
            : 0
        });

        // Map bonuses
        if (data.data.bonuses) {
          setActiveBonuses((data.data.bonuses || []).map((b: any) => ({
            id: b.id,
            odid: b.odid || 'N/A',
            username: b.username || 'Unknown',
            bonusType: b.bonusName || b.bonusType || 'Bonus',
            amount: b.bonusAmount || 0,
            wagerRequired: b.wagerRequired || 0,
            wagerCompleted: b.wagerCompleted || 0,
            expiresAt: b.expiresAt,
            status: b.status
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch bonus data:', error);
    }
    setIsLoading(false);
  };

  return (
    <AuthGuard>
      <Head>
        <title>Бонусы - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="aurex-imperial-text">Управление бонусами</span>
              </h1>
              <p className="text-aurex-platinum-400">Активные бонусы и история</p>
            </div>
            <Link
              href="/admin/promocodes"
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
            >
              <Gift className="w-5 h-5" />
              <span>Промокоды</span>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-aurex-gold-500/20 rounded-lg flex items-center justify-center">
                  <Gift className="w-5 h-5 text-aurex-gold-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalActiveBonuses}</p>
                  <p className="text-sm text-aurex-platinum-400">Активных</p>
                </div>
              </div>
            </div>
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">₽{stats.totalBonusAmount.toLocaleString('ru-RU')}</p>
                  <p className="text-sm text-aurex-platinum-400">Сумма бонусов</p>
                </div>
              </div>
            </div>
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Percent className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">x{stats.averageWager}</p>
                  <p className="text-sm text-aurex-platinum-400">Средний вейджер</p>
                </div>
              </div>
            </div>
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.conversionRate}%</p>
                  <p className="text-sm text-aurex-platinum-400">Конверсия</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                  : 'bg-aurex-obsidian-800 text-aurex-platinum-300 hover:bg-aurex-obsidian-700'
              }`}
            >
              Активные бонусы
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                  : 'bg-aurex-obsidian-800 text-aurex-platinum-300 hover:bg-aurex-obsidian-700'
              }`}
            >
              История
            </button>
          </div>

          {/* Bonuses Table */}
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aurex-gold-500/20">
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Пользователь</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Тип бонуса</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Сумма</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Прогресс вейджера</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Истекает</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeBonuses || []).map((bonus) => {
                    const wagerPercent = bonus.wagerRequired > 0 ? ((bonus.wagerCompleted || 0) / bonus.wagerRequired) * 100 : 0;
                    return (
                      <tr key={bonus.id} className="border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{bonus.username}</p>
                            <p className="text-sm text-aurex-platinum-500">{bonus.odid}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-aurex-gold-500">{bonus.bonusType}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-bold">₽{bonus.amount}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-aurex-platinum-400">₽{bonus.wagerCompleted}</span>
                              <span className="text-aurex-platinum-500">₽{bonus.wagerRequired}</span>
                            </div>
                            <div className="w-full h-2 bg-aurex-obsidian-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${wagerPercent >= 100 ? 'bg-green-500' : 'bg-aurex-gold-500'}`}
                                style={{ width: `${Math.min(wagerPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-aurex-platinum-300">{bonus.expiresAt}</span>
                        </td>
                        <td className="px-6 py-4">
                          {bonus.status === 'completed' ? (
                            <span className="flex items-center space-x-1 text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span>Отыгран</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-aurex-gold-500">
                              <Zap className="w-4 h-4" />
                              <span>Активен</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Link href="/admin/promocodes" className="p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl hover:border-aurex-gold-500/50 transition-all group">
              <Gift className="w-8 h-8 text-aurex-gold-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Промокоды</h3>
              <p className="text-aurex-platinum-400 text-sm">Создание и управление промокодами</p>
            </Link>
            <Link href="/admin/settings" className="p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl hover:border-aurex-gold-500/50 transition-all group">
              <Percent className="w-8 h-8 text-aurex-gold-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Настройки бонусов</h3>
              <p className="text-aurex-platinum-400 text-sm">Проценты, вейджеры, лимиты</p>
            </Link>
            <Link href="/admin/users" className="p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl hover:border-aurex-gold-500/50 transition-all group">
              <Users className="w-8 h-8 text-aurex-gold-500 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Пользователи</h3>
              <p className="text-aurex-platinum-400 text-sm">Управление балансами игроков</p>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
