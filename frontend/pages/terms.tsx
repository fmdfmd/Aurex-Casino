import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FileText, Shield, Scale, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';

export default function TermsPage() {
  const { t } = useTranslation();
  
  return (
    <>
      <Head>
        <title>{t('footer.terms')} - AUREX</title>
        <meta name="description" content={t('footer.terms')} />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-aurex-gold-500/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-aurex-gold-500" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">{t('footer.terms')}</h1>
              <p className="text-aurex-platinum-400">Последнее обновление: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="prose prose-invert max-w-none"
            >
              <div className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 sm:p-8 space-y-8">
                <section>
                  <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                    <Scale className="w-5 h-5" />
                    <span>1. Общие положения</span>
                  </h2>
                  <div className="text-aurex-platinum-300 space-y-3">
                    <p>1.1. Настоящие Правила и условия регулируют использование онлайн-платформы AUREX, управляемой компанией AUREX Entertainment Ltd.</p>
                    <p>1.2. Регистрируясь на платформе, вы подтверждаете, что ознакомились с настоящими правилами и согласны с ними.</p>
                    <p>1.3. AUREX оставляет за собой право изменять настоящие правила с уведомлением пользователей.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">2. Регистрация и аккаунт</h2>
                  <div className="text-aurex-platinum-300 space-y-3">
                    <p>2.1. Для использования платформы необходимо создать учётную запись, предоставив достоверную информацию.</p>
                    <p>2.2. Минимальный возраст для регистрации — 18 лет (или возраст совершеннолетия в вашей юрисдикции).</p>
                    <p>2.3. Каждый пользователь может иметь только одну учётную запись.</p>
                    <p>2.4. Вы несёте ответственность за сохранность учётных данных.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">3. Депозиты и выводы</h2>
                  <div className="text-aurex-platinum-300 space-y-3">
                    <p>3.1. Минимальный депозит составляет ₽1,000 или эквивалент в криптовалюте.</p>
                    <p>3.2. Минимальный вывод составляет ₽2,000.</p>
                    <p>3.3. Для вывода средств необходимо пройти процедуру KYC (верификацию личности).</p>
                    <p>3.4. Время обработки вывода зависит от выбранного метода и VIP-уровня пользователя.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">4. Бонусы и акции</h2>
                  <div className="text-aurex-platinum-300 space-y-3">
                    <p>4.1. Все бонусы подлежат условиям отыгрыша (вейджера), указанным в описании акции.</p>
                    <p>4.2. Стандартный вейджер составляет x30 от суммы депозита и бонуса.</p>
                    <p>4.3. Бонусные средства нельзя вывести до выполнения условий отыгрыша.</p>
                    <p>4.4. AUREX оставляет за собой право отменить бонус при обнаружении злоупотреблений.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">5. Игры и честность</h2>
                  <div className="text-aurex-platinum-300 space-y-3">
                    <p>5.1. Все игры на платформе используют сертифицированные генераторы случайных чисел (RNG).</p>
                    <p>5.2. RTP (возврат игроку) каждой игры указан в её информации.</p>
                    <p>5.3. Результаты игр проверяются независимыми аудиторами.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">6. Ответственная игра</h2>
                  <div className="text-aurex-platinum-300 space-y-3">
                    <p>6.1. AUREX поддерживает ответственное отношение к игре.</p>
                    <p>6.2. Пользователи могут установить лимиты на депозиты, проигрыши и время сессии.</p>
                    <p>6.3. Доступна функция самоисключения на различные периоды.</p>
                    <p>6.4. При признаках проблемной игры рекомендуем обратиться за помощью.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-aurex-gold-500 mb-4">7. Запрещённые действия</h2>
                  <div className="text-aurex-platinum-300 space-y-3">
                    <p>7.1. Запрещено создание нескольких аккаунтов.</p>
                    <p>7.2. Запрещено использование ботов, скриптов и автоматизации.</p>
                    <p>7.3. Запрещено мошенничество, отмывание денег и другие незаконные действия.</p>
                    <p>7.4. Нарушение правил влечёт блокировку аккаунта и конфискацию средств.</p>
                  </div>
                </section>

                <div className="p-4 bg-aurex-gold-500/10 border border-aurex-gold-500/30 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-medium mb-1">Важно</div>
                      <p className="text-sm text-aurex-platinum-400">
                        Азартные игры могут вызывать зависимость. Играйте ответственно и только на те деньги, 
                        которые вы можете позволить себе потерять.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
}
