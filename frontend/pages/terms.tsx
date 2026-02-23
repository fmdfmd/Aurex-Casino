import Head from 'next/head';
import { motion } from 'framer-motion';
import { FileText, Shield, Scale, AlertTriangle, UserCheck, CreditCard, Gift, Gamepad2, Ban, Clock, Mail, Globe } from 'lucide-react';
import Layout from '../components/Layout';

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Правила и условия - AUREX Casino</title>
        <meta name="description" content="Правила и условия использования платформы AUREX Casino. Полная информация об условиях регистрации, депозитов, выводов, бонусов и ответственной игры." />
        <link rel="canonical" href="https://aurex.casino/terms" />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-4xl mx-auto px-4">
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
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">Правила и условия</h1>
              <p className="text-aurex-platinum-400 max-w-2xl mx-auto">
                Terms and Conditions — AUREX Casino
              </p>
              <p className="text-aurex-platinum-500 text-sm mt-2">
                Последнее обновление: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 sm:p-8 space-y-8"
            >
              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Scale className="w-5 h-5" />
                  <span>1. Общие положения</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>
                    1.1. Настоящие Правила и условия (далее — «Правила») регулируют использование онлайн-платформы
                    AUREX Casino (далее — «Платформа»), доступной по адресу <a href="https://aurex.casino" className="text-aurex-gold-500 hover:underline">aurex.casino</a>,
                    управляемой компанией Empire Gaming N.V. (далее — «Компания», «мы»).
                  </p>
                  <p>
                    1.2. Регистрируясь на Платформе, вы подтверждаете, что полностью ознакомились с настоящими Правилами,
                    <a href="/privacy" className="text-aurex-gold-500 hover:underline ml-1">Политикой конфиденциальности</a> и
                    <a href="/aml" className="text-aurex-gold-500 hover:underline ml-1">AML/KYC политикой</a>,
                    и безоговорочно согласны с ними.
                  </p>
                  <p>
                    1.3. Компания оставляет за собой право вносить изменения в настоящие Правила в любое время.
                    Обо всех существенных изменениях пользователи будут уведомлены по электронной почте или через уведомление на Платформе.
                    Продолжение использования Платформы после внесения изменений означает принятие обновлённых Правил.
                  </p>
                  <p>
                    1.4. В случае противоречия между настоящими Правилами и условиями конкретной акции или бонуса,
                    условия акции имеют преимущественную силу.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>2. Регистрация и аккаунт</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>2.1. Для использования Платформы необходимо создать учётную запись, предоставив достоверную и актуальную информацию.</p>
                  <p>2.2. Минимальный возраст для регистрации — <strong>18 лет</strong> (или возраст совершеннолетия в вашей юрисдикции, если он выше).</p>
                  <p>2.3. Каждый пользователь имеет право на <strong>одну учётную запись</strong>. Создание нескольких аккаунтов (мультиаккаунтинг) запрещено и влечёт блокировку всех связанных аккаунтов.</p>
                  <p>2.4. Вы несёте полную ответственность за сохранность учётных данных (логин, пароль). Компания не несёт ответственности за несанкционированный доступ к аккаунту вследствие небрежного хранения учётных данных.</p>
                  <p>2.5. Компания вправе запросить прохождение верификации (KYC) в любой момент. Отказ или уклонение от верификации может привести к ограничению функциональности аккаунта.</p>
                  <p>2.6. Компания оставляет за собой право отказать в регистрации или заблокировать аккаунт без объяснения причин, если имеются обоснованные подозрения в нарушении Правил.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>3. Депозиты и выводы</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <h3 className="text-white font-semibold mt-2">3.1. Депозиты</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Минимальный депозит через банковскую карту (P2P): <strong>5 000 ₽</strong></li>
                    <li>Минимальный депозит через СБП: <strong>3 000 ₽</strong></li>
                    <li>Максимальный депозит: <strong>300 000 ₽</strong> за транзакцию</li>
                    <li>Средства зачисляются на баланс после подтверждения платёжным провайдером</li>
                    <li>Депозиты обрабатываются только в рублях (RUB), с отображением в выбранной валюте</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">3.2. Выводы</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Минимальный вывод: <strong>1 000 ₽</strong></li>
                    <li>Для вывода необходимо пройти процедуру верификации (KYC)</li>
                    <li>Время обработки вывода: до 24 часов (зависит от VIP-уровня и метода)</li>
                    <li>Вывод на банковскую карту требует указания номера карты</li>
                    <li>Вывод через СБП требует указания номера телефона и выбора банка</li>
                    <li>Вывод средств заблокирован при наличии активного бонуса с незавершённым вейджером</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">3.3. Общие условия</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Все платежи обрабатываются через лицензированных платёжных провайдеров</li>
                    <li>Компания не взимает комиссию за депозиты. Комиссия платёжного провайдера может применяться</li>
                    <li>Компания оставляет за собой право запросить подтверждение источника средств при крупных транзакциях</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Gift className="w-5 h-5" />
                  <span>4. Бонусы и акции</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <h3 className="text-white font-semibold mt-2">4.1. Приветственный пакет</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>1-й депозит: бонус 200% (макс. 70 000 ₽)</li>
                    <li>2-й депозит: бонус 150% (макс. 50 000 ₽)</li>
                    <li>3-й депозит: бонус 100% (макс. 30 000 ₽)</li>
                    <li>4-й депозит: бонус 75% (макс. 20 000 ₽)</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">4.2. Условия отыгрыша (вейджер)</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Стандартный вейджер: <strong>x30</strong> от суммы бонуса</li>
                    <li>Бонусные средства зачисляются на отдельный бонусный баланс</li>
                    <li>При ставке списание производится сначала с основного баланса, затем с бонусного</li>
                    <li>После выполнения условий отыгрыша бонусные средства переводятся на основной баланс</li>
                    <li>Срок действия бонуса: <strong>30 дней</strong> с момента начисления</li>
                    <li>По истечении срока неотыгранный бонус аннулируется</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">4.3. Ограничения</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Компания вправе отменить бонус при обнаружении злоупотреблений (bonus abuse)</li>
                    <li>Запрещено использование стратегий с минимальным риском для отыгрыша бонуса</li>
                    <li>Один бонус на одного пользователя / один аккаунт / один IP-адрес / одно устройство</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Gamepad2 className="w-5 h-5" />
                  <span>5. Игры и честность</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>5.1. Все игры на Платформе предоставляются лицензированными игровыми провайдерами через сертифицированного агрегатора (SoftGamings/Fundist).</p>
                  <p>5.2. Все игровые автоматы используют сертифицированные генераторы случайных чисел (RNG), прошедшие проверку независимыми аудиторами.</p>
                  <p>5.3. Возврат игроку (RTP) каждой игры указан в информационном разделе игры.</p>
                  <p>5.4. Результаты каждого спина/раунда определяются исключительно RNG и не зависят от предыдущих результатов, суммы ставки или баланса игрока.</p>
                  <p>5.5. В случае технического сбоя во время игры незавершённый раунд будет аннулирован, а ставка возвращена на баланс игрока (rollback).</p>
                  <p>5.6. Максимальный выигрыш с одного спина/раунда определяется правилами конкретной игры и может быть ограничен провайдером.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>6. Ответственная игра</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>6.1. AUREX Casino привержена принципам ответственной игры и предлагает инструменты самоконтроля:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Лимиты депозитов:</strong> установите дневной, недельный или месячный лимит на депозиты</li>
                    <li><strong>Лимиты проигрышей:</strong> ограничьте максимальную сумму проигрыша за период</li>
                    <li><strong>Лимит времени:</strong> установите максимальную продолжительность игровой сессии</li>
                    <li><strong>Перерыв:</strong> временно заблокируйте доступ к аккаунту на 24 часа, 7 дней, 30 дней</li>
                    <li><strong>Самоисключение:</strong> полная блокировка аккаунта на 6 месяцев, 1 год или бессрочно</li>
                  </ul>
                  <p>6.2. Признаки проблемной игры:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Вы тратите на игру больше, чем можете себе позволить</li>
                    <li>Игра мешает вашей работе, учёбе или отношениям</li>
                    <li>Вы занимаете деньги для игры</li>
                    <li>Вы испытываете тревогу или раздражение, когда не играете</li>
                  </ul>
                  <p>6.3. При наличии признаков проблемной игры обратитесь за помощью к специалистам или воспользуйтесь функцией самоисключения.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Ban className="w-5 h-5" />
                  <span>7. Запрещённые действия</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Пользователям Платформы строго запрещается:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Создание нескольких аккаунтов (мультиаккаунтинг)</li>
                    <li>Использование ботов, скриптов, автоматизации и любого программного обеспечения, влияющего на игровой процесс</li>
                    <li>Мошенничество, отмывание денег, финансирование терроризма и иная незаконная деятельность</li>
                    <li>Злоупотребление бонусными программами (bonus abuse)</li>
                    <li>Использование чужих платёжных средств или документов</li>
                    <li>Предоставление заведомо ложной информации при регистрации или верификации</li>
                    <li>Попытки взлома, реверс-инжиниринга или иного несанкционированного воздействия на Платформу</li>
                    <li>Использование VPN/прокси для обхода региональных ограничений</li>
                  </ul>
                  <p className="mt-3">
                    Нарушение любого из вышеуказанных пунктов влечёт немедленную блокировку аккаунта,
                    конфискацию средств, полученных в результате нарушения, и возможное обращение в правоохранительные органы.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>8. Территориальные ограничения</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>8.1. Платформа не доступна для резидентов следующих юрисдикций:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Соединённые Штаты Америки и их территории</li>
                    <li>Соединённое Королевство Великобритании</li>
                    <li>Нидерланды</li>
                    <li>Франция и её заморские территории</li>
                    <li>Израиль</li>
                    <li>Иные юрисдикции, где онлайн-гемблинг запрещён местным законодательством</li>
                  </ul>
                  <p>8.2. Пользователь несёт ответственность за соблюдение законов своей юрисдикции. Компания не несёт ответственности за незаконное использование Платформы.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>9. Ограничение ответственности</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>9.1. Платформа предоставляется «как есть» (as is). Компания не гарантирует бесперебойную работу сервиса.</p>
                  <p>9.2. Компания не несёт ответственности за:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Убытки, вызванные техническими сбоями, не зависящими от Компании</li>
                    <li>Задержки в обработке транзакций по вине платёжных провайдеров</li>
                    <li>Проигрыши в играх (результаты определяются RNG)</li>
                    <li>Несанкционированный доступ к аккаунту вследствие небрежного хранения пароля</li>
                    <li>Действия третьих лиц (игровых провайдеров, платёжных систем)</li>
                  </ul>
                  <p>9.3. Максимальная ответственность Компании перед пользователем ограничивается суммой его депозитов за последние 12 месяцев.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Scale className="w-5 h-5" />
                  <span>10. Разрешение споров</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>10.1. В случае возникновения спора пользователь должен в первую очередь обратиться в службу поддержки AUREX Casino через:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Онлайн-чат на Платформе (AI-ассистент Стефани, доступен 24/7)</li>
                    <li>Электронную почту: <a href="mailto:support@aurex.casino" className="text-aurex-gold-500 hover:underline">support@aurex.casino</a></li>
                    <li>Telegram: <a href="https://t.me/aurex_support_bot" className="text-aurex-gold-500 hover:underline">@aurex_support_bot</a></li>
                  </ul>
                  <p>10.2. Компания обязуется рассмотреть жалобу в течение 14 рабочих дней.</p>
                  <p>10.3. Если спор не был разрешён, пользователь может обратиться к независимому медиатору или в регулирующий орган соответствующей юрисдикции.</p>
                  <p>10.4. Настоящие Правила регулируются и толкуются в соответствии с законодательством юрисдикции регистрации Компании.</p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>11. Интеллектуальная собственность</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>11.1. Все материалы Платформы (дизайн, логотипы, тексты, графика, программный код) являются интеллектуальной собственностью Компании или её лицензиаров.</p>
                  <p>11.2. Запрещается копирование, распространение, модификация или иное использование материалов Платформы без письменного согласия Компании.</p>
                  <p>11.3. Торговая марка «AUREX» и логотип являются зарегистрированными товарными знаками.</p>
                </div>
              </section>

              <div className="mt-8 pt-6 border-t border-aurex-gold-500/20">
                <p className="text-aurex-platinum-400 text-sm">
                  Настоящие Правила и условия вступают в силу с момента регистрации на Платформе.
                  Ознакомьтесь также с нашей <a href="/privacy" className="text-aurex-gold-500 hover:underline">Политикой конфиденциальности</a> и <a href="/aml" className="text-aurex-gold-500 hover:underline">AML/KYC политикой</a>.
                </p>
              </div>

              <div className="p-4 bg-aurex-gold-500/10 border border-aurex-gold-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-aurex-gold-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium mb-1">Важно</div>
                    <p className="text-sm text-aurex-platinum-400">
                      Азартные игры могут вызывать зависимость. Играйте ответственно и только на те средства,
                      которые вы можете позволить себе потерять. Минимальный возраст: 18+.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium mb-1">Вопросы по условиям?</div>
                    <p className="text-sm text-aurex-platinum-400">
                      Служба поддержки: <a href="mailto:support@aurex.casino" className="text-blue-400 hover:underline">support@aurex.casino</a>
                    </p>
                    <p className="text-sm text-aurex-platinum-400 mt-1">
                      Telegram: <a href="https://t.me/aurex_support_bot" className="text-blue-400 hover:underline">@aurex_support_bot</a>
                    </p>
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
