import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle,
  ChevronDown,
  Search,
  Wallet,
  Gift,
  Shield,
  Users,
  Gamepad2,
  MessageCircle,
  Mail,
  Crown
} from 'lucide-react';
import Layout from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

export default function FAQPage() {
  const { t } = useTranslation();
  
  const faqData: FAQCategory[] = [
  {
    id: 'general',
    name: t('faq.general'),
    icon: <HelpCircle className="w-5 h-5" />,
    items: [
      {
        question: 'Что такое AUREX?',
        answer: 'AUREX — это премиальная онлайн-игровая платформа для High-roller и Crypto-investors. Мы предлагаем широкий выбор слотов, настольных игр и live-казино от ведущих провайдеров, а также мгновенные крипто-выплаты и эксклюзивную VIP программу.'
      },
      {
        question: 'Как зарегистрироваться?',
        answer: 'Для регистрации нажмите кнопку "Регистрация" в верхнем правом углу сайта. Введите email, придумайте пароль и подтвердите свой возраст (18+). После этого вы получите доступ ко всем функциям платформы.'
      },
      {
        question: 'В каких странах доступен AUREX?',
        answer: 'AUREX доступен в Германии, Скандинавии, Нидерландах, Испании, Италии, Польше, странах СНГ и LATAM. Доступность зависит от локального законодательства вашей страны.'
      },
      {
        question: 'Какой минимальный возраст для игры?',
        answer: 'Для использования платформы вам должно быть минимум 18 лет (или возраст совершеннолетия в вашей юрисдикции). Мы строго следим за соблюдением этого требования.'
      }
    ]
  },
  {
    id: 'deposits',
    name: t('faq.deposits'),
    icon: <Wallet className="w-5 h-5" />,
    items: [
      {
        question: 'Какие способы пополнения доступны?',
        answer: 'Мы поддерживаем криптовалюты (Bitcoin, Ethereum, USDT TRC20/ERC20, BNB, Litecoin), а также банковские карты Visa/Mastercard и банковские переводы. Крипто-депозиты обрабатываются мгновенно и без комиссии.'
      },
      {
        question: 'Какой минимальный депозит?',
        answer: 'Минимальный депозит зависит от способа оплаты: криптовалюты — от ₽1,000 эквивалента, карты — от ₽1,000, банковский перевод — от ₽5,000.'
      },
      {
        question: 'Как быстро зачисляется депозит?',
        answer: 'Крипто-депозиты зачисляются после 1-3 подтверждений сети (обычно 5-30 минут). Карточные платежи — мгновенно. Банковские переводы — 1-3 рабочих дня.'
      },
      {
        question: 'Берётся ли комиссия за депозит?',
        answer: 'Криптовалютные депозиты — без комиссии. Карты Visa/MC — 2.5%. Банковские переводы — без комиссии.'
      }
    ]
  },
  {
    id: 'withdrawals',
    name: t('faq.withdrawals'),
    icon: <Wallet className="w-5 h-5" />,
    items: [
      {
        question: 'Как вывести выигрыш?',
        answer: 'Перейдите в раздел "Кошелёк", выберите вкладку "Вывод", укажите криптовалюту и адрес кошелька, введите сумму и подтвердите операцию.'
      },
      {
        question: 'Какой минимальный вывод?',
        answer: 'Минимальная сумма вывода — ₽2,000. Для VIP игроков (Gold и выше) — ₽1,000.'
      },
      {
        question: 'Как быстро обрабатываются выводы?',
        answer: 'Время обработки зависит от вашего VIP уровня: Bronze — 24ч, Silver — 12ч, Gold — 6ч, Platinum — 1ч, Emperor — мгновенно 24/7.'
      },
      {
        question: 'Нужна ли верификация для вывода?',
        answer: 'Да, для первого вывода необходимо пройти KYC верификацию. Загрузите документ, удостоверяющий личность, и подтверждение адреса. Верификация занимает до 24 часов.'
      }
    ]
  },
  {
    id: 'bonuses',
    name: t('faq.bonuses'),
    icon: <Gift className="w-5 h-5" />,
    items: [
      {
        question: 'Какой приветственный бонус?',
        answer: 'Приветственный пакет включает: 1-й депозит — 200% до ₽50,000 + 100 FS, 2-й депозит — 150% до ₽40,000 + 75 FS, 3-й депозит — 100% до ₽30,000 + 50 FS, 4-й депозит — 75% до ₽20,000 + 25 супер-спинов. Общий бонус до ₽140,000 + 250 фриспинов!'
      },
      {
        question: 'Что такое вейджер?',
        answer: 'Вейджер — это условие отыгрыша бонуса. Например, вейджер x30 означает, что сумму депозита + бонуса нужно прокрутить в ставках 30 раз перед выводом. Прогресс отыгрыша отображается в разделе "Кошелёк".'
      },
      {
        question: 'Можно ли отказаться от бонуса?',
        answer: 'Да, при пополнении вы можете снять галочку "Активировать бонус". В этом случае депозит будет зачислен без бонуса и без требований к отыгрышу.'
      },
      {
        question: 'Что такое Golden Drops?',
        answer: 'Golden Drops — это случайные фриспины, которые падают активным игрокам прямо во время игры. Чем больше вы играете, тем чаще получаете дропы. Фриспины начисляются без вейджера!'
      }
    ]
  },
  {
    id: 'vip',
    name: t('faq.vipProgram'),
    icon: <Crown className="w-5 h-5" />,
    items: [
      {
        question: 'Как работает VIP программа?',
        answer: 'Empire Levels — это 5 уровней: Bronze, Silver, Gold, Platinum, Emperor. Вы зарабатываете VIP очки за каждую ставку (₽100 = 1 очко). Чем выше уровень, тем больше привилегий: повышенный кэшбэк (до 15%), быстрые выводы, персональный менеджер.'
      },
      {
        question: 'Как получить персонального менеджера?',
        answer: 'Персональный VIP менеджер доступен игрокам уровня Platinum (25,000 очков) и Emperor (100,000 очков). Менеджер доступен 24/7 для решения любых вопросов.'
      },
      {
        question: 'Сгорают ли VIP очки?',
        answer: 'Нет, заработанные VIP очки никогда не сгорают. Однако для поддержания уровня необходима минимальная активность — хотя бы одна ставка в месяц.'
      }
    ]
  },
  {
    id: 'games',
    name: t('faq.games'),
    icon: <Gamepad2 className="w-5 h-5" />,
    items: [
      {
        question: 'Какие игры доступны?',
        answer: 'Мы предлагаем более 3000 игр: слоты от Pragmatic Play, NetEnt, Play\'n GO, Hacksaw Gaming, настольные игры (рулетка, блэкджек, баккара) и live-казино с реальными дилерами от Evolution Gaming.'
      },
      {
        question: 'Можно ли играть бесплатно?',
        answer: 'Да, большинство слотов доступны в демо-режиме. Нажмите "Демо" на карточке игры, чтобы попробовать без риска. Live-казино доступно только на реальные деньги.'
      },
      {
        question: 'Игры честные?',
        answer: 'Абсолютно. Все игры используют сертифицированный RNG (генератор случайных чисел), проверенный независимыми аудиторами. RTP (возврат игроку) указан в информации каждой игры.'
      }
    ]
  },
  {
    id: 'security',
    name: t('faq.security'),
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        question: 'Как защищены мои данные?',
        answer: 'Мы используем 256-битное SSL шифрование для всех соединений. Персональные данные хранятся на защищённых серверах в соответствии с GDPR. Финансовые транзакции обрабатываются через надёжных платёжных провайдеров.'
      },
      {
        question: 'Что такое 2FA?',
        answer: 'Двухфакторная аутентификация (2FA) добавляет дополнительный уровень защиты. При входе, помимо пароля, потребуется код из приложения Google Authenticator. Рекомендуем включить 2FA в настройках профиля.'
      },
      {
        question: 'Что делать, если забыл пароль?',
        answer: 'На странице входа нажмите "Забыли пароль?", введите email и следуйте инструкциям в письме для восстановления доступа.'
      }
    ]
  }
];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('general');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (question: string) => {
    setOpenItems(prev => 
      prev.includes(question) 
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  const filteredData = searchTerm
    ? faqData.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(cat => cat.items.length > 0)
    : faqData.filter(cat => cat.id === activeCategory);

  return (
    <>
      <Head>
        <title>{t('footer.faq')} - {t('faq.title')} - AUREX</title>
        <meta name="description" content={t('faq.subtitle')} />
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
                  <Image
                    src="/images/aurexlogo.png"
                    alt="AUREX"
                    width={100}
                    height={40}
                    className="h-10 w-auto"
                  />
                </div>

                <h1 className="text-3xl sm:text-4xl font-black mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
                  <span className="aurex-imperial-text">{t('faq.title')}</span>
                </h1>
                
                <p className="text-aurex-platinum-300 mb-8">
                  {t('faq.subtitle')}
                </p>

                {/* Search */}
                <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-aurex-platinum-500" />
                  <input
                    type="text"
                    placeholder={t('faq.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl text-white placeholder-aurex-platinum-500 focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
              </motion.div>
            </div>
          </section>

          <div className="max-w-6xl mx-auto px-4">
            {/* Categories */}
            {!searchTerm && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {faqData.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
                      activeCategory === cat.id
                        ? 'bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900'
                        : 'bg-aurex-obsidian-800 text-aurex-platinum-300 border border-aurex-gold-500/20 hover:border-aurex-gold-500/50'
                    }`}
                  >
                    {cat.icon}
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* FAQ Items */}
            <div className="max-w-3xl mx-auto">
              {filteredData.map((category) => (
                <div key={category.id} className="mb-8">
                  {searchTerm && (
                    <h2 className="text-lg font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                      {category.icon}
                      <span>{category.name}</span>
                    </h2>
                  )}
                  
                  <div className="space-y-3">
                    {category.items.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(item.question)}
                          className="w-full flex items-center justify-between p-5 text-left"
                        >
                          <span className="text-white font-medium pr-4">{item.question}</span>
                          <ChevronDown 
                            className={`w-5 h-5 text-aurex-gold-500 flex-shrink-0 transition-transform ${
                              openItems.includes(item.question) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        
                        <AnimatePresence>
                          {openItems.includes(item.question) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 text-aurex-platinum-400 border-t border-aurex-gold-500/10 pt-4">
                                {item.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 text-aurex-platinum-600" />
                  <p className="text-aurex-platinum-400">{t('faq.notFound')}</p>
                </div>
              )}
            </div>

            {/* Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto mt-12 p-8 bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl text-center"
            >
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-aurex-gold-500" />
              <h2 className="text-2xl font-bold text-white mb-2">{t('faq.noAnswer')}</h2>
              <p className="text-aurex-platinum-400 mb-6">
                {t('faq.supportReady')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:support@aurex.casino"
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-aurex-obsidian-700 text-aurex-platinum-300 rounded-xl border border-aurex-gold-500/20 hover:border-aurex-gold-500/50 transition-all"
                >
                  <Mail className="w-5 h-5" />
                  <span>support@aurex.casino</span>
                </a>
                <button className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-aurex-gold-500 to-aurex-gold-600 text-aurex-obsidian-900 font-bold rounded-xl">
                  <MessageCircle className="w-5 h-5" />
                  <span>{t('support.liveChat')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
}
