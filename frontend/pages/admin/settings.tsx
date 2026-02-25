import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { 
  Settings,
  Save,
  Globe,
  Percent,
  Gift,
  Shield,
  CreditCard,
  Bell,
  Mail,
  Server,
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import AuthGuard from '../../components/AuthGuard';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'AUREX',
    siteUrl: 'https://aurex.casino',
    supportEmail: 'support@aurex.casino',
    defaultLanguage: 'ru',
    defaultCurrency: 'RUB',
    maintenanceMode: false,
    registrationEnabled: true,
  });

  const [bonusSettings, setBonusSettings] = useState({
    welcomeBonus1: 200,
    welcomeBonus2: 150,
    welcomeBonus3: 100,
    welcomeBonus4: 75,
    welcomeWager: 35,
    minDeposit: 10,
    maxBonusAmount: 500,
    freeSpinsWager: 30,
  });

  const [paymentSettings, setPaymentSettings] = useState({
    minDeposit: 10,
    maxDeposit: 50000,
    minWithdrawal: 20,
    maxWithdrawal: 10000,
    withdrawalFee: 0,
    cryptoEnabled: true,
    cardsEnabled: true,
    bankTransferEnabled: true,
  });

  const [vipSettings, setVipSettings] = useState({
    bronzePoints: 0,
    silverPoints: 1000,
    goldPoints: 5000,
    platinumPoints: 25000,
    emperorPoints: 100000,
    bronzeCashback: 5,
    silverCashback: 7,
    goldCashback: 10,
    platinumCashback: 12,
    emperorCashback: 15,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    kycRequired: true,
    kycWithdrawalLimit: 0,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    ipWhitelist: '',
  });

  // Fetch settings from API on load
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.success && data.data) {
        if (data.data.general) setGeneralSettings(data.data.general);
        if (data.data.bonuses) setBonusSettings(data.data.bonuses);
        if (data.data.payments) setPaymentSettings(data.data.payments);
        if (data.data.vip) setVipSettings(data.data.vip);
        if (data.data.security) setSecuritySettings(data.data.security);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
    setIsLoading(false);
  };

  const handleSave = async (section: string) => {
    setIsSaving(true);
    
    const sectionMap: Record<string, { key: string; data: any }> = {
      'Основные': { key: 'general', data: generalSettings },
      'Бонусы': { key: 'bonuses', data: bonusSettings },
      'Платежи': { key: 'payments', data: paymentSettings },
      'VIP': { key: 'vip', data: vipSettings },
      'Безопасность': { key: 'security', data: securitySettings },
    };
    
    const sectionInfo = sectionMap[section];
    if (!sectionInfo) {
      toast.error('Неизвестный раздел');
      setIsSaving(false);
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/settings/${sectionInfo.key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(sectionInfo.data)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Настройки "${section}" сохранены!`);
      } else {
        toast.error(data.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error('Ошибка сохранения настроек');
    }
    
    setIsSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('Сбросить все настройки до значений по умолчанию?')) return;
    
    try {
      const res = await fetch('/api/admin/settings/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success('Настройки сброшены!');
        fetchSettings();
      } else {
        toast.error('Ошибка сброса');
      }
    } catch (error) {
      toast.error('Ошибка сброса настроек');
    }
  };

  const tabs = [
    { id: 'general', label: 'Основные', icon: <Settings className="w-4 h-4" /> },
    { id: 'bonuses', label: 'Бонусы', icon: <Gift className="w-4 h-4" /> },
    { id: 'payments', label: 'Платежи', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'vip', label: 'VIP', icon: <Percent className="w-4 h-4" /> },
    { id: 'security', label: 'Безопасность', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <AuthGuard >
      <Head>
        <title>Настройки сайта - AUREX Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Настройки сайта</h1>
            <p className="text-aurex-platinum-400">Управление параметрами платформы</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-aurex-gold-500 text-aurex-obsidian-900'
                    : 'bg-aurex-obsidian-800 text-aurex-platinum-300 hover:bg-aurex-obsidian-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* General Settings */}
          {activeTab === 'general' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Основные настройки</h2>
              
              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Название сайта</label>
                  <input
                    type="text"
                    value={generalSettings.siteName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">URL сайта</label>
                  <input
                    type="text"
                    value={generalSettings.siteUrl}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, siteUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Email поддержки</label>
                  <input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Язык по умолчанию</label>
                  <select
                    value={generalSettings.defaultLanguage}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, defaultLanguage: e.target.value })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
                  >
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Валюта по умолчанию</label>
                  <select
                    value={generalSettings.defaultCurrency}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, defaultCurrency: e.target.value })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
                  >
                    <option value="RUB">RUB (₽)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <label className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <Server className="w-5 h-5 text-yellow-500" />
                    <div>
                      <div className="text-white font-medium">Режим обслуживания</div>
                      <div className="text-sm text-aurex-platinum-500">Сайт будет недоступен для пользователей</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalSettings.maintenanceMode}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMode: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="text-white font-medium">Регистрация открыта</div>
                      <div className="text-sm text-aurex-platinum-500">Новые пользователи могут регистрироваться</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalSettings.registrationEnabled}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, registrationEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>

              <button
                onClick={() => handleSave('Основные')}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
            </motion.div>
          )}

          {/* Bonus Settings */}
          {activeTab === 'bonuses' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Настройки бонусов</h2>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">1-й депозит (%)</label>
                  <input
                    type="number"
                    value={bonusSettings.welcomeBonus1}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, welcomeBonus1: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">2-й депозит (%)</label>
                  <input
                    type="number"
                    value={bonusSettings.welcomeBonus2}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, welcomeBonus2: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">3-й депозит (%)</label>
                  <input
                    type="number"
                    value={bonusSettings.welcomeBonus3}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, welcomeBonus3: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">4-й депозит (%)</label>
                  <input
                    type="number"
                    value={bonusSettings.welcomeBonus4}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, welcomeBonus4: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Вейджер (x)</label>
                  <input
                    type="number"
                    value={bonusSettings.welcomeWager}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, welcomeWager: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Мин. депозит (₽)</label>
                  <input
                    type="number"
                    value={bonusSettings.minDeposit}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, minDeposit: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Макс. бонус (₽)</label>
                  <input
                    type="number"
                    value={bonusSettings.maxBonusAmount}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, maxBonusAmount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Вейджер FS (x)</label>
                  <input
                    type="number"
                    value={bonusSettings.freeSpinsWager}
                    onChange={(e) => setBonusSettings({ ...bonusSettings, freeSpinsWager: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => handleSave('Бонусы')}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
            </motion.div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payments' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Настройки платежей</h2>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Мин. депозит (₽)</label>
                  <input
                    type="number"
                    value={paymentSettings.minDeposit}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, minDeposit: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Макс. депозит (₽)</label>
                  <input
                    type="number"
                    value={paymentSettings.maxDeposit}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, maxDeposit: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Мин. вывод (₽)</label>
                  <input
                    type="number"
                    value={paymentSettings.minWithdrawal}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, minWithdrawal: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Макс. вывод (₽)</label>
                  <input
                    type="number"
                    value={paymentSettings.maxWithdrawal}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, maxWithdrawal: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Комиссия вывода (%)</label>
                  <input
                    type="number"
                    value={paymentSettings.withdrawalFee}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, withdrawalFee: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <label className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                  <span className="text-white">Криптовалюты</span>
                  <input
                    type="checkbox"
                    checked={paymentSettings.cryptoEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, cryptoEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                  <span className="text-white">Банковские карты</span>
                  <input
                    type="checkbox"
                    checked={paymentSettings.cardsEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, cardsEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                  <span className="text-white">Банковский перевод</span>
                  <input
                    type="checkbox"
                    checked={paymentSettings.bankTransferEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, bankTransferEnabled: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>

              <button
                onClick={() => handleSave('Платежи')}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
            </motion.div>
          )}

          {/* VIP Settings */}
          {activeTab === 'vip' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Настройки VIP</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full mb-6">
                  <thead>
                    <tr className="border-b border-aurex-gold-500/20">
                      <th className="text-left p-3 text-aurex-platinum-500">Уровень</th>
                      <th className="text-left p-3 text-aurex-platinum-500">Очки</th>
                      <th className="text-left p-3 text-aurex-platinum-500">Кэшбэк (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['bronze', 'silver', 'gold', 'platinum', 'emperor'].map((level) => (
                      <tr key={level} className="border-b border-aurex-gold-500/10">
                        <td className="p-3 text-white capitalize">{level}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={vipSettings[`${level}Points` as keyof typeof vipSettings]}
                            onChange={(e) => setVipSettings({ ...vipSettings, [`${level}Points`]: parseInt(e.target.value) })}
                            className="w-24 px-3 py-2 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="number"
                            value={vipSettings[`${level}Cashback` as keyof typeof vipSettings]}
                            onChange={(e) => setVipSettings({ ...vipSettings, [`${level}Cashback`]: parseInt(e.target.value) })}
                            className="w-20 px-3 py-2 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => handleSave('VIP')}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
            </motion.div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-aurex-obsidian-800 border border-aurex-gold-500/20 rounded-xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Настройки безопасности</h2>
              
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Макс. попыток входа</label>
                  <input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">Таймаут сессии (мин)</label>
                  <input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-aurex-platinum-400 mb-2">KYC лимит вывода (₽)</label>
                  <input
                    type="number"
                    value={securitySettings.kycWithdrawalLimit}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, kycWithdrawalLimit: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-aurex-obsidian-900 border border-aurex-gold-500/20 rounded-lg text-white focus:border-aurex-gold-500/50 focus:outline-none"
                  />
                  <p className="text-xs text-aurex-platinum-500 mt-1">0 = KYC обязателен для любого вывода</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <label className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                  <div>
                    <div className="text-white font-medium">Обязательная 2FA</div>
                    <div className="text-sm text-aurex-platinum-500">Все пользователи должны включить 2FA</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorRequired}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorRequired: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-aurex-obsidian-900/50 rounded-xl cursor-pointer">
                  <div>
                    <div className="text-white font-medium">KYC обязателен</div>
                    <div className="text-sm text-aurex-platinum-500">Верификация для вывода средств</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={securitySettings.kycRequired}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, kycRequired: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                </label>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleSave('Безопасность')}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-6 py-3 bg-aurex-gold-500 text-aurex-obsidian-900 font-bold rounded-lg disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500/20 text-red-400 font-bold rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Сброс</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
