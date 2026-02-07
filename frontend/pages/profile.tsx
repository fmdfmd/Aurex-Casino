import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Bell,
  Eye,
  EyeOff,
  Camera,
  Edit2,
  Save,
  Crown,
  Wallet,
  History,
  Settings,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Copy,
  Calendar,
  MapPin,
  Globe
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import toast from 'react-hot-toast';

interface GameHistoryItem {
  game: string;
  date: string;
  bet: number;
  win: number;
  multiplier: string;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout, updateUser, token } = useAuthStore();
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'history'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    country: 'Россия',
    birthDate: ''
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [notifications, setNotifications] = useState({
    emailDeposits: true,
    emailWithdrawals: true,
    emailBonuses: true,
    emailNews: false,
    pushAll: true,
    smsImportant: false
  });

  const vipNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Emperor'];

  const handleSaveProfile = () => {
    updateUser({
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName
    });
    setIsEditing(false);
    toast.success('Профиль обновлён');
  };

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (passwords.new.length < 8) {
      toast.error('Пароль должен быть минимум 8 символов');
      return;
    }
    toast.success('Пароль изменён');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  // Fetch game history from API
  useEffect(() => {
    const fetchGameHistory = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/games/history?limit=20', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data?.sessions?.length > 0) {
          setGameHistory(data.data.sessions.map((s: any) => ({
            game: s.gameName || s.game || 'Unknown Game',
            date: new Date(s.createdAt).toLocaleString('ru-RU'),
            bet: s.totalBet || 0,
            win: s.totalWin || 0,
            multiplier: s.totalBet > 0 ? `${(s.totalWin / s.totalBet).toFixed(1)}x` : '0x'
          })));
        } else {
          // Пустой список если нет истории
          setGameHistory([]);
        }
      } catch (error) {
        console.error('Failed to fetch game history:', error);
        setGameHistory([]);
      }
    };
    fetchGameHistory();
  }, [token]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано!');
  };

  return (
    <AuthGuard>
      <Head>
        <title>Профиль - AUREX Empire</title>
        <meta name="description" content="Управление профилем AUREX" />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-6xl mx-auto px-4">
            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-3xl p-6 sm:p-8 mb-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-aurex-gold-500/10 rounded-full blur-3xl"></div>
              
              <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-aurex-gold-500 to-aurex-gold-600 flex items-center justify-center text-4xl sm:text-5xl font-black text-aurex-obsidian-900">
                    {user?.username?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <button className="absolute -bottom-2 -right-2 p-2 bg-aurex-obsidian-700 border border-aurex-gold-500/30 rounded-full text-aurex-gold-500 hover:bg-aurex-obsidian-600 transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                  {/* VIP Badge */}
                  <div className="absolute -top-2 -left-2 px-2 py-1 bg-gradient-to-r from-aurex-gold-500 to-amber-500 rounded-full text-xs font-bold text-aurex-obsidian-900">
                    VIP {user?.vipLevel || 1}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">{user?.username}</h1>
                    {user?.isVerified && (
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="text-aurex-platinum-400 mb-3">{user?.email}</div>
                  
                  {/* Unique Player ID - prominent display */}
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-aurex-obsidian-900/80 border border-aurex-gold-500/40 rounded-xl mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-aurex-platinum-500">{t('profile.playerId')}</span>
                      <span className="text-lg font-mono font-bold text-aurex-gold-400">{user?.odid || `AUREX-${user?.id?.slice(-8).toUpperCase()}`}</span>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(user?.odid || `AUREX-${user?.id?.slice(-8).toUpperCase()}`)} 
                      className="p-2 bg-aurex-gold-500/20 hover:bg-aurex-gold-500/30 text-aurex-gold-500 rounded-lg transition-colors"
                      title={t('profile.copyId')}
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                    <div className="px-4 py-2 bg-aurex-obsidian-900/50 rounded-xl">
                      <div className="text-xs text-aurex-platinum-500">{t('profile.balance')}</div>
                      <div className="text-lg font-bold text-white">₽{(user?.balance || 0).toLocaleString('ru-RU')}</div>
                    </div>
                    <div className="px-4 py-2 bg-aurex-obsidian-900/50 rounded-xl">
                      <div className="text-xs text-aurex-platinum-500">VIP уровень</div>
                      <div className="text-lg font-bold text-aurex-gold-500">{vipNames[(user?.vipLevel || 1) - 1]}</div>
                    </div>
                    <div className="px-4 py-2 bg-aurex-obsidian-900/50 rounded-xl">
                      <div className="text-xs text-aurex-platinum-500">{t('profile.gamesPlayed')}</div>
                      <div className="text-lg font-bold text-white">{user?.gamesPlayed || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { id: 'profile', label: 'Профиль', icon: <User className="w-4 h-4" /> },
                { id: 'security', label: t('profile.security'), icon: <Shield className="w-4 h-4" /> },
                { id: 'notifications', label: t('profile.notifications'), icon: <Bell className="w-4 h-4" /> },
                { id: 'history', label: t('profile.gameHistory'), icon: <History className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
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

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {activeTab === 'profile' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white">{t('profile.personalData')}</h2>
                      <button
                        onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                          isEditing 
                            ? 'bg-green-500 text-white' 
                            : 'bg-aurex-obsidian-700 text-aurex-platinum-300 border border-aurex-gold-500/20'
                        }`}
                      >
                        {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        <span>{isEditing ? t('profile.save') : t('profile.edit')}</span>
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('profile.username')}</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white disabled:opacity-50 focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('profile.email')}</label>
                        <input
                          type="email"
                          value={formData.email}
                          disabled
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('profile.firstName')}</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Введите имя"
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white disabled:opacity-50 focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('profile.lastName')}</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Введите фамилию"
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white disabled:opacity-50 focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('profile.phone')}</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          disabled={!isEditing}
                          placeholder="+49 123 456 7890"
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white disabled:opacity-50 focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('profile.birthDate')}</label>
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white disabled:opacity-50 focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm text-aurex-platinum-400 mb-2">{t('profile.country')}</label>
                        <select
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          disabled={!isEditing}
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white disabled:opacity-50 focus:border-aurex-gold-500/50 focus:outline-none"
                        >
                          <option value="Germany">Германия</option>
                          <option value="Austria">Австрия</option>
                          <option value="Switzerland">Швейцария</option>
                          <option value="Netherlands">Нидерланды</option>
                          <option value="Poland">Польша</option>
                        </select>
                      </div>
                    </div>

                    {/* Verification Status */}
                    <div className="mt-8 p-4 bg-aurex-obsidian-900/50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {user?.isVerified ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-6 h-6 text-yellow-500" />
                          )}
                          <div>
                            <div className="text-white font-medium">
                              {user?.isVerified ? 'Аккаунт верифицирован' : 'Требуется верификация'}
                            </div>
                            <div className="text-sm text-aurex-platinum-500">
                              {user?.isVerified ? 'Полный доступ к функциям' : 'Загрузите документы для вывода средств'}
                            </div>
                          </div>
                        </div>
                        {!user?.isVerified && (
                          <button className="px-4 py-2 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg">
                            Пройти KYC
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Change Password */}
                    <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                        <Lock className="w-5 h-5 text-aurex-gold-500" />
                        <span>Изменить пароль</span>
                      </h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-aurex-platinum-400 mb-2">Текущий пароль</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={passwords.current}
                              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                              className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white pr-12 focus:border-aurex-gold-500/50 focus:outline-none"
                            />
                            <button
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-aurex-platinum-500"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-aurex-platinum-400 mb-2">Новый пароль</label>
                          <input
                            type="password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-aurex-platinum-400 mb-2">Подтвердите пароль</label>
                          <input
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={handleChangePassword}
                          className="w-full py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl"
                        >
                          Сменить пароль
                        </button>
                      </div>
                    </div>

                    {/* 2FA */}
                    <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                      <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-aurex-gold-500" />
                        <span>Двухфакторная аутентификация</span>
                      </h2>
                      <p className="text-aurex-platinum-400 mb-4">
                        Защитите аккаунт с помощью 2FA. Используйте Google Authenticator или аналогичное приложение.
                      </p>
                      <button className="px-6 py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 font-medium rounded-xl border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all">
                        Включить 2FA
                      </button>
                    </div>

                    {/* Sessions */}
                    <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                      <h2 className="text-xl font-bold text-white mb-4">Активные сессии</h2>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-aurex-obsidian-900/50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <Globe className="w-5 h-5 text-green-500" />
                            <div>
                              <div className="text-white">Chrome на MacOS</div>
                              <div className="text-xs text-aurex-platinum-500">Текущая сессия</div>
                            </div>
                          </div>
                          <span className="text-green-400 text-sm">Активна</span>
                        </div>
                      </div>
                      <button className="mt-4 text-red-400 text-sm hover:underline">
                        Завершить все другие сессии
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'notifications' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                  >
                    <h2 className="text-xl font-bold text-white mb-6">Настройки уведомлений</h2>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">Email уведомления</h3>
                        <div className="space-y-3">
                          {[
                            { key: 'emailDeposits', label: 'Депозиты и пополнения' },
                            { key: 'emailWithdrawals', label: 'Выводы средств' },
                            { key: 'emailBonuses', label: 'Бонусы и акции' },
                            { key: 'emailNews', label: 'Новости и обновления' },
                          ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between p-3 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                              <span className="text-aurex-platinum-300">{item.label}</span>
                              <input
                                type="checkbox"
                                checked={notifications[item.key as keyof typeof notifications]}
                                onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                                className="w-5 h-5 rounded border-aurex-gold-500 text-aurex-gold-500 focus:ring-aurex-gold-500"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">Push уведомления</h3>
                        <label className="flex items-center justify-between p-3 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                          <span className="text-aurex-platinum-300">Все push-уведомления</span>
                          <input
                            type="checkbox"
                            checked={notifications.pushAll}
                            onChange={(e) => setNotifications({ ...notifications, pushAll: e.target.checked })}
                            className="w-5 h-5 rounded border-aurex-gold-500 text-aurex-gold-500 focus:ring-aurex-gold-500"
                          />
                        </label>
                      </div>

                      <div>
                        <h3 className="text-lg font-medium text-white mb-4">SMS</h3>
                        <label className="flex items-center justify-between p-3 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                          <span className="text-aurex-platinum-300">Важные уведомления (безопасность)</span>
                          <input
                            type="checkbox"
                            checked={notifications.smsImportant}
                            onChange={(e) => setNotifications({ ...notifications, smsImportant: e.target.checked })}
                            className="w-5 h-5 rounded border-aurex-gold-500 text-aurex-gold-500 focus:ring-aurex-gold-500"
                          />
                        </label>
                      </div>

                      <button className="w-full py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl">
                        Сохранить настройки
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-aurex-gold-500/20">
                      <h2 className="text-xl font-bold text-white">{t('profile.gameHistory')}</h2>
                    </div>
                    
                    <div className="divide-y divide-aurex-gold-500/10">
                      {gameHistory.map((game, idx) => (
                        <div key={idx} className="p-4 hover:bg-aurex-obsidian-700/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">{game.game}</div>
                              <div className="text-xs text-aurex-platinum-500">{game.date}</div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${game.win > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {game.win > 0 ? '+' : ''}₽{game.win.toFixed(2)}
                              </div>
                              <div className="text-xs text-aurex-platinum-500">
                                Ставка: ₽{game.bet} • {game.multiplier}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Статистика</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">Всего депозитов</span>
                      <span className="text-white font-bold">₽{(user?.totalDeposited || 0).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">Всего выводов</span>
                      <span className="text-white font-bold">₽{(user?.totalWithdrawn || 0).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">VIP очки</span>
                      <span className="text-aurex-gold-500 font-bold">{user?.vipPoints || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-aurex-platinum-400">Дата регистрации</span>
                      <span className="text-white">{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Быстрые действия</h3>
                  <div className="space-y-2">
                    <a href="/wallet" className="flex items-center space-x-3 p-3 bg-aurex-obsidian-900/50 rounded-xl hover:bg-aurex-obsidian-700 transition-colors">
                      <Wallet className="w-5 h-5 text-aurex-gold-500" />
                      <span className="text-aurex-platinum-300">Пополнить баланс</span>
                    </a>
                    <a href="/referral" className="flex items-center space-x-3 p-3 bg-aurex-obsidian-900/50 rounded-xl hover:bg-aurex-obsidian-700 transition-colors">
                      <Crown className="w-5 h-5 text-aurex-gold-500" />
                      <span className="text-aurex-platinum-300">Реферальная программа</span>
                    </a>
                    <a href="/vip" className="flex items-center space-x-3 p-3 bg-aurex-obsidian-900/50 rounded-xl hover:bg-aurex-obsidian-700 transition-colors">
                      <Crown className="w-5 h-5 text-aurex-gold-500" />
                      <span className="text-aurex-platinum-300">VIP программа</span>
                    </a>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{t('profile.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
