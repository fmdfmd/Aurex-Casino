import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  LogIn,
  Crown,
  Gift,
  Zap,
  Shield,
  User
} from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '../store/authStore';
import Layout from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import TelegramLoginButton, { TelegramUser } from '../components/TelegramLoginButton';

interface LoginForm {
  login: string; // email или username
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithTelegram, isLoading, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const handleTelegramAuth = useCallback(async (tgUser: TelegramUser) => {
    try {
      await loginWithTelegram(tgUser as unknown as Record<string, string>);
      router.push('/');
    } catch (e) {
      // handled by store
    }
  }, [loginWithTelegram, router]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginForm>();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const onSubmit = async (data: LoginForm) => {
    try {
      // Можно войти по email или username
      await login(data.login, data.password);
      router.push('/');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const benefits = [
    {
      icon: Gift,
      title: 'Приветственный бонус',
      description: 'До 100,000₽ + 200 фриспинов'
    },
    {
      icon: Zap,
      title: 'Мгновенные выплаты',
      description: 'Выводите средства за 1-5 минут'
    },
    {
      icon: Crown,
      title: 'VIP программа',
      description: 'Эксклюзивные бонусы и привилегии'
    },
    {
      icon: Shield,
      title: 'Безопасность',
      description: 'Лицензированное казино с честной игрой'
    }
  ];

  return (
    <>
      <Head>
        <title>Вход в Империю - AUREX</title>
        <meta name="description" content="Войдите в свой аккаунт AUREX и получите доступ к премиальным играм и эксклюзивным бонусам." />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - Login Form */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-md mx-auto lg:mx-0"
              >
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-8">
                  <div className="text-center mb-8">
                    {/* AUREX Logo */}
                    <div className="relative mx-auto mb-6 flex justify-center">
                      <div className="absolute inset-0 bg-aurex-gold-500 blur-2xl opacity-30"></div>
                      <Image
                        src="/images/aurexlogo.png"
                        alt="AUREX"
                        width={120}
                        height={50}
                        className="relative h-12 w-auto drop-shadow-lg"
                      />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
                      {t('auth.welcome')}
                    </h1>
                    <p className="text-aurex-platinum-400 text-sm sm:text-base">
                      {t('auth.loginToAccount')}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Login (Email or Username) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Логин / Email / Телефон
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          {...register('login', {
                            required: 'Введите логин, email или телефон'
                          })}
                          className={`w-full pl-10 pr-4 py-3 bg-dark-200 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all ${
                            errors.login ? 'border-red-500' : 'border-gray-700'
                          }`}
                          placeholder="Логин, email или телефон"
                        />
                      </div>
                      {errors.login && (
                        <p className="mt-1 text-sm text-red-400">{errors.login.message}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('auth.password')}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          {...register('password', {
                            required: 'Пароль обязателен',
                            minLength: {
                              value: 6,
                              message: 'Пароль должен быть не менее 6 символов'
                            }
                          })}
                          className={`w-full pl-10 pr-12 py-3 bg-dark-200 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all ${
                            errors.password ? 'border-red-500' : 'border-gray-700'
                          }`}
                          placeholder="Введите пароль"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Remember & Forgot */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          {...register('remember')}
                          className="w-5 h-5 rounded border-2 border-aurex-gold-500/50 bg-aurex-obsidian-900 text-aurex-gold-500 focus:ring-aurex-gold-500 focus:ring-offset-0 cursor-pointer checked:bg-aurex-gold-500 checked:border-aurex-gold-500"
                        />
                        <span className="text-gray-300 text-sm group-hover:text-white transition-colors">{t('auth.rememberMe')}</span>
                      </label>
                      
                      <Link
                        href="/forgot-password"
                        className="text-aurex-gold-500 hover:text-aurex-gold-400 text-sm transition-colors"
                      >
                        Забыли пароль?
                      </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="w-full bg-casino-gold text-black py-3 rounded-lg font-bold text-lg hover:bg-casino-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isSubmitting || isLoading ? (
                        <div className="loading-spinner w-5 h-5"></div>
                      ) : (
                        <>
                          <LogIn className="w-5 h-5" />
                          <span>{t('nav.login')}</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Social Login Divider */}
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-700"></div>
                    <span className="text-gray-500 text-sm">или</span>
                    <div className="flex-1 h-px bg-gray-700"></div>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="mt-4 space-y-3">
                    {/* Google */}
                    <button
                      type="button"
                      onClick={() => { window.location.href = '/api/auth/google'; }}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Войти через Google
                    </button>

                    {/* Telegram Widget */}
                    <TelegramLoginButton
                      botName="aurex_support_bot"
                      onAuth={handleTelegramAuth}
                    />
                  </div>

                  {/* Register Link */}
                  <div className="mt-8 text-center">
                    <p className="text-gray-400">
                      {t('auth.noAccount')}{' '}
                      <Link
                        href="/register"
                        className="text-casino-gold hover:text-casino-gold-dark font-medium transition-colors"
                      >
                        {t('auth.registerNow')}
                      </Link>
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Right Side - Benefits */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-8"
              >
                <div className="text-center lg:text-left">
                  <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-4">
                    Почему выбирают{' '}
                    <span className="aurex-imperial-text">
                      AUREX
                    </span>
                  </h2>
                  <p className="text-xl text-gray-300">
                    Присоединяйтесь к тысячам довольных игроков
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="bg-dark-100 border border-gray-800 rounded-lg p-6 hover:border-casino-gold transition-colors"
                    >
                      <benefit.icon className="w-12 h-12 text-casino-gold mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-400">
                        {benefit.description}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Demo Link */}
                <div className="text-center lg:text-left">
                  <Link
                    href="/games"
                    className="inline-flex items-center space-x-2 text-casino-gold hover:text-casino-gold-dark transition-colors"
                  >
                    <span>Попробовать демо режим</span>
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      →
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}