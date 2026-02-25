import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard,
  Users,
  Gamepad2,
  CreditCard,
  Settings,
  BarChart3,
  Shield,
  Menu,
  X,
  LogOut,
  Crown,
  AlertTriangle,
  Database,
  Gift,
  MessageSquare,
  FileCheck,
  Tag,
  Trophy,
  Wallet,

  Lock,
  KeyRound
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, logout, token } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pinRequired, setPinRequired] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(5);

  useEffect(() => {
    checkPinStatus();
  }, [token]);

  const checkPinStatus = async () => {
    if (!token) return;
    try {
      const adminToken = sessionStorage.getItem('aurex_admin_token');
      const res = await fetch('/api/admin/check-pin', {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(adminToken ? { 'X-Admin-Token': adminToken } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setPinRequired(data.pinRequired);
      }
    } catch {
      setPinRequired(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('aurex_admin_token', data.adminToken);
        setPinRequired(false);
        toast.success('Доступ разрешён');
      } else {
        setPinError(data.message || 'Неверный PIN');
        setAttemptsLeft(data.attemptsLeft ?? attemptsLeft - 1);
        setPinInput('');
      }
    } catch {
      setPinError('Ошибка сервера');
    } finally {
      setPinLoading(false);
    }
  };

  const navigationItems = [
    { href: '/admin', label: 'Панель управления', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Пользователи', icon: Users },
    { href: '/admin/balance', label: 'Управление балансом', icon: Wallet },
    { href: '/admin/transactions', label: 'Транзакции', icon: CreditCard },
    { href: '/admin/cashback', label: 'Кэшбэк', icon: Crown },
    { href: '/admin/tournaments', label: 'Турниры', icon: Trophy },
    { href: '/admin/referrals', label: 'Рефералка', icon: Users },
    { href: '/admin/promocodes', label: 'Промокоды', icon: Tag },
    { href: '/admin/bonuses', label: 'Бонусы', icon: Gift },
    { href: '/admin/freerounds', label: 'Фриспины', icon: Gamepad2 },
    { href: '/admin/tickets', label: 'Тикеты', icon: MessageSquare },
    { href: '/admin/verification', label: 'Верификация (KYC)', icon: FileCheck },
    { href: '/admin/settings', label: 'Настройки', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user?.isAdmin && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Доступ запрещён</h1>
          <p className="text-gray-400 mb-4">У вас нет прав администратора</p>
          <Link href="/" className="text-aurex-gold-500 hover:underline">Вернуться на главную</Link>
        </div>
      </div>
    );
  }

  if (pinRequired === null) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center">
        <div className="animate-pulse text-aurex-platinum-400">Проверка доступа...</div>
      </div>
    );
  }

  if (pinRequired) {
    return (
      <div className="min-h-screen bg-dark-300 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full"
        >
          <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-aurex-gold-500/10 rounded-2xl flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-aurex-gold-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Empire Control</h2>
              <p className="text-aurex-platinum-400 text-sm mt-1">Введите PIN-код администратора</p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN-код"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-obsidian-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder:text-aurex-platinum-600 placeholder:tracking-normal placeholder:text-base focus:border-aurex-gold-500 focus:outline-none transition-colors"
              />

              {pinError && (
                <div className="text-red-400 text-sm text-center">
                  {pinError}
                  {attemptsLeft > 0 && attemptsLeft < 5 && (
                    <span className="block text-xs mt-1">Осталось попыток: {attemptsLeft}</span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={pinLoading || !pinInput}
                className="w-full py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all disabled:opacity-50"
              >
                {pinLoading ? 'Проверка...' : 'Войти'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-aurex-platinum-500 hover:text-aurex-gold-500 transition-colors">
                Вернуться на сайт
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-300 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-200 border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-aurex-gold-500/20">
            <Link href="/admin" className="flex items-center space-x-2">
              <Image
                src="/images/aurexlogo.png"
                alt="AUREX"
                width={100}
                height={40}
                className="h-8 w-auto"
              />
              <span className="text-aurex-platinum-400 text-xs uppercase tracking-wider hidden sm:block">
                Control
              </span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = router.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-casino-gold text-black'
                      : 'text-gray-300 hover:text-white hover:bg-dark-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-casino-gold rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="text-white font-medium">{user?.username || 'Admin'}</div>
                <div className="text-gray-400 text-sm">Администратор</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-dark-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top Bar */}
        <header className="bg-dark-200 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold aurex-imperial-text" style={{ fontFamily: 'Cinzel, serif' }}>Empire Control</h1>
                <p className="text-aurex-platinum-400 text-sm">AUREX Management System</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Система работает</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">DB: OK</span>
                </div>
              </div>

              {/* Return to site */}
              <Link
                href="/"
                className="px-4 py-2 bg-casino-gold text-black rounded-lg font-medium hover:bg-casino-gold-dark transition-colors"
              >
                На сайт
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <motion.div
            key={router.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}