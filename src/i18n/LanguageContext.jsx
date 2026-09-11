import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import zh from './translations/zh';
import en from './translations/en';

const STORAGE_KEY = 'healthy_diet_lang';
const translations = { zh, en };

const LanguageContext = createContext(null);

const resolveTranslation = (dict, key) => {
  if (!dict || !key) return null;
  if (key in dict) return dict[key];

  const parts = key.split('.');
  let current = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return typeof current === 'string' ? current : null;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'zh') return stored;
    } catch {
      // ignore storage errors
    }
    return 'zh';
  });

  const setLanguage = (nextLang) => {
    const validLang = nextLang === 'en' ? 'en' : 'zh';
    setLanguageState(validLang);
    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-TW';
  }, [language]);

  const t = useMemo(() => {
    return (key, paramsOrFallback) => {
      let text = resolveTranslation(translations[language], key);
      if (text == null && language !== 'zh') {
        text = resolveTranslation(translations.zh, key);
      }
      if (text == null) {
        if (typeof paramsOrFallback === 'string') return paramsOrFallback;
        return key;
      }

      if (paramsOrFallback && typeof paramsOrFallback === 'object') {
        return text.replace(/\{(\w+)\}/g, (_, placeholder) => {
          return placeholder in paramsOrFallback ? String(paramsOrFallback[placeholder]) : `{${placeholder}}`;
        });
      }

      return text;
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isEn: language === 'en',
    }),
    [language, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
