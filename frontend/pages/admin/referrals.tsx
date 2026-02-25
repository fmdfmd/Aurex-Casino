import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, RefreshCw, Eye, Edit2, X, DollarSign,
  TrendingUp, UserCheck, Percent, ChevronLeft, Copy, Check
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Referrer {
  id: number;
  username: string;
  email: string;
  odid: string;
  referralCode: string;
  pendingEarnings: number;
  customPercent: number | null;
  totalReferrals: number;
  activeReferrals: number;
  referralsGGR: number;
  totalEarned: number;
  isActive: boolean;
  createdAt: string;
}

interface ReferralDetail {
  id: number;
  username: string;
  email: string;
  odid: string;
  registeredAt: string;
  depositCount: number;
  balance: number;
  vipLevel: string;
  isActive: boolean;
  totalDeposits: number;
  ggr: number;
  status: string;
}

interface Commission {
  amount: number;
  date: string;
  description: string;
}

export default function AdminReferralsPage() {
  const { token } = useAuthStore();
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [viewingReferrer, setViewingReferrer] = useState<Referrer | null>(null);
  const [referralDetails, setReferralDetails] = useState<ReferralDetail[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [editingReferrer, setEditingReferrer] = useState<Referrer | null>(null);
  const [newPercent, setNewPercent] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => { fetchReferrers(); }, []);

  const fetchReferrers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals?limit=100&search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setReferrers(data.data.referrers || []);
    } catch (e) {
      console.error('Fetch referrers error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const viewReferrer = async (referrer: Referrer) => {
    setViewingReferrer(referrer);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals/${referrer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReferralDetails(data.data.referrals || []);
        setCommissions(data.data.commissions || []);
      }
    } catch (e) {
      console.error('Fetch referrer details error:', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openEditModal = (referrer: Referrer) => {
    setEditingReferrer(referrer);
    setNewPercent(referrer.customPercent !== null ? String(referrer.customPercent) : '');
  };

  const savePercent = async () => {
    if (!editingReferrer) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/referrals/${editingReferrer.id}/percent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ percent: newPercent === '' ? null : parseFloat(newPercent) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setEditingReferrer(null);
        fetchReferrers();
      } else {
        toast.error(data.error || 'Ошибка');
      }
    } catch (e) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  const getTierName = (count: number) => {
    if (count >= 50) return { name: 'Легенда', color: 'text-purple-400', pct: 20 };
    if (count >= 30) return { name: 'Мастер', color: 'text-red-400', pct: 18 };
    if (count >= 15) return { name: 'Эксперт', color: 'text-aurex-gold-500', pct: 15 };
    if (count >= 5) return { name: 'Партнёр', color: 'text-blue-400', pct: 12 };
    return { name: 'Новичок', color: 'text-aurex-platinum-400', pct: 10 };
  };

  const totalStats = {
    referrers: referrers.length,
    totalReferrals: referrers.reduce((s, r) => s + r.totalReferrals, 0),
    totalGGR: referrers.reduce((s, r) => s + r.referralsGGR, 0),
    totalEarned: referrers.reduce((s, r) => s + r.totalEarned, 0),
  };

  // Detail view
  if (viewingReferrer) {
    const tier = getTierName(viewingReferrer.totalReferrals);
    const effectivePercent = viewingReferrer.customPercent !== null ? viewingReferrer.customPercent : tier.pct;

    return (
      <AuthGuard>
        <Head><title>Реферер {viewingReferrer.username} - AUREX Admin</title></Head>
        <AdminLayout>
          <div className="p-6">
            <button onClick={() => setViewingReferrer(null)} className="flex items-center gap-2 text-aurex-platinum-400 hover:text-white mb-6 transition-colors">
              <ChevronLeft className="w-5 h-5" /> Назад к списку
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{viewingReferrer.username}</h2>
                    <p className="text-aurex-platinum-400">{viewingReferrer.odid} &middot; {viewingReferrer.email || '—'}</p>
                  </div>
                  <button onClick={() => openEditModal(viewingReferrer)} className="flex items-center gap-2 px-4 py-2 bg-aurex-gold-500/20 text-aurex-gold-500 rounded-xl hover:bg-aurex-gold-500/30 transition-colors">
                    <Edit2 className="w-4 h-4" /> Изменить %
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div><p className="text-sm text-aurex-platinum-500">Тир</p><p className={`text-lg font-bold ${tier.color}`}>{tier.name}</p></div>
                  <div><p className="text-sm text-aurex-platinum-500">Комиссия</p><p className="text-lg font-bold text-white">{effectivePercent}%{viewingReferrer.customPercent !== null ? ' ✏️' : ''}</p></div>
                  <div><p className="text-sm text-aurex-platinum-500">Рефералов</p><p className="text-lg font-bold text-white">{viewingReferrer.totalReferrals} <span className="text-sm text-green-400">({viewingReferrer.activeReferrals} акт.)</span></p></div>
                  <div><p className="text-sm text-aurex-platinum-500">Код</p>
                    <button onClick={() => copyCode(viewingReferrer.referralCode)} className="text-lg font-bold text-aurex-gold-500 hover:underline flex items-center gap-1">
                      {viewingReferrer.referralCode} {copied === viewingReferrer.referralCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Финансы</h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-aurex-platinum-400">GGR рефералов</span><span className="text-white font-bold">₽{viewingReferrer.referralsGGR.toLocaleString('ru-RU')}</span></div>
                  <div className="flex justify-between"><span className="text-aurex-platinum-400">Всего заработал</span><span className="text-green-400 font-bold">₽{viewingReferrer.totalEarned.toLocaleString('ru-RU')}</span></div>
                  <div className="flex justify-between"><span className="text-aurex-platinum-400">Ожидает вывода</span><span className="text-aurex-gold-500 font-bold">₽{viewingReferrer.pendingEarnings.toLocaleString('ru-RU')}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-aurex-gold-500/20">
                <h3 className="text-lg font-bold text-white">Рефералы ({referralDetails.length})</h3>
              </div>
              {detailsLoading ? (
                <div className="p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin text-aurex-gold-500 mx-auto" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-aurex-gold-500/10">
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Пользователь</th>
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Дата рег.</th>
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Депозиты</th>
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Сумма деп.</th>
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">GGR</th>
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Статус</th>
                    </tr></thead>
                    <tbody>
                      {referralDetails.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-aurex-platinum-500">Нет рефералов</td></tr>
                      ) : referralDetails.map(r => (
                        <tr key={r.id} className="border-b border-aurex-gold-500/5 hover:bg-aurex-obsidian-700/50">
                          <td className="px-6 py-3"><span className="text-white font-medium">{r.username}</span><br /><span className="text-xs text-aurex-platinum-500">{r.odid}</span></td>
                          <td className="px-6 py-3 text-aurex-platinum-300 text-sm">{new Date(r.registeredAt).toLocaleDateString('ru-RU')}</td>
                          <td className="px-6 py-3 text-white">{r.depositCount}</td>
                          <td className="px-6 py-3 text-white">₽{r.totalDeposits.toLocaleString('ru-RU')}</td>
                          <td className="px-6 py-3"><span className={r.ggr > 0 ? 'text-green-400 font-bold' : 'text-aurex-platinum-500'}>₽{r.ggr.toLocaleString('ru-RU')}</span></td>
                          <td className="px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-aurex-platinum-500/20 text-aurex-platinum-400'}`}>{r.status === 'active' ? 'Активен' : 'Неактивен'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {commissions.length > 0 && (
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-aurex-gold-500/20">
                  <h3 className="text-lg font-bold text-white">История комиссий (последние 50)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-aurex-gold-500/10">
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Дата</th>
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Сумма</th>
                      <th className="text-left px-6 py-3 text-aurex-platinum-400 text-sm font-medium">Описание</th>
                    </tr></thead>
                    <tbody>
                      {commissions.map((c, i) => (
                        <tr key={i} className="border-b border-aurex-gold-500/5">
                          <td className="px-6 py-3 text-aurex-platinum-300 text-sm">{new Date(c.date).toLocaleDateString('ru-RU')}</td>
                          <td className="px-6 py-3 text-green-400 font-bold">+₽{c.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-aurex-platinum-400 text-sm">{c.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </AdminLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Head><title>Рефералка - AUREX Admin</title></Head>
      <AdminLayout>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="aurex-imperial-text">Реферальная система</span>
              </h1>
              <p className="text-aurex-platinum-400">Управление партнёрами и комиссиями</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Рефереров', value: totalStats.referrers, icon: Users, color: 'aurex-gold-500' },
              { label: 'Всего рефералов', value: totalStats.totalReferrals, icon: UserCheck, color: 'blue-500' },
              { label: 'GGR рефералов', value: `₽${totalStats.totalGGR.toLocaleString('ru-RU')}`, icon: TrendingUp, color: 'green-500' },
              { label: 'Выплачено', value: `₽${totalStats.totalEarned.toLocaleString('ru-RU')}`, icon: DollarSign, color: 'purple-500' },
            ].map((s, i) => (
              <div key={i} className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-${s.color}/20 rounded-lg flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 text-${s.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-sm text-aurex-platinum-400">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-aurex-platinum-500" />
              <input type="text" placeholder="Поиск по имени, email, коду..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReferrers()}
                className="w-full pl-12 pr-4 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none" />
            </div>
            <button onClick={fetchReferrers} className="p-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-aurex-platinum-400 hover:text-aurex-gold-500 hover:border-aurex-gold-500/50 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-aurex-gold-500/20">
                  <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Пользователь</th>
                  <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Код</th>
                  <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Тир</th>
                  <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Комиссия</th>
                  <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Рефералы</th>
                  <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">GGR</th>
                  <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Заработано</th>
                  <th className="text-right px-6 py-4 text-aurex-platinum-400 font-medium">Действия</th>
                </tr></thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center"><RefreshCw className="w-8 h-8 animate-spin text-aurex-gold-500 mx-auto mb-2" /><p className="text-aurex-platinum-400">Загрузка...</p></td></tr>
                  ) : referrers.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center"><Users className="w-12 h-12 text-aurex-platinum-600 mx-auto mb-2" /><p className="text-aurex-platinum-400">Рефереры не найдены</p></td></tr>
                  ) : referrers.map(r => {
                    const tier = getTierName(r.totalReferrals);
                    const effectivePercent = r.customPercent !== null ? r.customPercent : tier.pct;
                    return (
                      <tr key={r.id} className="border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50 transition-colors">
                        <td className="px-6 py-4"><span className="text-white font-medium">{r.username}</span><br /><span className="text-xs text-aurex-platinum-500">{r.odid}</span></td>
                        <td className="px-6 py-4">
                          <button onClick={() => copyCode(r.referralCode)} className="flex items-center gap-1 px-2 py-1 bg-aurex-gold-500/10 text-aurex-gold-500 rounded font-mono text-sm hover:bg-aurex-gold-500/20 transition-colors">
                            {r.referralCode} {copied === r.referralCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="px-6 py-4"><span className={`font-bold ${tier.color}`}>{tier.name}</span></td>
                        <td className="px-6 py-4">
                          <span className="text-white font-bold">{effectivePercent}%</span>
                          {r.customPercent !== null && <span className="ml-1 text-xs text-aurex-gold-500">✏️</span>}
                        </td>
                        <td className="px-6 py-4"><span className="text-white">{r.totalReferrals}</span> <span className="text-xs text-green-400">({r.activeReferrals} акт.)</span></td>
                        <td className="px-6 py-4"><span className={r.referralsGGR > 0 ? 'text-green-400 font-bold' : 'text-aurex-platinum-500'}>₽{r.referralsGGR.toLocaleString('ru-RU')}</span></td>
                        <td className="px-6 py-4"><span className="text-white font-bold">₽{r.totalEarned.toLocaleString('ru-RU')}</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => viewReferrer(r)} className="p-2 bg-aurex-obsidian-700 text-aurex-platinum-400 rounded-lg hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="Просмотр">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditModal(r)} className="p-2 bg-aurex-obsidian-700 text-aurex-platinum-400 rounded-lg hover:text-aurex-gold-500 hover:bg-aurex-gold-500/10 transition-colors" title="Изменить %">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Percent Modal */}
          <AnimatePresence>
            {editingReferrer && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setEditingReferrer(null)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  onClick={e => e.stopPropagation()} className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Изменить комиссию</h3>
                    <button onClick={() => setEditingReferrer(null)} className="p-2 text-aurex-platinum-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="mb-4">
                    <p className="text-aurex-platinum-400 mb-1">Пользователь: <span className="text-white font-bold">{editingReferrer.username}</span></p>
                    <p className="text-aurex-platinum-400 mb-1">Стандартный тир: <span className="text-white">{getTierName(editingReferrer.totalReferrals).name} ({getTierName(editingReferrer.totalReferrals).pct}%)</span></p>
                    <p className="text-aurex-platinum-400">Текущий: <span className="text-aurex-gold-500 font-bold">{editingReferrer.customPercent !== null ? `${editingReferrer.customPercent}% (кастом)` : `${getTierName(editingReferrer.totalReferrals).pct}% (стандарт)`}</span></p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm text-aurex-platinum-400 mb-2">Индивидуальный процент (0-50, пустое = стандартный)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={newPercent} onChange={e => setNewPercent(e.target.value)} placeholder="Стандартный"
                        min="0" max="50" step="0.5"
                        className="flex-1 px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none" />
                      <Percent className="w-5 h-5 text-aurex-platinum-500" />
                    </div>
                    <p className="text-xs text-aurex-platinum-500 mt-2">Оставьте пустым, чтобы сбросить на стандартный процент по тиру</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setNewPercent(''); savePercent(); }} className="flex-1 py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-xl hover:bg-aurex-obsidian-600 transition-colors">
                      Сбросить
                    </button>
                    <button onClick={savePercent} disabled={saving}
                      className="flex-1 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50">
                      {saving ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
