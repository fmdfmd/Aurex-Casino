import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  Percent,
  Users,
  DollarSign,
  Calendar,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Gift
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface CashbackRecord {
  id: string;
  odid: string;
  userId: string;
  username: string;
  amount: number;
  weeklyLoss: number;
  percent: number;
  wagering: number;
  wagerRequired: number;
  wagerCompleted: number;
  isVip: boolean;
  vipLevel: number;
  weekStart: string;
  weekEnd: string;
  status: string;
  isManual?: boolean;
  reason?: string;
  createdAt: string;
}

interface CashbackStats {
  totalCashbacks: number;
  totalAmount: number;
  thisWeek: number;
}

export default function AdminCashbackPage() {
  const { token } = useAuthStore();
  const [cashbacks, setCashbacks] = useState<CashbackRecord[]>([]);
  const [stats, setStats] = useState<CashbackStats>({ totalCashbacks: 0, totalAmount: 0, thisWeek: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<any>(null);

  useEffect(() => {
    fetchCashbacks();
  }, []);

  const fetchCashbacks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cashback/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCashbacks(data.data.cashbacks || []);
        setStats(data.data.stats || { totalCashbacks: 0, totalAmount: 0, thisWeek: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch cashbacks:', error);
    }
    setIsLoading(false);
  };

  const processCashback = async () => {
    if (!confirm('Вы уверены? Это начислит кэшбэк ВСЕМ игрокам с проигрышем за эту неделю.')) {
      return;
    }

    setIsProcessing(true);
    setProcessResults(null);

    try {
      const res = await fetch('/api/cashback/admin/process', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        setProcessResults(data.data);
        fetchCashbacks();
      } else {
        toast.error(data.error || 'Ошибка обработки');
      }
    } catch (error) {
      console.error('Process cashback error:', error);
      toast.error('Ошибка сервера');
    }

    setIsProcessing(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AuthGuard>
      <Head>
        <title>Кэшбэк - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center space-x-3">
                <Percent className="w-8 h-8 text-aurex-gold-500" />
                <span>Еженедельный Кэшбэк</span>
              </h1>
              <p className="text-aurex-platinum-400 mt-1">
                5–15% в зависимости от VIP (x5 вейджер) • Каждый понедельник
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchCashbacks}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Обновить</span>
              </button>

              <button
                onClick={processCashback}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>Начислить всем</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">₽{stats.totalAmount.toLocaleString('ru-RU')}</div>
              <div className="text-sm text-white/80">Всего выдано</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{stats.totalCashbacks}</div>
              <div className="text-sm text-white/80">Всего начислений</div>
            </div>

            <div className="bg-gradient-to-br from-aurex-gold-500 to-amber-600 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-aurex-obsidian-900" />
                </div>
              </div>
              <div className="text-2xl font-black text-aurex-obsidian-900">{stats.thisWeek}</div>
              <div className="text-sm text-aurex-obsidian-900/80">За эту неделю</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">5-15%</div>
              <div className="text-sm text-white/80">Ставки кэшбэка</div>
            </div>
          </div>

          {/* Process Results */}
          {processResults && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-8"
            >
              <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Результаты обработки</span>
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{processResults.processed}</div>
                  <div className="text-sm text-aurex-platinum-400">Обработано</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{processResults.skipped}</div>
                  <div className="text-sm text-aurex-platinum-400">Пропущено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">₽{processResults.totalAmount?.toLocaleString('ru-RU')}</div>
                  <div className="text-sm text-aurex-platinum-400">Начислено</div>
                </div>
              </div>
              <button
                onClick={() => setProcessResults(null)}
                className="text-sm text-aurex-platinum-400 hover:text-white"
              >
                Скрыть
              </button>
            </motion.div>
          )}

          {/* Cashback Table */}
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-aurex-gold-500/20">
              <h2 className="text-lg font-bold text-white">История кэшбэков</h2>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-aurex-gold-500 animate-spin mx-auto mb-4" />
                <p className="text-aurex-platinum-400">Загрузка...</p>
              </div>
            ) : cashbacks.length === 0 ? (
              <div className="p-12 text-center">
                <Gift className="w-16 h-16 text-aurex-platinum-600 mx-auto mb-4" />
                <p className="text-aurex-platinum-400">Кэшбэки ещё не начислялись</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-aurex-gold-500/20 text-left">
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">ID</th>
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">Игрок</th>
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">Сумма</th>
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">Потери</th>
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">%</th>
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">Вейджер</th>
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">VIP</th>
                      <th className="px-6 py-4 text-aurex-platinum-400 font-medium">Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cashbacks || []).map((cb) => (
                      <tr key={cb.id} className="border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50">
                        <td className="px-6 py-4">
                          <span className="text-aurex-gold-500 text-sm">{cb.odid}</span>
                          {cb.isManual && (
                            <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                              Ручной
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-white font-medium">{cb.username}</td>
                        <td className="px-6 py-4 text-green-400 font-bold">
                          +₽{cb.amount.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 text-red-400">
                          -₽{cb.weeklyLoss.toLocaleString('ru-RU')}
                        </td>
                        <td className="px-6 py-4 text-white">{cb.percent}%</td>
                        <td className="px-6 py-4">
                          <div className="text-white">x{cb.wagering}</div>
                          <div className="text-xs text-aurex-platinum-500">
                            ₽{cb.wagerCompleted.toLocaleString('ru-RU')} / ₽{cb.wagerRequired.toLocaleString('ru-RU')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {cb.isVip ? (
                            <span className="flex items-center space-x-1 text-aurex-gold-500">
                              <Crown className="w-4 h-4" />
                              <span>VIP {cb.vipLevel}</span>
                            </span>
                          ) : (
                            <span className="text-aurex-platinum-500">Обычный</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-aurex-platinum-400 text-sm">
                          {formatDate(cb.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Block */}
          <div className="mt-8 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-aurex-gold-500" />
              <span>Механика кэшбэка</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-aurex-platinum-400">
              <div>
                <h4 className="font-bold text-white mb-2">Ставки по VIP</h4>
                <ul className="space-y-1">
                  <li>• Bronze — 5%</li>
                  <li>• Silver — 7%</li>
                  <li>• Gold — 10%</li>
                  <li>• Platinum — 12%</li>
                  <li>• Emperor — 15%</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-2">Условия</h4>
                <ul className="space-y-1">
                  <li>• Вейджер x5 на все уровни</li>
                  <li>• Минимум ₽10 для начисления</li>
                  <li>• Начисляется на бонусный баланс</li>
                  <li>• Срок отыгрыша — 7 дней</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-aurex-platinum-500 text-sm">
              Кэшбэк начисляется автоматически каждый понедельник игрокам с чистым проигрышем за неделю (ставки {">"} выигрыши).
              Также можно начислить вручную кнопкой выше.
            </p>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
