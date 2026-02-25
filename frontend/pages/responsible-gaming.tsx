import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Shield,
  Clock,
  AlertTriangle,
  Ban,
  Calendar,
  Wallet,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle,
  Info,
  HeartHandshake,
  Timer,
  Lock
} from 'lucide-react';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';

export default function ResponsibleGamingPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const [limits, setLimits] = useState({
    dailyDeposit: '',
    weeklyDeposit: '',
    monthlyDeposit: '',
    sessionTime: '',
    lossLimit: ''
  });
  const [selfExcludePeriod, setSelfExcludePeriod] = useState('');
  const [cooldownPeriod, setCooldownPeriod] = useState('');

  const handleSetLimits = () => {
    toast.success('Лимиты успешно установлены');
  };

  const handleSelfExclude = () => {
    if (!selfExcludePeriod) {
      toast.error('Выберите период самоисключения');
      return;
    }
    toast.success(`Самоисключение активировано на ${selfExcludePeriod}`);
  };

  const handleCooldown = () => {
    if (!cooldownPeriod) {
      toast.error('Выберите период охлаждения');
      return;
    }
    toast.success(`Период охлаждения активирован на ${cooldownPeriod}`);
  };

  const helpResources = [
    { name: 'Gamblers Anonymous', url: 'https://www.gamblersanonymous.org', region: 'International' },
    { name: 'BeGambleAware', url: 'https://www.begambleaware.org', region: 'UK' },
    { name: 'Spielsucht Hilfe', url: 'https://www.spielsucht-hilfe.de', region: 'Germany' },
    { name: 'GamCare', url: 'https://www.gamcare.org.uk', region: 'UK' },
  ];

  const warningSignsQuestions = [
    'Вы тратите на игру больше денег, чем можете себе позволить?',
    'Вы играете, чтобы отвлечься от проблем или стресса?',
    'Вы занимаете деньги для игры?',
    'Вы чувствуете беспокойство, когда не играете?',
    'Вы пытаетесь отыграться после проигрыша?',
    'Игра негативно влияет на ваши отношения или работу?'
  ];

  return (
    <>
      <Head>
        <title>{t('footer.responsibleGaming')} - AUREX</title>
        <meta name="description" content={t('footer.responsibleGaming')} />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          {/* Hero */}
          <section className="relative overflow-hidden py-12 sm:py-16">
            <div className="absolute inset-0 aurex-backdrop"></div>
            
            <div className="relative max-w-4xl mx-auto px-4 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
                    <HeartHandshake className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black mb-4 text-white">
                  {t('footer.responsibleGaming')}
                </h1>
                
                <p className="text-aurex-platinum-300 max-w-2xl mx-auto">
                  AUREX заботится о благополучии своих игроков. Мы предоставляем инструменты 
                  для контроля игровой активности и поддерживаем ответственное отношение к игре.
                </p>
              </motion.div>
            </div>
          </section>

          <div className="max-w-6xl mx-auto px-4">
            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl"
              >
                <Clock className="w-10 h-10 text-blue-500 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Лимиты по времени</h3>
                <p className="text-aurex-platinum-400 text-sm">
                  Установите ограничение на время игровой сессии, чтобы контролировать свою активность.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl"
              >
                <Wallet className="w-10 h-10 text-green-500 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Лимиты депозитов</h3>
                <p className="text-aurex-platinum-400 text-sm">
                  Ограничьте сумму депозитов за день, неделю или месяц для управления бюджетом.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl"
              >
                <Ban className="w-10 h-10 text-red-500 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Самоисключение</h3>
                <p className="text-aurex-platinum-400 text-sm">
                  Временно или постоянно заблокируйте доступ к аккаунту, если чувствуете необходимость.
                </p>
              </motion.div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Tools */}
              <div className="space-y-6">
                {/* Deposit Limits */}
                {isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                  >
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                      <Wallet className="w-6 h-6 text-aurex-gold-500" />
                      <span>Лимиты депозитов</span>
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">Дневной лимит (₽)</label>
                        <input
                          type="number"
                          value={limits.dailyDeposit}
                          onChange={(e) => setLimits({ ...limits, dailyDeposit: e.target.value })}
                          placeholder="Без ограничений"
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">Недельный лимит (₽)</label>
                        <input
                          type="number"
                          value={limits.weeklyDeposit}
                          onChange={(e) => setLimits({ ...limits, weeklyDeposit: e.target.value })}
                          placeholder="Без ограничений"
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-aurex-platinum-400 mb-2">Месячный лимит (₽)</label>
                        <input
                          type="number"
                          value={limits.monthlyDeposit}
                          onChange={(e) => setLimits({ ...limits, monthlyDeposit: e.target.value })}
                          placeholder="Без ограничений"
                          className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none"
                        />
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-300">
                            Увеличение лимита вступит в силу через 24 часа. Уменьшение применяется сразу.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleSetLimits}
                        className="w-full py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl"
                      >
                        Сохранить лимиты
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Session Limits */}
                {isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                  >
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                      <Timer className="w-6 h-6 text-aurex-gold-500" />
                      <span>Напоминание о времени</span>
                    </h2>

                    <p className="text-aurex-platinum-400 text-sm mb-4">
                      Получайте напоминание каждые N минут о времени, проведённом в игре.
                    </p>

                    <select
                      value={limits.sessionTime}
                      onChange={(e) => setLimits({ ...limits, sessionTime: e.target.value })}
                      className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none mb-4"
                    >
                      <option value="">Отключено</option>
                      <option value="30">Каждые 30 минут</option>
                      <option value="60">Каждый час</option>
                      <option value="120">Каждые 2 часа</option>
                    </select>

                    <button className="w-full py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 font-medium rounded-xl border border-aurex-gold-500/20">
                      Установить напоминание
                    </button>
                  </motion.div>
                )}

                {/* Cooldown Period */}
                {isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-yellow-500/20 rounded-2xl p-6"
                  >
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                      <Clock className="w-6 h-6 text-yellow-500" />
                      <span>Период охлаждения</span>
                    </h2>

                    <p className="text-aurex-platinum-400 text-sm mb-4">
                      Сделайте короткий перерыв от игры. Доступ к аккаунту будет временно ограничен.
                    </p>

                    <select
                      value={cooldownPeriod}
                      onChange={(e) => setCooldownPeriod(e.target.value)}
                      className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none mb-4"
                    >
                      <option value="">Выберите период</option>
                      <option value="24 часа">24 часа</option>
                      <option value="48 часов">48 часов</option>
                      <option value="7 дней">7 дней</option>
                    </select>

                    <button
                      onClick={handleCooldown}
                      className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl"
                    >
                      Активировать перерыв
                    </button>
                  </motion.div>
                )}

                {/* Self Exclusion */}
                {isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-aurex-obsidian-800 border border-red-500/20 rounded-2xl p-6"
                  >
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                      <Ban className="w-6 h-6 text-red-500" />
                      <span>Самоисключение</span>
                    </h2>

                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-300">
                          Это действие нельзя отменить досрочно! Вы не сможете войти в аккаунт до окончания выбранного периода.
                        </p>
                      </div>
                    </div>

                    <select
                      value={selfExcludePeriod}
                      onChange={(e) => setSelfExcludePeriod(e.target.value)}
                      className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-xl text-white focus:border-aurex-gold-500/50 focus:outline-none mb-4"
                    >
                      <option value="">Выберите период</option>
                      <option value="1 месяц">1 месяц</option>
                      <option value="3 месяца">3 месяца</option>
                      <option value="6 месяцев">6 месяцев</option>
                      <option value="1 год">1 год</option>
                      <option value="Навсегда">Навсегда</option>
                    </select>

                    <button
                      onClick={handleSelfExclude}
                      className="w-full py-3 bg-red-500 text-white font-bold rounded-xl"
                    >
                      Активировать самоисключение
                    </button>
                  </motion.div>
                )}

                {!isAuthenticated && (
                  <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-8 text-center">
                    <Lock className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                    <h3 className="text-lg font-bold text-white mb-2">Войдите в аккаунт</h3>
                    <p className="text-aurex-platinum-400 mb-6">
                      Для настройки лимитов и инструментов самоконтроля необходимо авторизоваться.
                    </p>
                    <Link href="/login" className="inline-block px-6 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-xl">
                      Войти
                    </Link>
                  </div>
                )}
              </div>

              {/* Right Column - Information */}
              <div className="space-y-6">
                {/* Warning Signs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                >
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    <span>Признаки проблемной игры</span>
                  </h2>

                  <p className="text-aurex-platinum-400 text-sm mb-4">
                    Если вы ответите "да" на несколько вопросов, возможно, стоит обратиться за помощью:
                  </p>

                  <div className="space-y-3">
                    {warningSignsQuestions.map((question, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-aurex-obsidian-900/50 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-aurex-platinum-300 text-sm">{question}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Tips */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                >
                  <h2 className="text-xl font-bold text-white mb-4">Советы для ответственной игры</h2>

                  <div className="space-y-3">
                    {[
                      'Устанавливайте бюджет перед началом игры и придерживайтесь его',
                      'Не играйте на деньги, которые вы не можете позволить себе потерять',
                      'Не пытайтесь отыграться — это часто приводит к большим потерям',
                      'Делайте регулярные перерывы во время игры',
                      'Не играйте под влиянием алкоголя или эмоций',
                      'Игра должна быть развлечением, а не способом заработка'
                    ].map((tip, idx) => (
                      <div key={idx} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-aurex-platinum-300 text-sm">{tip}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Help Resources */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
                >
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                    <Phone className="w-6 h-6 text-aurex-gold-500" />
                    <span>Помощь и поддержка</span>
                  </h2>

                  <p className="text-aurex-platinum-400 text-sm mb-4">
                    Если вы или кто-то из ваших близких нуждается в помощи:
                  </p>

                  <div className="space-y-3">
                    {helpResources.map((resource) => (
                      <a
                        key={resource.name}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-aurex-obsidian-900/50 rounded-lg hover:bg-aurex-obsidian-700 transition-colors"
                      >
                        <div>
                          <div className="text-white font-medium">{resource.name}</div>
                          <div className="text-xs text-aurex-platinum-500">{resource.region}</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-aurex-gold-500" />
                      </a>
                    ))}
                  </div>
                </motion.div>

                {/* Contact */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6"
                >
                  <h3 className="text-lg font-bold text-white mb-2">Нужна помощь?</h3>
                  <p className="text-aurex-platinum-400 text-sm mb-4">
                    Наша команда поддержки готова помочь вам 24/7.
                  </p>
                  <a
                    href="mailto:support@aurex.casino"
                    className="flex items-center space-x-2 text-green-400 hover:text-green-300"
                  >
                    <Mail className="w-5 h-5" />
                    <span>support@aurex.casino</span>
                  </a>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
