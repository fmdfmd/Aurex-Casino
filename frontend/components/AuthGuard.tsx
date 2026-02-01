import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Crown, Lock, LogIn, UserPlus, Home } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '../store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Wait for client-side hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-aurex-obsidian-900 flex items-center justify-center">
        <div className="animate-pulse">
          <Image
            src="/images/aurexlogo.png"
            alt="AUREX"
            width={120}
            height={50}
            className="h-12 w-auto opacity-50"
          />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-aurex-obsidian-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-aurex-gold-500 blur-2xl opacity-30 animate-pulse"></div>
            <Image
              src="/images/aurexlogo.png"
              alt="AUREX"
              width={150}
              height={60}
              className="relative h-14 w-auto aurex-logo-glow"
            />
          </div>
          <p className="mt-4 text-aurex-platinum-400 animate-pulse">Загрузка...</p>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - show access denied screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-aurex-obsidian-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          {/* Background effects */}
          <div className="absolute inset-0 aurex-backdrop pointer-events-none"></div>
          
          <div className="relative bg-aurex-obsidian-800 border border-aurex-gold-500/30 rounded-3xl p-8 sm:p-12">
            {/* Lock Icon */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 bg-aurex-gold-500 blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-aurex-obsidian-700 to-aurex-obsidian-800 rounded-2xl border border-aurex-gold-500/30 flex items-center justify-center">
                <Lock className="w-10 h-10 text-aurex-gold-500" />
              </div>
            </div>

            {/* Logo */}
            <Image
              src="/images/aurexlogo.png"
              alt="AUREX"
              width={120}
              height={50}
              className="h-10 w-auto mx-auto mb-6"
            />

            <h1 className="text-2xl sm:text-3xl font-black mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              <span className="aurex-imperial-text">Доступ ограничен</span>
            </h1>

            <p className="text-aurex-platinum-400 mb-8">
              Эта страница доступна только для авторизованных членов Golden Empire. 
              Войдите или создайте аккаунт, чтобы продолжить.
            </p>

            {/* Actions */}
            <div className="space-y-4">
              <Link
                href="/login"
                className="flex items-center justify-center space-x-2 w-full py-4 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
              >
                <LogIn className="w-5 h-5" />
                <span>Войти в аккаунт</span>
              </Link>

              <Link
                href="/register"
                className="flex items-center justify-center space-x-2 w-full py-4 bg-aurex-obsidian-700 text-aurex-platinum-300 font-bold rounded-xl border border-aurex-gold-500/30 hover:border-aurex-gold-500/50 transition-all"
              >
                <UserPlus className="w-5 h-5" />
                <span>Создать аккаунт</span>
              </Link>

              <Link
                href="/"
                className="flex items-center justify-center space-x-2 w-full py-3 text-aurex-platinum-400 hover:text-aurex-gold-500 transition-all"
              >
                <Home className="w-4 h-4" />
                <span>На главную</span>
              </Link>
            </div>

            {/* Benefits */}
            <div className="mt-8 pt-8 border-t border-aurex-gold-500/20">
              <p className="text-sm text-aurex-platinum-500 mb-4">После регистрации вы получите:</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2 text-aurex-platinum-400">
                  <Crown className="w-4 h-4 text-aurex-gold-500" />
                  <span>Бонус 200%</span>
                </div>
                <div className="flex items-center space-x-2 text-aurex-platinum-400">
                  <Crown className="w-4 h-4 text-aurex-gold-500" />
                  <span>100 фриспинов</span>
                </div>
                <div className="flex items-center space-x-2 text-aurex-platinum-400">
                  <Crown className="w-4 h-4 text-aurex-gold-500" />
                  <span>VIP доступ</span>
                </div>
                <div className="flex items-center space-x-2 text-aurex-platinum-400">
                  <Crown className="w-4 h-4 text-aurex-gold-500" />
                  <span>Крипто выплаты</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Admin check - проверяем isAdmin или role === 'admin'
  if (requireAdmin && !user?.isAdmin && user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-aurex-obsidian-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="relative bg-aurex-obsidian-800 border border-red-500/30 rounded-3xl p-8 sm:p-12">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-4">
              Доступ запрещён
            </h1>

            <p className="text-aurex-platinum-400 mb-8">
              У вас нет прав администратора для доступа к этой странице.
            </p>

            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-xl hover:shadow-aurex-gold transition-all"
            >
              <span>Вернуться на главную</span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}
