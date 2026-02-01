const pool = require('../config/database');

// Default settings
const defaultSettings = {
  general: {
    siteName: 'AUREX',
    siteUrl: 'https://aurex.io',
    supportEmail: 'support@aurex.io',
    defaultLanguage: 'ru',
    defaultCurrency: 'RUB',
    maintenanceMode: false,
    registrationEnabled: true
  },
  bonuses: {
    welcomeBonus1: 200,
    welcomeBonus2: 150,
    welcomeBonus3: 100,
    welcomeBonus4: 75,
    welcomeWager: 35,
    minDeposit: 10,
    maxBonusAmount: 500,
    freeSpinsWager: 30
  },
  payments: {
    minDeposit: 10,
    maxDeposit: 50000,
    minWithdrawal: 20,
    maxWithdrawal: 10000,
    withdrawalFee: 0,
    cryptoEnabled: true,
    cardsEnabled: true,
    bankTransferEnabled: true
  },
  vip: {
    bronzePoints: 0,
    silverPoints: 1000,
    goldPoints: 5000,
    platinumPoints: 25000,
    emperorPoints: 100000,
    bronzeCashback: 5,
    silverCashback: 7,
    goldCashback: 10,
    platinumCashback: 12,
    emperorCashback: 15
  },
  security: {
    twoFactorRequired: false,
    kycRequired: true,
    kycWithdrawalLimit: 0,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    ipWhitelist: ''
  }
};

const Settings = {
  // Get all settings
  async get() {
    try {
      const result = await pool.query("SELECT value FROM settings WHERE key = 'global'");
      
      if (result.rows.length === 0) {
        // Insert default settings
        await pool.query(
          "INSERT INTO settings (key, value) VALUES ('global', $1) ON CONFLICT (key) DO NOTHING",
          [JSON.stringify(defaultSettings)]
        );
        return { ...defaultSettings, id: 'global', updatedAt: new Date().toISOString() };
      }
      
      const settings = typeof result.rows[0].value === 'string' 
        ? JSON.parse(result.rows[0].value) 
        : result.rows[0].value;
      
      return { ...defaultSettings, ...settings, id: 'global' };
    } catch (error) {
      console.error('Settings.get error:', error);
      return { ...defaultSettings, id: 'global' };
    }
  },

  // Update settings by section
  async updateSection(section, data) {
    try {
      const currentSettings = await this.get();
      
      if (currentSettings[section]) {
        currentSettings[section] = { ...currentSettings[section], ...data };
        currentSettings.updatedAt = new Date().toISOString();
      }
      
      await pool.query(
        "INSERT INTO settings (key, value, updated_at) VALUES ('global', $1, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
        [JSON.stringify(currentSettings)]
      );
      
      return currentSettings;
    } catch (error) {
      console.error('Settings.updateSection error:', error);
      throw error;
    }
  },

  // Update all settings at once
  async updateAll(data) {
    try {
      const newSettings = {
        ...defaultSettings,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      await pool.query(
        "INSERT INTO settings (key, value, updated_at) VALUES ('global', $1, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
        [JSON.stringify(newSettings)]
      );
      
      return { ...newSettings, id: 'global' };
    } catch (error) {
      console.error('Settings.updateAll error:', error);
      throw error;
    }
  },

  // Get specific section
  async getSection(section) {
    const settings = await this.get();
    return settings[section] || null;
  },

  // Reset to defaults
  async reset() {
    try {
      await pool.query(
        "INSERT INTO settings (key, value, updated_at) VALUES ('global', $1, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
        [JSON.stringify(defaultSettings)]
      );
      return { ...defaultSettings, id: 'global', updatedAt: new Date().toISOString() };
    } catch (error) {
      console.error('Settings.reset error:', error);
      throw error;
    }
  }
};

module.exports = Settings;
