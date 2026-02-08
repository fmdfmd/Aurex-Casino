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
  User,
  UserPlus,
  Crown,
  Gift,
  Check,
  Star,
  Phone
} from 'lucide-react';
import axios from 'axios';
import InputMask from 'react-input-mask';
import Image from 'next/image';
import { useAuthStore } from '../store/authStore';
import Layout from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import TelegramLoginButton, { TelegramUser } from '../components/TelegramLoginButton';

interface RegisterForm {
  username: string;
  phone: string;
  smsCode: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  terms: boolean;
  newsletter: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, loginWithTelegram, isLoading, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const handleTelegramAuth = useCallback(async (tgUser: TelegramUser) => {
    try {
      await loginWithTelegram(tgUser as unknown as Record<string, string>);
      router.push('/');
    } catch (e) {
      // handled by store
    }
  }, [loginWithTelegram, router]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [smsError, setSmsError] = useState('');
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<RegisterForm>({
    defaultValues: {
      referralCode: (router.query.ref as string) || ''
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Pre-fill referral code from URL ?ref=XXX
  useEffect(() => {
    if (router.isReady && router.query.ref) {
      setValue('referralCode', router.query.ref as string);
    }
  }, [router.isReady, router.query.ref, setValue]);

  // SMS countdown timer
  useEffect(() => {
    if (smsCountdown <= 0) return;
    const timer = setTimeout(() => setSmsCountdown(smsCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [smsCountdown]);

  const password = watch('password');
  const phoneValue = watch('phone');

  const sendCallCode = async () => {
    const phone = phoneValue?.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      setSmsError('Введите корректный номер телефона');
      return;
    }
    setSmsError('');
    try {
      await axios.post('/api/auth/otp/sms/send', { phone });
      setSmsSent(true);
      setSmsCountdown(15);
    } catch (err: any) {
      setSmsError(err.response?.data?.error || 'Ошибка звонка');
    }
  };

  const verifyCallCode = async () => {
    const phone = phoneValue?.replace(/\D/g, '');
    const code = watch('smsCode');
    if (!code || code.length < 4) {
      setSmsError('Введите последние 4 цифры номера');
      return;
    }
    setSmsError('');
    try {
      await axios.post('/api/auth/otp/sms/verify', { phone, code });
      setSmsVerified(true);
    } catch (err: any) {
      setSmsError(err.response?.data?.error || 'Неверный код');
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    if (!smsVerified) {
      setSmsError('Подтвердите номер телефона');
      return;
    }
    try {
      await registerUser({
        username: data.username,
        phone: data.phone,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        referralCode: data.referralCode
      });
      router.push('/');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const bonusFeatures = [
    '100,000₽ приветственный бонус',
    '200 бесплатных вращений',
    'Доступ к VIP программе',
    'Еженедельный кэшбэк до 25%',
    'Персональный менеджер',
    'Эксклюзивные турниры'
  ];

  return (
    <>
      <Head>
        <title>Вступить в Империю - AUREX</title>
        <meta name="description" content="Станьте частью Golden Empire - зарегистрируйтесь в AUREX и получите Imperial Welcome Bonus 100,000₽ + 200 фриспинов!" />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left Side - Registration Form */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-md mx-auto lg:mx-0"
              >
                <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 sm:p-8">
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
                    <h1 className="text-2xl sm:text-3xl font-heading font-bold aurex-imperial-text mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                      Вступить в Империю
                    </h1>
                    <p className="text-aurex-platinum-400 text-sm sm:text-base">
                      Станьте частью Golden Empire
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Имя пользователя *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          {...register('username', {
                            required: 'Имя пользователя обязательно',
                            minLength: {
                              value: 3,
                              message: 'Минимум 3 символа'
                            },
                            maxLength: {
                              value: 32,
                              message: 'Максимум 32 символа'
                            },
                            pattern: {
                              value: /^[a-zA-Z0-9_]+$/,
                              message: 'Только латинские буквы, цифры и _'
                            }
                          })}
                          className={`w-full pl-10 pr-4 py-3 bg-dark-200 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all ${
                            errors.username ? 'border-red-500' : 'border-gray-700'
                          }`}
                          placeholder="username123"
                        />
                      </div>
                      {errors.username && (
                        <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
                      )}
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Номер телефона *
                      </label>
                      <div className="space-y-3">
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <InputMask
                            mask="+7 (999) 999-99-99"
                            maskChar="_"
                            {...register('phone', {
                              required: 'Номер телефона обязателен',
                              validate: (value) => {
                                const digits = value?.replace(/\D/g, '') || '';
                                return digits.length === 11 || 'Введите полный номер телефона';
                              }
                            })}
                            className={`w-full pl-10 pr-28 py-3 bg-dark-200 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all ${
                              errors.phone || smsError ? 'border-red-500' : smsVerified ? 'border-green-500' : 'border-gray-700'
                            }`}
                            placeholder="+7 (___) ___-__-__"
                            disabled={smsVerified}
                          />
                          {!smsVerified && (
                            <button
                              type="button"
                              onClick={sendCallCode}
                              disabled={smsCountdown > 0}
                              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-casino-gold text-black text-xs font-bold rounded-md hover:bg-casino-gold-dark transition-colors disabled:opacity-50"
                            >
                              {smsCountdown > 0 ? `${smsCountdown}с` : smsSent ? 'Ещё раз' : 'Позвонить'}
                            </button>
                          )}
                          {smsVerified && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                          )}
                        </div>

                        {smsSent && !smsVerified && (
                          <>
                            <p className="text-xs text-gray-400 text-center">
                              Мы позвоним на ваш номер. Введите последние 4 цифры входящего номера.
                            </p>
                            <div className="relative">
                              <input
                                type="text"
                                {...register('smsCode')}
                                maxLength={4}
                                className="w-full pl-4 pr-28 py-3 bg-dark-200 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all text-center text-lg tracking-widest"
                                placeholder="_ _ _ _"
                              />
                              <button
                                type="button"
                                onClick={verifyCallCode}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-md hover:bg-green-500 transition-colors"
                              >
                                Подтвердить
                              </button>
                            </div>
                          </>
                        )}

                        {smsError && <p className="text-sm text-red-400">{smsError}</p>}
                        {errors.phone && <p className="text-sm text-red-400">{errors.phone.message}</p>}
                        {smsVerified && <p className="text-sm text-green-400">Телефон подтверждён</p>}
                      </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Имя
                        </label>
                        <input
                          type="text"
                          {...register('firstName', {
                            maxLength: {
                              value: 50,
                              message: 'Максимум 50 символов'
                            }
                          })}
                          className="w-full px-4 py-3 bg-dark-200 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all"
                          placeholder="Имя"
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-red-400">{errors.firstName.message}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Фамилия
                        </label>
                        <input
                          type="text"
                          {...register('lastName', {
                            maxLength: {
                              value: 50,
                              message: 'Максимум 50 символов'
                            }
                          })}
                          className="w-full px-4 py-3 bg-dark-200 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all"
                          placeholder="Фамилия"
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-red-400">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Пароль *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          {...register('password', {
                            required: 'Пароль обязателен',
                            minLength: {
                              value: 6,
                              message: 'Минимум 6 символов'
                            },
                            pattern: {
                              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                              message: 'Пароль должен содержать строчные, заглавные буквы и цифры'
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

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Подтвердите пароль *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...register('confirmPassword', {
                            required: 'Подтверждение пароля обязательно',
                            validate: value => value === password || 'Пароли не совпадают'
                          })}
                          className={`w-full pl-10 pr-12 py-3 bg-dark-200 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all ${
                            errors.confirmPassword ? 'border-red-500' : 'border-gray-700'
                          }`}
                          placeholder="Повторите пароль"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                      )}
                    </div>

                    {/* Referral Code */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Реферальный код (необязательно)
                      </label>
                      <input
                        type="text"
                        {...register('referralCode')}
                        className="w-full px-4 py-3 bg-dark-200 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-casino-gold transition-all"
                        placeholder="Введите код, если есть"
                      />
                    </div>

                    {/* Terms & Newsletter */}
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <div className="custom-checkbox mt-0.5">
                          <input
                            type="checkbox"
                            {...register('terms', {
                              required: 'Необходимо согласие с условиями'
                            })}
                          />
                          <div className="checkbox-mark"></div>
                        </div>
                        <span className="text-gray-300 text-sm leading-relaxed">
                          Я согласен с{' '}
                          <Link href="/terms" className="text-casino-gold hover:underline">
                            правилами использования
                          </Link>{' '}
                          и{' '}
                          <Link href="/privacy" className="text-casino-gold hover:underline">
                            политикой конфиденциальности
                          </Link>
                        </span>
                      </label>
                      {errors.terms && (
                        <p className="text-sm text-red-400">{errors.terms.message}</p>
                      )}

                      <label className="flex items-center space-x-3 cursor-pointer">
                        <div className="custom-checkbox">
                          <input
                            type="checkbox"
                            {...register('newsletter')}
                          />
                          <div className="checkbox-mark"></div>
                        </div>
                        <span className="text-gray-300 text-sm">
                          Получать новости и специальные предложения
                        </span>
                      </label>
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
                          <UserPlus className="w-5 h-5" />
                          <span>Создать аккаунт</span>
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

                  {/* Login Link */}
                  <div className="mt-8 text-center">
                    <p className="text-gray-400">
                      {t('auth.noAccount')}{' '}
                      <Link
                        href="/login"
                        className="text-casino-gold hover:text-casino-gold-dark font-medium transition-colors"
                      >
                        {t('nav.login')}
                      </Link>
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Right Side - Bonus Info */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-8"
              >
                {/* Bonus Card with Banner */}
                <div className="relative rounded-2xl text-white overflow-hidden">
                  {/* Background Banner */}
                  <div className="absolute inset-0">
                    <Image
                      src="/images/promos/deposit-1.png"
                      alt="Приветственный бонус 200%"
                      fill
                      className="object-cover"
                    />
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30"></div>
                  </div>
                  
                  <div className="relative z-10 p-8">
                    <div className="flex items-center space-x-3 mb-6">
                      <Gift className="w-8 h-8 drop-shadow-lg" />
                      <div>
                        <h2 className="text-2xl font-bold drop-shadow-lg">Приветственный бонус</h2>
                        <p className="opacity-90 drop-shadow-md">Для новых игроков</p>
                      </div>
                    </div>

                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold mb-2 drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                        до 100 000₽
                      </div>
                      <div className="text-xl drop-shadow-md">+ 200 фриспинов</div>
                    </div>

                    <div className="space-y-3">
                      {bonusFeatures.map((feature, index) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center space-x-3"
                        >
                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Check className="w-4 h-4" />
                          </div>
                          <span className="drop-shadow-md">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Why Choose Us */}
                <div className="bg-dark-100 border border-gray-800 rounded-2xl p-8">
                    <h3 className="text-2xl font-bold aurex-imperial-text mb-6 flex items-center space-x-2" style={{ fontFamily: 'Cinzel, serif' }}>
                    <Star className="w-6 h-6 text-aurex-gold-500" />
                    <span>Почему AUREX?</span>
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-casino-gold/20 rounded-lg flex items-center justify-center mt-1">
                        <Crown className="w-5 h-5 text-casino-gold" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">Лицензированное казино</h4>
                        <p className="text-gray-400 text-sm">
                          Официальная лицензия Кюрасао, честная игра
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-casino-green/20 rounded-lg flex items-center justify-center mt-1">
                        <Gift className="w-5 h-5 text-casino-green" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">Мгновенные выплаты</h4>
                        <p className="text-gray-400 text-sm">
                          Выводите выигрыши за 1-5 минут на любую карту
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-casino-purple/20 rounded-lg flex items-center justify-center mt-1">
                        <Star className="w-5 h-5 text-casino-purple" />
                      </div>
                      <div>
                        <h4 className="text-white font-semibold">2500+ игр</h4>
                        <p className="text-gray-400 text-sm">
                          Лучшие слоты от топовых провайдеров мира
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}