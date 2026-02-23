import Head from 'next/head';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, Globe, Mail, UserCheck, Server, Bell, FileText, Scale } from 'lucide-react';
import Layout from '../components/Layout';

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Политика конфиденциальности - AUREX Casino</title>
        <meta name="description" content="Политика конфиденциальности AUREX Casino. Узнайте, как мы собираем, используем и защищаем ваши персональные данные." />
        <link rel="canonical" href="https://aurex.casino/privacy" />
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
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">Политика конфиденциальности</h1>
              <p className="text-aurex-platinum-400 max-w-2xl mx-auto">
                Privacy Policy — AUREX Casino
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
                  <FileText className="w-5 h-5" />
                  <span>1. Введение</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>
                    AUREX Casino (далее — «Компания», «мы», «нас»), управляемая Empire Gaming N.V., обязуется защищать
                    конфиденциальность и безопасность персональных данных своих пользователей. Настоящая Политика описывает,
                    какие данные мы собираем, как мы их используем, храним и защищаем.
                  </p>
                  <p>
                    Используя платформу AUREX Casino (доступную по адресу <a href="https://aurex.casino" className="text-aurex-gold-500 hover:underline">aurex.casino</a>),
                    вы подтверждаете, что ознакомились с настоящей Политикой и согласны с изложенными в ней условиями обработки данных.
                  </p>
                  <p>
                    Настоящая Политика соответствует требованиям Общего регламента защиты данных (GDPR) Европейского Союза
                    и иным применимым нормативным актам в области защиты персональных данных.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>2. Сбор информации</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы собираем следующие категории информации:</p>

                  <h3 className="text-white font-semibold mt-4">2.1. Данные, предоставленные вами</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Регистрационные данные: имя, фамилия, адрес электронной почты, номер телефона, дата рождения</li>
                    <li>Данные авторизации через социальные сети (Google, Telegram)</li>
                    <li>Документы для верификации (KYC): паспорт или удостоверение личности, подтверждение адреса проживания</li>
                    <li>Финансовые данные: реквизиты банковских карт, номера телефонов для СБП, криптовалютные адреса</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">2.2. Данные, собираемые автоматически</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>IP-адрес и геолокация</li>
                    <li>Тип устройства, операционная система, версия браузера</li>
                    <li>Cookies и аналогичные технологии отслеживания</li>
                    <li>Данные об использовании платформы: страницы, время сессии, клики</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">2.3. Данные игровой активности</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>История игровых сессий, ставок и выигрышей</li>
                    <li>История депозитов и выводов средств</li>
                    <li>Бонусная активность и статус VIP-программы</li>
                    <li>Обращения в службу поддержки и их содержание</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>3. Цели использования данных</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы используем вашу информацию для следующих целей:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Предоставление услуг:</strong> регистрация аккаунта, доступ к играм, обработка транзакций</li>
                    <li><strong>Верификация (KYC/AML):</strong> подтверждение личности, предотвращение мошенничества и отмывания денег</li>
                    <li><strong>Безопасность:</strong> обнаружение подозрительной активности, защита от несанкционированного доступа</li>
                    <li><strong>Персонализация:</strong> рекомендации игр, персональные бонусы и акции</li>
                    <li><strong>Коммуникация:</strong> уведомления о статусе транзакций, бонусах, изменениях в правилах (с вашего согласия)</li>
                    <li><strong>Аналитика:</strong> улучшение платформы, анализ пользовательского опыта</li>
                    <li><strong>Юридические обязательства:</strong> соблюдение требований регуляторов и законодательства</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Scale className="w-5 h-5" />
                  <span>4. Правовые основания обработки</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Обработка персональных данных осуществляется на следующих правовых основаниях (в соответствии с GDPR):</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Исполнение договора (ст. 6(1)(b)):</strong> обработка необходима для предоставления вам услуг платформы</li>
                    <li><strong>Юридическая обязанность (ст. 6(1)(c)):</strong> соблюдение требований AML/KYC, налогового законодательства</li>
                    <li><strong>Законные интересы (ст. 6(1)(f)):</strong> обеспечение безопасности, предотвращение мошенничества, улучшение сервиса</li>
                    <li><strong>Согласие (ст. 6(1)(a)):</strong> маркетинговые рассылки, использование необязательных cookies</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>5. Защита данных</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы применяем передовые технические и организационные меры для защиты ваших данных:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Шифрование:</strong> 256-битное SSL/TLS шифрование для всех соединений (Full Strict режим)</li>
                    <li><strong>Защита серверов:</strong> размещение на защищённых серверах с DDoS-защитой (Cloudflare)</li>
                    <li><strong>Контроль доступа:</strong> доступ к персональным данным ограничен и предоставляется только уполномоченным сотрудникам</li>
                    <li><strong>Мониторинг:</strong> непрерывный мониторинг систем на предмет угроз безопасности</li>
                    <li><strong>Хеширование паролей:</strong> пароли хранятся в хешированном виде и не могут быть восстановлены</li>
                    <li><strong>Аудит:</strong> регулярные внутренние аудиты безопасности и процедур обработки данных</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>6. Передача данных третьим лицам</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы можем передавать ваши данные следующим категориям получателей:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Платёжные провайдеры:</strong> для обработки депозитов и выводов (AVE PAY и другие лицензированные операторы)</li>
                    <li><strong>Игровые провайдеры:</strong> для обеспечения работы игр (SoftGamings/Fundist — передаётся только идентификатор и валюта)</li>
                    <li><strong>Регулирующие органы:</strong> по обоснованному законному требованию</li>
                    <li><strong>Аудиторы:</strong> для проверки честности игр и финансовой отчётности</li>
                    <li><strong>Технические провайдеры:</strong> хостинг (Railway), CDN (Cloudflare) — в рамках договоров обработки данных</li>
                  </ul>
                  <p className="mt-4 font-medium text-white">
                    Мы не продаём, не сдаём в аренду и не передаём ваши персональные данные третьим лицам в маркетинговых целях.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>7. Файлы Cookies</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Мы используем файлы cookies и аналогичные технологии:</p>

                  <h3 className="text-white font-semibold mt-4">7.1. Обязательные cookies</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Поддержание авторизованной сессии (JWT-токен)</li>
                    <li>Обеспечение безопасности и защита от CSRF-атак</li>
                    <li>Запоминание языковых и валютных предпочтений</li>
                  </ul>

                  <h3 className="text-white font-semibold mt-4">7.2. Аналитические cookies</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Анализ использования платформы для улучшения сервиса</li>
                    <li>Отслеживание производительности и стабильности</li>
                  </ul>

                  <p className="mt-4">
                    Вы можете управлять cookies через настройки вашего браузера. Отключение обязательных cookies
                    может повлиять на функциональность платформы.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5" />
                  <span>8. Ваши права</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>В соответствии с GDPR и применимым законодательством, вы имеете следующие права:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Право на доступ:</strong> получить копию своих персональных данных, которые мы обрабатываем</li>
                    <li><strong>Право на исправление:</strong> запросить исправление неточных или неполных данных</li>
                    <li><strong>Право на удаление:</strong> запросить удаление данных («право на забвение»), за исключением данных, которые мы обязаны хранить по закону</li>
                    <li><strong>Право на ограничение:</strong> ограничить обработку данных в определённых обстоятельствах</li>
                    <li><strong>Право на переносимость:</strong> получить данные в машиночитаемом формате для передачи другому оператору</li>
                    <li><strong>Право на возражение:</strong> возразить против обработки данных на основании законных интересов</li>
                    <li><strong>Право отозвать согласие:</strong> в любой момент отозвать ранее данное согласие на обработку</li>
                  </ul>
                  <p className="mt-4">
                    Для реализации ваших прав свяжитесь с нашим Ответственным за защиту данных (DPO)
                    по адресу <a href="mailto:privacy@aurex.casino" className="text-aurex-gold-500 hover:underline">privacy@aurex.casino</a>.
                    Мы ответим на ваш запрос в течение 30 дней.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Server className="w-5 h-5" />
                  <span>9. Хранение данных</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>Сроки хранения определяются целями обработки и требованиями законодательства:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Данные аккаунта:</strong> в течение срока действия аккаунта + 5 лет после закрытия</li>
                    <li><strong>Финансовые данные и транзакции:</strong> минимум 7 лет (требования AML/налогового законодательства)</li>
                    <li><strong>Документы KYC:</strong> 5 лет после закрытия аккаунта</li>
                    <li><strong>Обращения в поддержку:</strong> 3 года с момента обращения</li>
                    <li><strong>Технические логи:</strong> 12 месяцев</li>
                    <li><strong>Маркетинговые данные:</strong> до момента отзыва согласия</li>
                  </ul>
                  <p className="mt-4">
                    По истечении сроков хранения данные безвозвратно удаляются или обезличиваются.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>10. Защита несовершеннолетних</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>
                    Платформа AUREX Casino предназначена исключительно для лиц, достигших 18 лет
                    (или возраста совершеннолетия в соответствующей юрисдикции). Мы не собираем и не обрабатываем
                    персональные данные лиц младше 18 лет.
                  </p>
                  <p>
                    При обнаружении аккаунта несовершеннолетнего лица он незамедлительно блокируется,
                    а все связанные данные удаляются.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-aurex-gold-500 mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>11. Изменения в Политике</span>
                </h2>
                <div className="text-aurex-platinum-300 space-y-3">
                  <p>
                    Компания оставляет за собой право вносить изменения в настоящую Политику конфиденциальности.
                    Обо всех существенных изменениях мы уведомим пользователей посредством электронной почты
                    или уведомления на платформе.
                  </p>
                  <p>
                    Актуальная версия Политики всегда доступна на данной странице с указанием даты последнего обновления.
                    Продолжая использовать платформу после внесения изменений, вы подтверждаете согласие с обновлённой Политикой.
                  </p>
                </div>
              </section>

              <div className="mt-8 pt-6 border-t border-aurex-gold-500/20">
                <p className="text-aurex-platinum-400 text-sm">
                  Настоящая Политика конфиденциальности является неотъемлемой частью Правил и условий использования
                  платформы AUREX Casino. Ознакомьтесь также с нашей <a href="/aml" className="text-aurex-gold-500 hover:underline">AML/KYC политикой</a> и <a href="/terms" className="text-aurex-gold-500 hover:underline">Правилами и условиями</a>.
                </p>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-medium mb-1">Вопросы о конфиденциальности?</div>
                    <p className="text-sm text-aurex-platinum-400">
                      Data Protection Officer (DPO): <a href="mailto:privacy@aurex.casino" className="text-blue-400 hover:underline">privacy@aurex.casino</a>
                    </p>
                    <p className="text-sm text-aurex-platinum-400 mt-1">
                      Общая поддержка: <a href="mailto:support@aurex.casino" className="text-blue-400 hover:underline">support@aurex.casino</a>
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
