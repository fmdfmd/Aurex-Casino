import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { MessageSquare, Search, Send, RefreshCw, CheckCircle, Clock, XCircle, Globe, Send as TelegramIcon } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Ticket {
  id: string;
  rawId: number;
  source: 'web' | 'telegram';
  subject: string;
  category: string;
  status: string;
  priority: string;
  username: string;
  odid: string;
  email: string;
  telegramId?: string;
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'support';
  username?: string;
  createdAt: string;
}

export default function AdminTicketsPage() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetchTickets();
    const interval = setInterval(fetchTickets, 15000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (selected) fetchMessages(selected.id);
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/support-tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTickets(data.data || []);
      } else {
        console.error('Support tickets error:', data);
      }
    } catch (e) {
      console.error('Fetch tickets failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticketId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${selected.id}/reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply })
      });
      const data = await res.json();
      if (data.success) {
        const newMsg: Message = { id: Date.now(), text: reply, sender: 'support', createdAt: new Date().toISOString() };
        setMessages(prev => [...prev, newMsg]);
        setReply('');
        toast.success(selected.source === 'telegram' ? 'Отправлено в Telegram' : 'Ответ отправлен');
        fetchTickets();
      } else {
        toast.error(data.error || 'Ошибка');
      }
    } catch (e) {
      toast.error('Ошибка сервера');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (ticketId: string) => {
    try {
      await fetch(`/api/admin/support-tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      toast.success('Тикет закрыт');
      fetchTickets();
      if (selected?.id === ticketId) setSelected(prev => prev ? { ...prev, status: 'resolved' } : null);
    } catch {
      toast.error('Ошибка');
    }
  };

  const filtered = tickets.filter(t => {
    const matchSearch = !search ||
      t.username.toLowerCase().includes(search.toLowerCase()) ||
      t.odid.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ||
      (filter === 'open' && ['open', 'pending', 'in_progress'].includes(t.status)) ||
      (filter === 'web' && t.source === 'web') ||
      (filter === 'telegram' && t.source === 'telegram') ||
      (filter === 'resolved' && t.status === 'resolved');
    return matchSearch && matchFilter;
  });

  const openCount = tickets.filter(t => ['open', 'pending', 'in_progress'].includes(t.status)).length;
  const tgCount = tickets.filter(t => t.source === 'telegram' && t.status !== 'resolved').length;

  const statusIcon = (status: string) => {
    if (status === 'resolved' || status === 'closed') return <CheckCircle className="w-3 h-3 text-green-400" />;
    if (status === 'pending') return <Clock className="w-3 h-3 text-yellow-400" />;
    return <Clock className="w-3 h-3 text-blue-400" />;
  };

  return (
    <AuthGuard>
      <Head><title>Тикеты поддержки - AUREX Admin</title></Head>
      <AdminLayout>
        <div className="p-4 h-[calc(100vh-64px)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-aurex-gold-500" />
                Тикеты поддержки
              </h1>
              <p className="text-xs text-aurex-platinum-500 mt-0.5">
                {openCount} открытых · {tgCount} из Telegram
              </p>
            </div>
            <button onClick={fetchTickets} className="flex items-center gap-1.5 px-3 py-1.5 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-lg border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>

          <div className="flex gap-3 flex-1 min-h-0">
            {/* Ticket list */}
            <div className="w-80 flex flex-col bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl overflow-hidden">
              {/* Filters */}
              <div className="p-3 border-b border-aurex-gold-500/10 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-aurex-platinum-500" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full pl-8 pr-3 py-2 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white text-xs placeholder-aurex-platinum-600 focus:outline-none focus:border-aurex-gold-500/50"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {[['all','Все'], ['open','Открытые'], ['telegram','Telegram'], ['web','Сайт'], ['resolved','Закрытые']].map(([val, label]) => (
                    <button key={val} onClick={() => setFilter(val)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${filter === val ? 'bg-aurex-gold-500 text-aurex-obsidian-900 font-medium' : 'bg-aurex-obsidian-700 text-aurex-platinum-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-32"><RefreshCw className="w-5 h-5 animate-spin text-aurex-gold-500" /></div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-aurex-platinum-500 text-sm">Тикеты не найдены</div>
                ) : filtered.map(ticket => (
                  <button key={ticket.id} onClick={() => setSelected(ticket)}
                    className={`w-full text-left p-3 border-b border-aurex-gold-500/10 hover:bg-aurex-obsidian-700/50 transition-colors ${selected?.id === ticket.id ? 'bg-aurex-gold-500/10 border-l-2 border-l-aurex-gold-500' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {ticket.source === 'telegram'
                          ? <TelegramIcon className="w-3 h-3 text-blue-400" />
                          : <Globe className="w-3 h-3 text-aurex-gold-400" />}
                        <span className="text-white text-xs font-medium truncate max-w-[140px]">{ticket.username}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {statusIcon(ticket.status)}
                        {ticket.messageCount > 0 && (
                          <span className="text-xs bg-aurex-gold-500/20 text-aurex-gold-400 px-1.5 rounded-full">{ticket.messageCount}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-aurex-platinum-400 truncate">{ticket.subject}</div>
                    {ticket.lastMessage && (
                      <div className="text-xs text-aurex-platinum-600 truncate mt-0.5">{ticket.lastMessage}</div>
                    )}
                    <div className="text-xs text-aurex-platinum-600 mt-1">
                      {new Date(ticket.createdAt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            <div className="flex-1 flex flex-col bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl overflow-hidden">
              {!selected ? (
                <div className="flex-1 flex flex-col items-center justify-center text-aurex-platinum-500">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm">Выберите тикет</p>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="p-4 border-b border-aurex-gold-500/10 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {selected.source === 'telegram'
                          ? <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1"><TelegramIcon className="w-3 h-3" />Telegram</span>
                          : <span className="text-xs bg-aurex-gold-500/20 text-aurex-gold-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Globe className="w-3 h-3" />Сайт</span>}
                        <span className="text-white font-medium">{selected.username}</span>
                        <span className="text-xs text-aurex-platinum-500">{selected.odid}</span>
                      </div>
                      <div className="text-xs text-aurex-platinum-500 mt-0.5">{selected.subject}</div>
                    </div>
                    {selected.status !== 'resolved' && (
                      <button onClick={() => handleClose(selected.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-xs">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Закрыть
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messagesLoading ? (
                      <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-aurex-gold-500" /></div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-aurex-platinum-500 text-sm py-8">Нет сообщений</div>
                    ) : messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === 'support' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                          msg.sender === 'support'
                            ? 'bg-aurex-gold-500/20 text-aurex-gold-100 rounded-br-sm'
                            : 'bg-aurex-obsidian-700 text-white rounded-bl-sm'
                        }`}>
                          <div>{msg.text}</div>
                          <div className="text-xs opacity-50 mt-1">
                            {new Date(msg.createdAt).toLocaleString('ru-RU', { hour:'2-digit', minute:'2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply input */}
                  {selected.status !== 'resolved' ? (
                    <div className="p-3 border-t border-aurex-gold-500/10 flex gap-2">
                      <textarea
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                        placeholder={selected.source === 'telegram' ? 'Ответить в Telegram...' : 'Написать ответ...'}
                        rows={2}
                        className="flex-1 px-3 py-2 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white text-sm placeholder-aurex-platinum-600 focus:outline-none focus:border-aurex-gold-500/50 resize-none"
                      />
                      <button onClick={handleReply} disabled={!reply.trim() || sending}
                        className="px-4 bg-aurex-gold-500 text-aurex-obsidian-900 rounded-xl hover:bg-aurex-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center">
                        {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 border-t border-aurex-gold-500/10 text-center text-xs text-aurex-platinum-500">
                      Тикет закрыт
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
