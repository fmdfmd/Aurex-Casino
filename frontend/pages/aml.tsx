import Head from 'next/head';
import { motion } from 'framer-motion';
import { Shield, UserCheck, AlertTriangle, Search, FileWarning, Ban, Globe, BookOpen } from 'lucide-react';
import Layout from '../components/Layout';

export default function AMLPage() {
  return (
    <>
      <Head>
        <title>AML & KYC Policy - AUREX</title>
        <meta name="description" content="Anti-Money Laundering (AML) and Know Your Customer (KYC) Policy of AUREX Casino" />
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
                  <Shield className="w-8 h-8 text-aurex-gold-500" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">AML & KYC Policy</h1>
              <p className="text-aurex-platinum-400 max-w-2xl mx-auto">
                Anti-Money Laundering and Know Your Customer Policy
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
                  <BookOpen className="w-5 h-5" />
                  <span>1. Введение</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>
                    AUREX Casino (далее — «Компания», «мы») обязуется соблюдать все применимые законы и нормативные акты в области
                    противодействия отмыванию денег (AML) и финансированию терроризма (CFT). Настоящая политика устанавливает
                    процедуры и меры контроля, направленные на предотвращение использования платформы для незаконной деятельности.
                  </p>
                  <p>
                    Компания придерживается рекомендаций Группы разработки финансовых мер борьбы с отмыванием денег (FATF)
                    и требований юрисдикции, в которой осуществляет свою деятельность.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>2. Процедуры KYC (Know Your Customer)</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Для обеспечения безопасности и предотвращения мошенничества мы применяем многоуровневую систему верификации:</p>

                  <h3 className="text-white font-semibold mt-4">2.1. Базовая верификация (при регистрации)</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Подтверждение номера телефона через верификационный звонок (uCaller)</li>
                    <li>Проверка уникальности номера телефона (один аккаунт на один номер)</li>
                    <li>Сбор базовой информации: имя, фамилия, дата рождения</li>
                    <li>Проверка возраста (минимум 18 лет)</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">2.2. Расширенная верификация (при выводе средств)</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Документ, удостоверяющий личность (паспорт, водительское удостоверение, ID-карта)</li>
                    <li>Подтверждение адреса проживания (коммунальный счёт, банковская выписка — не старше 3 месяцев)</li>
                    <li>Селфи с документом для подтверждения идентичности</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">2.3. Усиленная проверка (Enhanced Due Diligence)</h3>
                  <p>Применяется при наличии повышенных рисков:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Суммарные депозиты превышают пороговые значения (€2,000 в месяц)</li>
                    <li>Единичный вывод свыше €1,000</li>
                    <li>Нетипичная игровая активность или модели ставок</li>
                    <li>Подтверждение источника средств (справка о доходах, выписка из банка, налоговая декларация)</li>
                    <li>Проверка PEP (Politically Exposed Person) статуса</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>3. Мониторинг транзакций</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Компания осуществляет постоянный мониторинг всех финансовых операций:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Автоматический мониторинг:</strong> система отслеживает все депозиты, выводы и внутренние переводы в режиме реального времени</li>
                    <li><strong>Пороговые значения:</strong> транзакции, превышающие установленные лимиты, автоматически отмечаются для ручной проверки</li>
                    <li><strong>Паттерны поведения:</strong> выявление подозрительных моделей — частые депозиты с разных карт, минимальная игровая активность при большом обороте, структурирование транзакций</li>
                    <li><strong>Связанные аккаунты:</strong> выявление множественных аккаунтов по IP-адресу, устройству, платёжным данным</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>4. Подозрительные транзакции (STR)</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Следующие действия рассматриваются как подозрительные и подлежат углублённой проверке:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Попытки внести депозит и вывести средства без игровой активности или с минимальными ставками</li>
                    <li>Использование нескольких платёжных методов/карт без видимого экономического обоснования</li>
                    <li>Несоответствие объёма транзакций заявленному источнику дохода</li>
                    <li>Отказ или уклонение от прохождения верификации</li>
                    <li>Создание множественных аккаунтов (мультиаккаунтинг)</li>
                    <li>Использование VPN/прокси для сокрытия местоположения из запрещённых юрисдикций</li>
                    <li>Третьи лица осуществляют транзакции от имени игрока</li>
                  </ul>
                  <p className="mt-3">
                    При выявлении подозрительной активности Компания оставляет за собой право:
                    заморозить аккаунт, заблокировать вывод средств, запросить дополнительные документы,
                    а также сообщить о подозрительной деятельности в соответствующие органы.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <FileWarning className="w-5 h-5" />
                  <span>5. Хранение данных и отчётность</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Все данные верификации (KYC) хранятся в зашифрованном виде минимум <strong>5 лет</strong> после закрытия аккаунта</li>
                    <li>История транзакций хранится минимум <strong>5 лет</strong> с момента проведения операции</li>
                    <li>Записи о подозрительных транзакциях и принятых мерах ведутся и хранятся бессрочно</li>
                    <li>Компания ведёт внутренний реестр отчётов о подозрительных операциях (SAR/STR)</li>
                    <li>При необходимости Компания направляет отчёты в компетентные органы в соответствии с законодательством юрисдикции</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Ban className="w-5 h-5" />
                  <span>6. Запрещённые юрисдикции</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Компания не принимает игроков из следующих юрисдикций:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Соединённые Штаты Америки (США) и их территории</li>
                    <li>Соединённое Королевство Великобритании</li>
                    <li>Нидерланды</li>
                    <li>Франция и её заморские территории</li>
                    <li>Израиль</li>
                    <li>Иные юрисдикции, где онлайн-гемблинг запрещён местным законодательством</li>
                  </ul>
                  <p className="mt-3">
                    Компания использует технические средства (GeoIP, верификация документов) для предотвращения
                    регистрации и игры лиц из запрещённых юрисдикций. При выявлении нарушения аккаунт блокируется,
                    а средства возвращаются за вычетом комиссий.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>7. Политика в отношении криптовалют</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>При работе с криптовалютными платежами применяются дополнительные меры:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Анализ блокчейн-транзакций на предмет связи с незаконной деятельностью</li>
                    <li>Проверка криптовалютных адресов по базам известных мошеннических кошельков</li>
                    <li>Вывод криптовалюты осуществляется только на адрес, с которого был совершён депозит (или на верифицированный адрес)</li>
                    <li>Конвертация крипто-в-фиат проходит через лицензированных провайдеров</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>8. Ответственный сотрудник (Compliance Officer)</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>
                    Компания назначает ответственного сотрудника по комплаенсу (MLRO — Money Laundering Reporting Officer),
                    в обязанности которого входит:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Контроль соблюдения AML/KYC процедур</li>
                    <li>Рассмотрение подозрительных транзакций и принятие решений</li>
                    <li>Обучение персонала процедурам AML</li>
                    <li>Взаимодействие с регулятором и правоохранительными органами</li>
                    <li>Регулярный аудит и обновление политик</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>9. Обучение персонала</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Все сотрудники проходят обязательное обучение AML/CFT при найме</li>
                    <li>Ежегодное обновление знаний и переаттестация</li>
                    <li>Обучение включает: распознавание подозрительных операций, процедуры эскалации, работа с документами KYC</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>10. Санкции за нарушения</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>В случае нарушения настоящей политики Компания применяет следующие меры:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Временная или постоянная блокировка аккаунта</li>
                    <li>Заморозка средств до завершения расследования</li>
                    <li>Конфискация средств, полученных в результате мошенничества</li>
                    <li>Подача отчёта о подозрительной деятельности в регулирующие органы</li>
                    <li>Передача информации в правоохранительные органы при наличии оснований</li>
                  </ul>
                </div>
              </section>

              <div className="mt-8 pt-6 border-t border-aurex-gold-500/20">
                <p className="text-aurex-platinum-400 text-sm">
                  Настоящая политика AML/KYC является неотъемлемой частью Правил и условий использования платформы AUREX Casino.
                  Компания оставляет за собой право вносить изменения в данную политику. Актуальная версия всегда доступна на данной странице.
                </p>
                <p className="text-aurex-platinum-500 text-sm mt-3">
                  По вопросам верификации и комплаенса: <a href="mailto:compliance@aurex.casino" className="text-aurex-gold-500 hover:underline">compliance@aurex.casino</a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
}
