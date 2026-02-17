import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, ArrowLeft, Check } from 'lucide-react';
import Layout from '../components/Layout';
import { toast } from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'phone' | 'code' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use existing uCaller phone verification service
      const res = await fetch('/api/otp/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'forgot_password' })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Сейчас вам позвонят! Введите последние 4 цифры номера.');
        setStep('code');
      } else {
        toast.error(data.error || 'Ошибка звонка');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 4) {
      toast.error('Код должен состоять из 4 цифр');
      return;
    }

    setLoading(true);

    try {
      // Verify code using existing uCaller service
      const res = await fetch('/api/otp/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, purpose: 'forgot_password' })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Код подтвержден!');
        setStep('password');
      } else {
        toast.error(data.error || 'Неверный код');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, newPassword })
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Пароль успешно изменен!');
        setTimeout(() => window.location.href = '/login', 2000);
      } else {
        toast.error(data.error || 'Ошибка сброса пароля');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Восстановление пароля - AUREX Casino</title>
      </Head>
      <Layout>
        <div className="min-h-screen bg-aurex-obsidian-900 flex items-center justify-center px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-8 shadow-2xl">
              {/* Back to Login */}
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-aurex-platinum-400 hover:text-aurex-gold-500 mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад ко входу
              </Link>

              {/* Title */}
              <h1 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                Восстановление пароля
              </h1>
              <p className="text-aurex-platinum-400 mb-8">
                {step === 'phone' && 'Введите номер телефона, мы вам позвоним'}
                {step === 'code' && 'Введите последние 4 цифры входящего номера'}
                {step === 'password' && 'Введите новый пароль'}
              </p>

              {/* Step 1: Phone */}
              {step === 'phone' && (
                <form onSubmit={handleRequestCode}>
                  <div className="mb-6">
                    <label className="block text-aurex-platinum-400 mb-2 text-sm font-medium">
                      Номер телефона
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-aurex-gold-500" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+7 (999) 123-45-67"
                        className="w-full bg-aurex-obsidian-900 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-aurex-gold-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 hover:from-aurex-gold-400 hover:to-aurex-gold-500 text-aurex-obsidian-900 font-black py-3 rounded-xl transition-all shadow-lg shadow-aurex-gold-500/30 disabled:opacity-50"
                  >
                    {loading ? 'Звоним...' : 'Позвонить мне'}
                  </button>
                </form>
              )}

              {/* Step 2: Code */}
              {step === 'code' && (
                <form onSubmit={handleVerifyCode}>
                  <div className="mb-6">
                    <label className="block text-aurex-platinum-400 mb-2 text-sm font-medium">
                      Последние 4 цифры
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      maxLength={4}
                      className="w-full bg-aurex-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-3xl tracking-[0.5em] focus:border-aurex-gold-500 focus:outline-none transition-colors font-mono"
                      required
                    />
                    <p className="text-xs text-aurex-platinum-500 mt-2 text-center">
                      Введите последние 4 цифры входящего номера телефона
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 hover:from-aurex-gold-400 hover:to-aurex-gold-500 text-aurex-obsidian-900 font-black py-3 rounded-xl transition-all shadow-lg shadow-aurex-gold-500/30 disabled:opacity-50"
                  >
                    {loading ? 'Проверка...' : 'Подтвердить код'}
                  </button>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === 'password' && (
                <form onSubmit={handleResetPassword}>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-aurex-platinum-400 mb-2 text-sm font-medium">
                        Новый пароль
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        className="w-full bg-aurex-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-aurex-gold-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-aurex-platinum-400 mb-2 text-sm font-medium">
                        Повторите пароль
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите новый пароль"
                        className="w-full bg-aurex-obsidian-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-aurex-gold-500 focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 hover:from-aurex-gold-400 hover:to-aurex-gold-500 text-aurex-obsidian-900 font-black py-3 rounded-xl transition-all shadow-lg shadow-aurex-gold-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Сохранение...' : (
                      <>
                        <Check className="w-5 h-5" />
                        Сохранить пароль
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </Layout>
    </>
  );
}
