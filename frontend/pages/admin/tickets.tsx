import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  MessageSquare,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Send,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface TicketMessage {
  id: number;
  sender: 'user' | 'support';
  text: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  odid: string;
  username: string;
  email: string;
  category: string;
  subject: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  assignedTo?: string;
}

export default function AdminTicketsPage() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTickets(Array.isArray(data.data) ? data.data : []);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const getStatusBadge = (status: Ticket['status']) => {
    const styles = {
      open: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Открыт' },
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'В обработке' },
      resolved: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Решён' },
      closed: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Закрыт' },
    };
    const s = styles[status] || styles.open;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const getPriorityBadge = (priority: Ticket['priority']) => {
    const styles = {
      low: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Низкий' },
      normal: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Обычный' },
      high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Высокий' },
      urgent: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Срочный' },
    };
    const s = styles[priority] || styles.normal;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      deposit: 'Депозит',
      withdrawal: 'Вывод',
      bonus: 'Бонусы',
      game: 'Игры',
      account: 'Аккаунт',
      other: 'Другое',
    };
    return labels[cat] || cat;
  };

  const filteredTickets = (tickets || []).filter(t => {
    if (!t) return false;
    const matchesSearch = 
      (t.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleStatusChange = (ticketId: string, newStatus: Ticket['status']) => {
    setTickets(prev => prev.map(t => 
      t.id === ticketId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
    ));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    // In production, this would send to API
    setTickets(prev => prev.map(t => 
      t.id === selectedTicket.id 
        ? { 
            ...t, 
            messages: [...t.messages, { id: t.messages.length + 1, sender: 'support' as const, text: replyMessage, createdAt: new Date().toISOString() }], 
            status: 'pending', 
            updatedAt: new Date().toISOString() 
          } 
        : t
    ));
    setReplyMessage('');
  };

  const stats = {
    open: (tickets || []).filter(t => t?.status === 'open').length,
    pending: (tickets || []).filter(t => t?.status === 'pending').length,
    urgent: (tickets || []).filter(t => t?.priority === 'urgent' && t?.status !== 'closed').length,
    today: (tickets || []).filter(t => t?.createdAt && t.createdAt.startsWith(new Date().toISOString().split('T')[0])).length,
  };

  return (
    <AuthGuard >
      <Head>
        <title>Тикеты поддержки - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Тикеты поддержки</h1>
              <p className="text-aurex-platinum-400">Управление обращениями пользователей</p>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-700 rounded-lg text-aurex-platinum-300 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Обновить</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="text-2xl font-bold text-blue-400">{stats.open}</div>
              <div className="text-sm text-blue-300">Открытых</div>
            </div>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-sm text-yellow-300">В обработке</div>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="text-2xl font-bold text-red-400">{stats.urgent}</div>
              <div className="text-sm text-red-300">Срочных</div>
            </div>
            <div className="p-4 bg-aurex-gold-500/10 border border-aurex-gold-500/30 rounded-xl">
              <div className="text-2xl font-bold text-aurex-gold-500">{stats.today}</div>
              <div className="text-sm text-aurex-gold-400">Сегодня</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-2">
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aurex-platinum-500" />
                  <input
                    type="text"
                    placeholder="Поиск по ID, имени, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
                >
                  <option value="all">Все статусы</option>
                  <option value="open">Открытые</option>
                  <option value="pending">В обработке</option>
                  <option value="resolved">Решённые</option>
                  <option value="closed">Закрытые</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-4 py-2 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
                >
                  <option value="all">Все приоритеты</option>
                  <option value="urgent">Срочные</option>
                  <option value="high">Высокие</option>
                  <option value="normal">Обычные</option>
                  <option value="low">Низкие</option>
                </select>
              </div>

              {/* List */}
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl overflow-hidden">
                <div className="divide-y divide-aurex-gold-500/10">
                  {filteredTickets.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                      <p className="text-aurex-platinum-400">Тикеты не найдены</p>
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id 
                            ? 'bg-aurex-gold-500/10' 
                            : 'hover:bg-aurex-obsidian-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-aurex-gold-500 font-mono text-sm">{ticket.id}</span>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <ChevronRight className="w-4 h-4 text-aurex-platinum-500" />
                        </div>
                        <div className="text-white font-medium mb-1">{ticket.subject}</div>
                        <div className="flex items-center justify-between text-xs text-aurex-platinum-500">
                          <span>{ticket.username} • {getCategoryLabel(ticket.category)}</span>
                          <span>{ticket.messages?.length || 0} сообщ.</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Ticket Detail */}
            <div>
              {selectedTicket ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl overflow-hidden sticky top-6"
                >
                  <div className="p-4 border-b border-aurex-gold-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-aurex-gold-500 font-mono">{selectedTicket.id}</span>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <h3 className="text-lg font-bold text-white">{selectedTicket.subject}</h3>
                  </div>

                  <div className="p-4 border-b border-aurex-gold-500/10">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-aurex-gold-500/20 flex items-center justify-center text-aurex-gold-500 font-bold">
                        {selectedTicket.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{selectedTicket.username}</div>
                        <div className="text-xs text-aurex-platinum-500">{selectedTicket.odid} • {selectedTicket.email}</div>
                      </div>
                    </div>
                    <div className="text-sm text-aurex-platinum-400">{selectedTicket.messages?.[0]?.text || 'Нет сообщений'}</div>
                    <div className="text-xs text-aurex-platinum-500 mt-2">
                      Создан: {selectedTicket.createdAt}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-4 border-b border-aurex-gold-500/10">
                    <div className="text-sm text-aurex-platinum-400 mb-2">Изменить статус:</div>
                    <div className="flex flex-wrap gap-2">
                      {['pending', 'resolved', 'closed'].map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(selectedTicket.id, status as Ticket['status'])}
                          disabled={selectedTicket.status === status}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            selectedTicket.status === status
                              ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                              : 'bg-aurex-obsidian-700 text-aurex-platinum-300 hover:bg-aurex-obsidian-600'
                          }`}
                        >
                          {status === 'pending' && 'В обработку'}
                          {status === 'resolved' && 'Решён'}
                          {status === 'closed' && 'Закрыть'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reply */}
                  <div className="p-4">
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Написать ответ..."
                      rows={3}
                      className="w-full px-3 py-2 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white text-sm focus:border-aurex-gold-500/50 focus:outline-none resize-none mb-2"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyMessage.trim()}
                      className="w-full py-2 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>Отправить</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-8 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                  <p className="text-aurex-platinum-400">Выберите тикет для просмотра</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
