import { useCallback, useEffect, useState } from 'react';
import { useSettingsStore, Language } from '../store/settingsStore';

// Import translations
import ruTranslations from '../public/locales/ru/common.json';
import enTranslations from '../public/locales/en/common.json';
import deTranslations from '../public/locales/de/common.json';
import esTranslations from '../public/locales/es/common.json';
import ptTranslations from '../public/locales/pt/common.json';

type TranslationData = typeof ruTranslations;

const translations: Record<Language, TranslationData> = {
  ru: ruTranslations,
  en: enTranslations,
  de: deTranslations,
  es: esTranslations,
  pt: ptTranslations,
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<TranslationData>;

export function useTranslation() {
  const language = useSettingsStore((state) => state.language);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Get translations directly based on current language
  const currentTranslations = isHydrated 
    ? (translations[language] || translations.ru)
    : translations.ru;

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = currentTranslations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return key if translation not found
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters like {{name}} with actual values
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, value);
    }

    return value;
  }, [currentTranslations]);

  return { t, language, isHydrated };
}

// Hook for currency formatting
export function useCurrency() {
  const currency = useSettingsStore((state) => state.currency);
  const hideBalance = useSettingsStore((state) => state.hideBalance);

  // Импортируем единый источник курсов из settingsStore
  const { exchangeRates, currencySymbols: symbols } = require('../store/settingsStore');

  const format = useCallback((amountInRub: number, showHidden = false): string => {
    if (hideBalance && !showHidden) {
      return '••••••';
    }

    const rate = exchangeRates[currency] || 1;
    const converted = amountInRub * rate;
    const symbol = symbols[currency] || '₽';

    if (currency === 'BTC') {
      return `${symbol}${converted.toFixed(8)}`;
    }

    const formatted = converted.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === 'USDT' ? 2 : 0,
    });

    return `${symbol}${formatted}`;
  }, [currency, hideBalance]);

  return { format, currency, symbol: symbols[currency] || '₽', hideBalance };
}
