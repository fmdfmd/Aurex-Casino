import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag, 
  Search, 
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Gift,
  Percent,
  DollarSign,
  Calendar,
  RefreshCw,
  X,
  Zap
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Promocode {
  id: string;
  code: string;
  type: 'balance' | 'bonus' | 'freespins' | 'deposit_bonus';
  value: number;
  minDeposit: number;
  usageLimit: number;
  usedCount: number;
  usedBy?: string[];
  expiresAt: string | null;
  isActive: boolean;
  description: string;
  createdAt: string;
}

export default function AdminPromocodesPage() {
  const { token } = useAuthStore();
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promocode | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'balance' as 'balance' | 'bonus' | 'freespins' | 'deposit_bonus',
    value: '',
    minDeposit: '0',
    maxUses: '',
    expiresAt: '',
    description: ''
  });

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const fetchPromocodes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/promocodes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPromocodes(data.data || []);
        }
      } else {
        console.error('Failed to fetch promocodes');
        setPromocodes([]);
      }
    } catch (error) {
      console.error('Failed to fetch promocodes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'AUREX';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.code || !formData.value) {
      toast.error('Заполните обязательные поля');
      return;
    }

    const promoData = {
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: parseFloat(formData.value),
      minDeposit: parseFloat(formData.minDeposit) || 0,
      usageLimit: parseInt(formData.maxUses) || 100,
      expiresAt: formData.expiresAt || null,
      description: formData.description
    };

    try {
      if (editingPromo) {
        // Update
        const response = await fetch(`/api/promocodes/${editingPromo.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(promoData)
        });
        
        if (response.ok) {
          toast.success('Промокод обновлён');
          fetchPromocodes();
        }
      } else {
        // Create
        const response = await fetch('/api/promocodes', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(promoData)
        });
        
        if (response.ok) {
          toast.success('Промокод создан');
          fetchPromocodes();
        }
      }
    } catch (error) {
      console.error('Failed to save promocode:', error);
    }

    closeModal();
  };

  const togglePromoStatus = async (id: string) => {
    try {
      await fetch(`/api/promocodes/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setPromocodes(prev => prev.map(p => 
        p.id === id ? { ...p, isActive: !p.isActive } : p
      ));
      toast.success('Статус изменён');
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const deletePromo = async (id: string) => {
    if (confirm('Удалить промокод?')) {
      try {
        await fetch(`/api/promocodes/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        setPromocodes(prev => prev.filter(p => p.id !== id));
        toast.success('Промокод удалён');
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано!');
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingPromo(null);
    setFormData({
      code: '',
      type: 'balance' as 'balance' | 'bonus' | 'freespins' | 'deposit_bonus',
      value: '',
      minDeposit: '0',
      maxUses: '',
      expiresAt: '',
      description: ''
    });
  };

  const openEditModal = (promo: Promocode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      type: promo.type,
      value: String(promo.value),
      minDeposit: String(promo.minDeposit),
      maxUses: String(promo.usageLimit),
      expiresAt: promo.expiresAt ? promo.expiresAt.split('T')[0] : '',
      description: promo.description
    });
    setShowCreateModal(true);
  };

  const filteredPromocodes = (promocodes || []).filter(p => 
    p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'balance': return <DollarSign className="w-4 h-4" />;
      case 'bonus': return <Gift className="w-4 h-4" />;
      case 'freespins': return <Zap className="w-4 h-4" />;
      case 'deposit_bonus': return <Percent className="w-4 h-4" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'balance': return 'На баланс';
      case 'bonus': return 'Бонусный';
      case 'freespins': return 'Фриспины';
      case 'deposit_bonus': return '% к депозиту';
      default: return type;
    }
  };

  const getValueDisplay = (promo: Promocode) => {
    switch (promo.type) {
      case 'balance': return `₽${promo.value.toLocaleString('ru-RU')}`;
      case 'bonus': return `₽${promo.value.toLocaleString('ru-RU')} (бонус)`;
      case 'freespins': return `${promo.value} FS`;
      case 'deposit_bonus': return `${promo.value}%`;
      default: return promo.value;
    }
  };

  // Stats
  const stats = {
    total: (promocodes || []).length,
    active: (promocodes || []).filter(p => p.isActive).length,
    totalUsed: (promocodes || []).reduce((sum, p) => sum + (p.usedCount || 0), 0),
    expired: (promocodes || []).filter(p => p.expiresAt && new Date(p.expiresAt) < new Date()).length
  };

  return (
    <AuthGuard >
      <Head>
        <title>Промокоды - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                <span className="aurex-imperial-text">Промокоды</span>
              </h1>
              <p className="text-aurex-platinum-400">Управление промокодами и бонусами</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>Создать промокод</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-aurex-gold-500/20 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-aurex-gold-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-aurex-platinum-400">Всего</p>
                </div>
              </div>
            </div>
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.active}</p>
                  <p className="text-sm text-aurex-platinum-400">Активных</p>
                </div>
              </div>
            </div>
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalUsed}</p>
                  <p className="text-sm text-aurex-platinum-400">Использований</p>
                </div>
              </div>
            </div>
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.expired}</p>
                  <p className="text-sm text-aurex-platinum-400">Истекших</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-aurex-platinum-500" />
              <input
                type="text"
                placeholder="Поиск по коду или описанию..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
              />
            </div>
            <button
              onClick={fetchPromocodes}
              className="p-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-aurex-platinum-400 hover:text-aurex-gold-500 hover:border-aurex-gold-500/50 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Promocodes Table */}
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aurex-gold-500/20">
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Код</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Тип</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Значение</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Мин. депозит</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Использований</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Истекает</th>
                    <th className="text-left px-6 py-4 text-aurex-platinum-400 font-medium">Статус</th>
                    <th className="text-right px-6 py-4 text-aurex-platinum-400 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <RefreshCw className="w-8 h-8 text-aurex-gold-500 animate-spin mx-auto mb-2" />
                        <p className="text-aurex-platinum-400">Загрузка...</p>
                      </td>
                    </tr>
                  ) : filteredPromocodes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <Tag className="w-12 h-12 text-aurex-platinum-600 mx-auto mb-2" />
                        <p className="text-aurex-platinum-400">Промокоды не найдены</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPromocodes.map((promo) => {
                      const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
                      const usagePercent = promo.usageLimit > 0 ? (promo.usedCount / promo.usageLimit) * 100 : 0;
                      
                      return (
                        <tr 
                          key={promo.id} 
                          className="border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <code className="px-3 py-1 bg-aurex-gold-500/20 text-aurex-gold-500 rounded-lg font-mono font-bold">
                                {promo.code}
                              </code>
                              <button
                                onClick={() => copyToClipboard(promo.code)}
                                className="p-1 text-aurex-platinum-500 hover:text-aurex-gold-500 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-sm text-aurex-platinum-500 mt-1 max-w-xs truncate">
                              {promo.description}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                promo.type === 'balance' ? 'bg-green-500/20 text-green-500' :
                                promo.type === 'bonus' ? 'bg-aurex-gold-500/20 text-aurex-gold-500' :
                                promo.type === 'deposit_bonus' ? 'bg-blue-500/20 text-blue-500' :
                                'bg-purple-500/20 text-purple-500'
                              }`}>
                                {getTypeIcon(promo.type)}
                              </div>
                              <span className="text-aurex-platinum-300 text-sm">{getTypeLabel(promo.type)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xl font-bold text-white">{getValueDisplay(promo)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-aurex-platinum-300">
                              {promo.minDeposit > 0 ? `₽${promo.minDeposit.toLocaleString('ru-RU')}` : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="text-white font-medium">{promo.usedCount}</span>
                              {promo.usageLimit > 0 && (
                                <span className="text-aurex-platinum-500">/{promo.usageLimit}</span>
                              )}
                              {promo.usageLimit > 0 && (
                                <div className="w-20 h-1.5 bg-aurex-obsidian-700 rounded-full mt-1">
                                  <div 
                                    className={`h-full rounded-full ${usagePercent >= 100 ? 'bg-red-500' : usagePercent >= 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {promo.expiresAt ? (
                              <span className={`text-sm ${isExpired ? 'text-red-400' : 'text-aurex-platinum-300'}`}>
                                {new Date(promo.expiresAt).toLocaleDateString('ru-RU')}
                              </span>
                            ) : (
                              <span className="text-aurex-platinum-500">Бессрочно</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => togglePromoStatus(promo.id)}
                              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                promo.isActive && !isExpired
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              }`}
                            >
                              {promo.isActive && !isExpired ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Активен</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  <span>{isExpired ? 'Истёк' : 'Неактивен'}</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => openEditModal(promo)}
                                className="p-2 bg-aurex-obsidian-700 text-aurex-platinum-400 rounded-lg hover:text-aurex-gold-500 hover:bg-aurex-obsidian-600 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deletePromo(promo.id)}
                                className="p-2 bg-aurex-obsidian-700 text-aurex-platinum-400 rounded-lg hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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

          {/* Create/Edit Modal */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={closeModal}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-6 w-full max-w-lg"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">
                      {editingPromo ? 'Редактировать промокод' : 'Создать промокод'}
                    </h3>
                    <button
                      onClick={closeModal}
                      className="p-2 text-aurex-platinum-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Code */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Код промокода *</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                          placeholder="AUREX2024"
                          className="flex-1 px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white font-mono uppercase focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                        <button
                          onClick={generateCode}
                          className="px-4 py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-xl hover:bg-aurex-obsidian-600 transition-colors"
                          title="Сгенерировать"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Тип бонуса</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { value: 'balance', label: 'На баланс', icon: <DollarSign className="w-4 h-4" /> },
                          { value: 'bonus', label: 'Бонусный', icon: <Gift className="w-4 h-4" /> },
                          { value: 'deposit_bonus', label: '% к депозиту', icon: <Percent className="w-4 h-4" /> },
                          { value: 'freespins', label: 'Фриспины', icon: <Zap className="w-4 h-4" /> }
                        ].map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setFormData(prev => ({ ...prev, type: type.value as 'balance' | 'bonus' | 'freespins' | 'deposit_bonus' }))}
                            className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-all ${
                              formData.type === type.value
                                ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                                : 'bg-aurex-obsidian-700 text-aurex-platinum-300 hover:bg-aurex-obsidian-600'
                            }`}
                          >
                            {type.icon}
                            <span>{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Value */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">
                        {formData.type === 'balance' ? 'Сумма (₽) *' : formData.type === 'bonus' ? 'Сумма бонуса (₽) *' : formData.type === 'deposit_bonus' ? 'Процент (%) *' : 'Количество фриспинов *'}
                      </label>
                      <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                        placeholder={formData.type === 'deposit_bonus' ? '100' : formData.type === 'freespins' ? '50' : '1000'}
                        min="0"
                        className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                      />
                    </div>

                    {/* Min Deposit */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Минимальный депозит (₽)</label>
                      <input
                        type="number"
                        value={formData.minDeposit}
                        onChange={(e) => setFormData(prev => ({ ...prev, minDeposit: e.target.value }))}
                        placeholder="0"
                        min="0"
                        className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                      />
                    </div>

                    {/* Max Uses */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Макс. использований (0 = безлимит)</label>
                      <input
                        type="number"
                        value={formData.maxUses}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                        placeholder="0"
                        min="0"
                        className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                      />
                    </div>

                    {/* Expires At */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Срок действия</label>
                      <input
                        type="date"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                        className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Описание</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Описание промокода..."
                        rows={2}
                        className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none resize-none"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleCreateOrUpdate}
                      className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
                    >
                      {editingPromo ? 'Сохранить изменения' : 'Создать промокод'}
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
