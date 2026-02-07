import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  MessageCircle,
  Mail,
  Phone,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  FileText,
  CreditCard,
  Shield,
  Gamepad2,
  ChevronRight,
  Paperclip,
  X
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  createdAt: string;
  lastReply: string;
  messages: number;
}

export default function SupportPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'new' | 'tickets' | 'contact'>('new');
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyTickets();
    }
  }, [isAuthenticated]);

  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/tickets/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMyTickets(data.data.map((t: any) => ({
          id: t.id,
          subject: t.subject,
          category: t.category,
          status: t.status,
          createdAt: t.createdAt,
          lastReply: t.updatedAt,
          messages: t.messages?.length || 0,
        })));
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const categories = [
    { id: 'deposit', name: t('support.deposit'), icon: <CreditCard className="w-5 h-5" />, description: t('support.depositDesc') },
    { id: 'withdrawal', name: t('support.withdrawal'), icon: <CreditCard className="w-5 h-5" />, description: t('support.withdrawalDesc') },
    { id: 'bonus', name: t('support.bonus'), icon: <FileText className="w-5 h-5" />, description: t('support.bonusDesc') },
    { id: 'game', name: t('support.game'), icon: <Gamepad2 className="w-5 h-5" />, description: t('support.gameDesc') },
    { id: 'account', name: t('support.account'), icon: <Shield className="w-5 h-5" />, description: t('support.accountDesc') },
    { id: 'other', name: t('support.other'), icon: <HelpCircle className="w-5 h-5" />, description: t('support.otherDesc') },
  ];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.subject || !formData.message) {
      toast.error(t('support.fillAllFields'));
      return;
    }
    
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(t('support.ticketCreated'));
        setFormData({ category: '', subject: '', message: '', priority: 'normal' });
        setAttachments([]);
        fetchMyTickets();
        setActiveTab('tickets');
      } else {
        toast.error(data.message || t('support.ticketError'));
      }
    } catch (error) {
      toast.error(t('support.serverError'));
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    const styles = {
      open: 'bg-blue-500/20 text-blue-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      resolved: 'bg-green-500/20 text-green-400',
      closed: 'bg-gray-500/20 text-gray-400',
    };
    const labels = {
      open: t('support.open'),
      pending: t('support.pending'),
      resolved: t('support.resolved'),
      closed: t('support.closed'),
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.open}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>{t('support.title')} - AUREX</title>
        <meta name="description" content={`${t('support.title')} AUREX. ${t('support.subtitle')} ${t('support.subtitle24')}.`} />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          {/* Hero */}
          <section className="relative overflow-hidden py-12">
            <div className="absolute inset-0 aurex-backdrop"></div>
            
            <div className="relative max-w-4xl mx-auto px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-aurex-gold-500/20 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-aurex-gold-500" />
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black mb-4 text-white">
                  {t('support.title')}
                </h1>
                
                <p className="text-aurex-platinum-300 max-w-xl mx-auto">
                  {t('support.subtitle')} <span className="text-aurex-gold-500 font-bold">{t('support.subtitle24')}</span> {t('support.subtitleReady')}
                </p>

                {/* Quick Stats */}
                <div className="flex justify-center gap-8 mt-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-aurex-gold-500">&lt; 1 мин</div>
                    <div className="text-sm text-aurex-platinum-500">{t('support.liveChat')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-aurex-gold-500">&lt; 24ч</div>
                    <div className="text-sm text-aurex-platinum-500">{t('support.email')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-aurex-gold-500">98%</div>
                    <div className="text-sm text-aurex-platinum-500">{t('support.resolvability')}</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <div className="max-w-5xl mx-auto px-4">
            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto">
              {[
                { id: 'new', label: t('support.newTicket'), icon: <Send className="w-4 h-4" /> },
                { id: 'tickets', label: t('support.myTickets'), icon: <FileText className="w-4 h-4" /> },
                { id: 'contact', label: t('footer.contacts'), icon: <Phone className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900'
                      : 'bg-aurex-obsidian-800 text-aurex-platinum-300 border border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* New Ticket */}
            {activeTab === 'new' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2">
                  <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6">{t('support.createTicket')}</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Category Selection */}
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-3">{t('support.category')} *</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, category: cat.id })}
                              className={`p-4 rounded-xl text-left transition-all ${
                                formData.category === cat.id
                                  ? 'bg-aurex-gold-500/20 border-2 border-aurex-gold-500'
                                  : 'bg-aurex-obsidian-900/50 border-2 border-transparent hover:border-aurex-gold-500/30'
                              }`}
                            >
                              <div className={formData.category === cat.id ? 'text-aurex-gold-500' : 'text-aurex-platinum-500'}>
                                {cat.icon}
                              </div>
                              <div className="text-white font-medium mt-2">{cat.name}</div>
                              <div className="text-xs text-aurex-platinum-500 mt-1">{cat.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('support.subject')} *</label>
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder={t('support.describeProblem')}
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('support.message')} *</label>
                        <textarea
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder={t('support.describeDetailed')}
                          rows={6}
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none resize-none"
                        />
                      </div>

                      {/* Attachments */}
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('support.attachFiles')}</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {attachments.map((file, idx) => (
                            <div key={idx} className="flex items-center space-x-2 px-3 py-2 bg-aurex-obsidian-900 rounded-lg">
                              <span className="text-sm text-white">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                className="text-aurex-platinum-500 hover:text-red-400"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <label className="inline-flex items-center space-x-2 px-4 py-2 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg cursor-pointer hover:border-aurex-gold-500/50 transition-colors">
                          <Paperclip className="w-4 h-4 text-aurex-platinum-500" />
                          <span className="text-sm text-aurex-platinum-400">{t('support.addFile')}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setAttachments([...attachments, e.target.files[0]]);
                              }
                            }}
                          />
                        </label>
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('support.priority')}</label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                        >
                          <option value="low">{t('support.low')}</option>
                          <option value="normal">{t('support.normal')}</option>
                          <option value="high">{t('support.high')}</option>
                          <option value="urgent">{t('support.urgent')}</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl flex items-center justify-center space-x-2"
                      >
                        <Send className="w-5 h-5" />
                        <span>{t('common.submit')}</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Live Chat */}
                  <div className="bg-gradient-to-br from-aurex-gold-500/20 to-amber-500/10 border border-aurex-gold-500/30 rounded-2xl p-6">
                    <MessageCircle className="w-8 h-8 text-aurex-gold-500 mb-3" />
                    <h3 className="text-lg font-bold text-white mb-2">{t('support.liveChat')}</h3>
                    <p className="text-sm text-aurex-platinum-400 mb-4">
                      {t('support.getAnswer')}
                    </p>
                    <button className="w-full py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-xl">
                      {t('support.startChat')}
                    </button>
                  </div>

                  {/* Tips */}
                  <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">{t('support.tips')}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-aurex-platinum-400">{t('support.tip1')}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-aurex-platinum-400">{t('support.tip2')}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-aurex-platinum-400">{t('support.tip3')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* My Tickets */}
            {activeTab === 'tickets' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-aurex-gold-500/20">
                  <h2 className="text-xl font-bold text-white">{t('support.myTicketsTitle')}</h2>
                </div>

                {!isAuthenticated ? (
                  <div className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                    <p className="text-aurex-platinum-400">{t('support.loginToView')}</p>
                  </div>
                ) : myTickets.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                    <p className="text-aurex-platinum-400">{t('support.noTickets')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-aurex-gold-500/10">
                    {myTickets.map((ticket) => (
                      <div key={ticket.id} className="p-4 hover:bg-aurex-obsidian-700/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-1">
                              <span className="text-aurex-gold-500 font-mono text-sm">{ticket.id}</span>
                              {getStatusBadge(ticket.status)}
                            </div>
                            <div className="text-white font-medium">{ticket.subject}</div>
                            <div className="text-xs text-aurex-platinum-500 mt-1">
                              {t('support.created')}: {ticket.createdAt} • {t('support.replies')}: {ticket.messages}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-aurex-platinum-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Contact */}
            {activeTab === 'contact' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-aurex-gold-500/20 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-aurex-gold-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t('support.liveChat')}</h3>
                  <p className="text-aurex-platinum-400 text-sm mb-4">{t('support.instantAnswers')}</p>
                  <button className="w-full py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-xl">
                    {t('support.startChat')}
                  </button>
                </div>

                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t('support.email')}</h3>
                  <p className="text-aurex-platinum-400 text-sm mb-4">{t('support.reply24h')}</p>
                  <a href="mailto:support@aurex.io" className="block w-full py-3 bg-blue-500 text-white font-bold rounded-xl">
                    support@aurex.io
                  </a>
                </div>

                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-500/20 flex items-center justify-center">
                    <Send className="w-7 h-7 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Telegram</h3>
                  <p className="text-aurex-platinum-400 text-sm mb-4">{t('support.quickContact')}</p>
                  <a href="https://t.me/aurex_support" target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-green-500 text-white font-bold rounded-xl">
                    @aurex_support
                  </a>
                </div>

                <div className="md:col-span-2 lg:col-span-3 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-aurex-gold-500" />
                    <span>{t('support.workingHours')}</span>
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                      <div className="text-aurex-gold-500 font-bold text-lg">{t('support.liveChat')}</div>
                      <div className="text-aurex-platinum-400">24/7</div>
                    </div>
                    <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                      <div className="text-aurex-gold-500 font-bold text-lg">{t('support.email')}</div>
                      <div className="text-aurex-platinum-400">{t('support.emailHours')}</div>
                    </div>
                    <div className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                      <div className="text-aurex-gold-500 font-bold text-lg">{t('support.vipSupport24')}</div>
                      <div className="text-aurex-platinum-400">{t('support.vipSupport24Desc')}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}
