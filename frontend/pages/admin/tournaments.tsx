import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  X,
  Save
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  prizePool: number;
  currency: string;
  startDate: string;
  endDate: string;
  minBet: number;
  maxParticipants: number;
  participants: string[];
  participantsCount?: number;
  prizes: { position: string; amount: number }[];
  rules: string[];
  gameIcon: string;
  createdAt: string;
}

interface TournamentStats {
  total: number;
  active: number;
  scheduled: number;
  completed: number;
  totalPrizePool: number;
  totalParticipants: number;
}

export default function AdminTournamentsPage() {
  const { token } = useAuthStore();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Форма турнира
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'daily',
    prizePool: 500000,
    startDate: '',
    endDate: '',
    minBet: 20,
    maxParticipants: 1000,
    gameIcon: '🎰',
    rules: [''],
    prizes: [{ position: '1', amount: 200000 }],
  });

  useEffect(() => {
    fetchTournaments();
    fetchStats();
  }, []);

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTournaments(Array.isArray(data.data) ? data.data : []);
      } else {
        setTournaments([]);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/tournaments/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tournament stats:', error);
    }
  };

  const handleCreateTournament = async () => {
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Турнир создан!');
        setIsModalOpen(false);
        fetchTournaments();
        resetForm();
      } else {
        toast.error(data.message || 'Ошибка создания');
      }
    } catch (error) {
      toast.error('Ошибка сервера');
    }
  };

  const handleUpdateStatus = async (tournamentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Статус изменён на "${newStatus}"`);
        fetchTournaments();
      }
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm('Удалить турнир?')) return;
    
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Турнир удалён');
        fetchTournaments();
      }
    } catch (error) {
      toast.error('Ошибка');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'daily',
      prizePool: 500000,
      startDate: '',
      endDate: '',
      minBet: 20,
      maxParticipants: 1000,
      gameIcon: '🎰',
      rules: [''],
      prizes: [{ position: '1', amount: 200000 }],
    });
    setIsCreating(false);
  };

  const filteredTournaments = (tournaments || []).filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels: Record<string, string> = {
      active: 'Активный',
      scheduled: 'Запланирован',
      completed: 'Завершён',
      cancelled: 'Отменён',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      daily: 'Ежедневный',
      weekly: 'Недельный',
      monthly: 'Месячный',
      special: 'Специальный',
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-aurex-gold-500" />
              Управление турнирами
            </h1>
            <p className="text-aurex-platinum-400 mt-1">
              Создавайте и управляйте турнирами платформы
            </p>
          </div>
          <button
            onClick={() => { setIsCreating(true); setIsModalOpen(true); }}
            className="glow-button px-6 py-3 rounded-xl font-bold text-aurex-obsidian-900 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Создать турнир
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Всего', value: stats.total, icon: <Trophy className="w-5 h-5" />, color: 'text-aurex-gold-500' },
              { label: 'Активных', value: stats.active, icon: <Play className="w-5 h-5" />, color: 'text-green-500' },
              { label: 'Запланировано', value: stats.scheduled, icon: <Clock className="w-5 h-5" />, color: 'text-blue-500' },
              { label: 'Завершено', value: stats.completed, icon: <CheckCircle className="w-5 h-5" />, color: 'text-gray-500' },
              { label: 'Призовой фонд', value: `₽${(stats.totalPrizePool / 1000000).toFixed(1)}M`, icon: <DollarSign className="w-5 h-5" />, color: 'text-aurex-gold-500' },
              { label: 'Участников', value: stats.totalParticipants.toLocaleString('ru-RU'), icon: <Users className="w-5 h-5" />, color: 'text-purple-500' },
            ].map((stat, i) => (
              <div key={i} className="aurex-card p-4">
                <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-aurex-platinum-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-aurex-platinum-500" />
            <input
              type="text"
              placeholder="Поиск турниров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white placeholder-aurex-platinum-500 focus:outline-none focus:border-aurex-gold-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white focus:outline-none focus:border-aurex-gold-500"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="scheduled">Запланированные</option>
            <option value="completed">Завершённые</option>
            <option value="cancelled">Отменённые</option>
          </select>
        </div>

        {/* Tournaments Table */}
        <div className="aurex-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-aurex-obsidian-800">
                <tr className="text-left text-aurex-platinum-400 text-sm">
                  <th className="p-4">Турнир</th>
                  <th className="p-4">Тип</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4">Призовой фонд</th>
                  <th className="p-4">Участники</th>
                  <th className="p-4">Даты</th>
                  <th className="p-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredTournaments.map((tournament) => (
                  <tr key={tournament.id} className="border-t border-aurex-obsidian-700 hover:bg-aurex-obsidian-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{tournament.gameIcon}</span>
                        <div>
                          <div className="font-medium text-white">{tournament.name}</div>
                          <div className="text-sm text-aurex-platinum-500">{tournament.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-aurex-platinum-300">
                      {getTypeLabel(tournament.type)}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(tournament.status)}
                    </td>
                    <td className="p-4">
                      <span className="text-aurex-gold-500 font-bold">
                        ₽{tournament.prizePool.toLocaleString('ru-RU')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-aurex-platinum-500" />
                        <span className="text-white">{tournament.participantsCount || tournament.participants?.length || 0}</span>
                        <span className="text-aurex-platinum-500">/ {tournament.maxParticipants}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="text-aurex-platinum-300">
                        {new Date(tournament.startDate).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="text-aurex-platinum-500">
                        до {new Date(tournament.endDate).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedTournament(tournament); setIsModalOpen(true); }}
                          className="p-2 text-aurex-platinum-400 hover:text-aurex-gold-500 transition-colors"
                          title="Просмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {tournament.status === 'scheduled' && (
                          <button
                            onClick={() => handleUpdateStatus(tournament.id, 'active')}
                            className="p-2 text-green-400 hover:text-green-300 transition-colors"
                            title="Запустить"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {tournament.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(tournament.id, 'completed')}
                            className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                            title="Завершить"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTournament(tournament.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="aurex-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  {isCreating ? 'Создать турнир' : 'Детали турнира'}
                </h2>
                <button
                  onClick={() => { setIsModalOpen(false); resetForm(); setSelectedTournament(null); }}
                  className="p-2 text-aurex-platinum-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isCreating ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Название</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                        placeholder="Daily Battle"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Тип</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                      >
                        <option value="daily">Ежедневный</option>
                        <option value="weekly">Недельный</option>
                        <option value="monthly">Месячный</option>
                        <option value="special">Специальный</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-aurex-platinum-400 mb-2">Описание</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Призовой фонд (₽)</label>
                      <input
                        type="number"
                        value={formData.prizePool}
                        onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Мин. ставка (₽)</label>
                      <input
                        type="number"
                        value={formData.minBet}
                        onChange={(e) => setFormData({ ...formData, minBet: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Дата начала</label>
                      <input
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Дата окончания</label>
                      <input
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Макс. участников</label>
                      <input
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-aurex-platinum-400 mb-2">Иконка</label>
                      <input
                        type="text"
                        value={formData.gameIcon}
                        onChange={(e) => setFormData({ ...formData, gameIcon: e.target.value })}
                        className="w-full px-4 py-3 bg-aurex-obsidian-800 border border-aurex-obsidian-700 rounded-xl text-white text-2xl text-center"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => { setIsModalOpen(false); resetForm(); }}
                      className="flex-1 aurex-black-button py-3 rounded-xl font-bold"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleCreateTournament}
                      className="flex-1 glow-button py-3 rounded-xl font-bold text-aurex-obsidian-900 flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Создать
                    </button>
                  </div>
                </div>
              ) : selectedTournament && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl">{selectedTournament.gameIcon}</span>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedTournament.name}</h3>
                      <p className="text-aurex-platinum-400">{selectedTournament.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-aurex-obsidian-800 rounded-xl p-4">
                      <div className="text-sm text-aurex-platinum-500 mb-1">Статус</div>
                      {getStatusBadge(selectedTournament.status)}
                    </div>
                    <div className="bg-aurex-obsidian-800 rounded-xl p-4">
                      <div className="text-sm text-aurex-platinum-500 mb-1">Тип</div>
                      <div className="text-white font-medium">{getTypeLabel(selectedTournament.type)}</div>
                    </div>
                    <div className="bg-aurex-obsidian-800 rounded-xl p-4">
                      <div className="text-sm text-aurex-platinum-500 mb-1">Призовой фонд</div>
                      <div className="text-aurex-gold-500 font-bold text-xl">₽{selectedTournament.prizePool.toLocaleString('ru-RU')}</div>
                    </div>
                    <div className="bg-aurex-obsidian-800 rounded-xl p-4">
                      <div className="text-sm text-aurex-platinum-500 mb-1">Участники</div>
                      <div className="text-white font-bold text-xl">
                        {selectedTournament.participantsCount || selectedTournament.participants?.length || 0} / {selectedTournament.maxParticipants}
                      </div>
                    </div>
                  </div>

                  <div className="bg-aurex-obsidian-800 rounded-xl p-4">
                    <div className="text-sm text-aurex-platinum-500 mb-2">Призовые места</div>
                    <div className="space-y-2">
                      {(selectedTournament.prizes || []).map((prize, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-aurex-platinum-300">Место {prize.position}</span>
                          <span className="text-aurex-gold-500 font-bold">₽{prize.amount.toLocaleString('ru-RU')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
