import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Award, Shield, CheckCircle, Globe, FileText, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';

export default function LicensePage() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch('/api/config/providers');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Handle both string[] and {id, name, logo}[] formats
          const providerNames = data.data.map((p: any) => 
            typeof p === 'string' ? p : p.name
          );
          setProviders(providerNames);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    };
    fetchProviders();
  }, []);

  const licenses = [
    {
      name: 'Curaçao eGaming',
      number: '1668/JAZ',
      authority: 'Government of Curaçao',
      description: 'Основная лицензия на предоставление услуг онлайн-гемблинга',
      status: 'active',
      issued: '2020',
      logo: '/images/curacao-license.png',
    }
  ];

  const certifications = [
    { name: 'eCOGRA', description: 'Сертификат честной игры' },
    { name: 'iTech Labs', description: 'Тестирование RNG' },
    { name: 'GLI', description: 'Gaming Laboratories International' },
    { name: 'PCI DSS', description: 'Стандарт безопасности платежей' },
  ];

  return (
    <>
      <Head>
        <title>{t('footer.license')} - AUREX</title>
        <meta name="description" content={t('footer.license')} />
      </Head>

      <Layout>
        <div className="min-h-screen pt-20 pb-12">
          <div className="max-w-5xl mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-aurex-gold-500/20 flex items-center justify-center">
                  <Award className="w-8 h-8 text-aurex-gold-500" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">{t('footer.license')}</h1>
              <p className="text-aurex-platinum-400 max-w-2xl mx-auto">
                AUREX — лицензированная игровая платформа, соответствующая международным стандартам безопасности
              </p>
            </motion.div>

            {/* License Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-aurex-gold-500/20 to-amber-500/10 border border-aurex-gold-500/30 rounded-2xl p-6 sm:p-8 mb-8"
            >
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Award className="w-12 h-12 text-aurex-gold-500" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl font-bold text-white mb-2">Curaçao eGaming License</h2>
                  <p className="text-aurex-gold-500 font-mono text-lg mb-2">№ 1668/JAZ</p>
                  <p className="text-aurex-platinum-400">
                    Лицензия выдана правительством Кюрасао и позволяет осуществлять деятельность 
                    в сфере онлайн-гемблинга на международном уровне.
                  </p>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-full">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-400 font-bold">Активна</span>
                </div>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Security */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Shield className="w-6 h-6 text-aurex-gold-500" />
                  <span>Безопасность</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">SSL шифрование 256-бит</div>
                      <div className="text-sm text-aurex-platinum-500">Все данные передаются в зашифрованном виде</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Защита от DDoS</div>
                      <div className="text-sm text-aurex-platinum-500">Многоуровневая защита от атак</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Двухфакторная аутентификация</div>
                      <div className="text-sm text-aurex-platinum-500">Дополнительная защита аккаунта</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-medium">Хранение данных по GDPR</div>
                      <div className="text-sm text-aurex-platinum-500">Соответствие европейским стандартам</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Certifications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6"
              >
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <FileText className="w-6 h-6 text-aurex-gold-500" />
                  <span>Сертификации</span>
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {certifications.map((cert) => (
                    <div key={cert.name} className="p-4 bg-aurex-obsidian-900/50 rounded-xl text-center">
                      <div className="text-aurex-gold-500 font-bold mb-1">{cert.name}</div>
                      <div className="text-xs text-aurex-platinum-500">{cert.description}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Fair Play */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 sm:p-8 mb-8"
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Globe className="w-6 h-6 text-aurex-gold-500" />
                <span>Честная игра</span>
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-black text-aurex-gold-500 mb-2">RNG</div>
                  <div className="text-white font-medium mb-1">Генератор случайных чисел</div>
                  <div className="text-sm text-aurex-platinum-500">
                    Все игры используют сертифицированный RNG, гарантирующий случайность результатов
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-aurex-gold-500 mb-2">96%+</div>
                  <div className="text-white font-medium mb-1">Средний RTP</div>
                  <div className="text-sm text-aurex-platinum-500">
                    Высокий процент возврата игроку подтверждён независимыми аудиторами
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-aurex-gold-500 mb-2">24/7</div>
                  <div className="text-white font-medium mb-1">Мониторинг</div>
                  <div className="text-sm text-aurex-platinum-500">
                    Постоянный контроль честности игр и транзакций
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Game Providers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-2xl p-6 sm:p-8"
            >
              <h2 className="text-xl font-bold text-white mb-6">Лицензированные провайдеры игр</h2>
              <div className="flex flex-wrap gap-3">
                {providers.map((provider) => (
                  <span key={provider} className="px-4 py-2 bg-aurex-obsidian-900/50 border border-aurex-gold-500/20 rounded-full text-aurex-platinum-300 text-sm">
                    {provider}
                  </span>
                ))}
              </div>
              <p className="text-sm text-aurex-platinum-500 mt-6">
                Все провайдеры имеют соответствующие лицензии и сертификаты на предоставление игр онлайн-казино.
              </p>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
}
