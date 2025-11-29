import React, { createContext, useContext, useMemo, useState } from 'react';
import translationService from '../services/translation';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TranslationsMap = Record<string, string>;

type TranslationContextValue = {
  locale: string;
  setLocale: (lang: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  translateBulk: (items: Record<string, string>) => Promise<TranslationsMap>;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

export const TranslationProvider: React.FC<{ children: React.ReactNode; defaultLocale?: string }> = ({
  children,
  defaultLocale = 'en'
}) => {
  const [locale, setLocaleState] = useState<string>(defaultLocale);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  // internal key builder
  const buildKey = (k: string, l: string) => `${l}::${k}`;

  const persistLocale = async (l: string) => {
    try {
      await AsyncStorage.setItem('app_locale', l);
    } catch (e) {
      // ignore
    }
  };

  const setLocale = async (lang: string) => {
    if (!lang) return;
    setLocaleState(lang);
    await persistLocale(lang);
    // clear cached translations for previous locale so t() will re-fetch
    setTranslations({});
  };

  // synchronous translator helper: returns fallback immediately, but triggers background fetch
  const t = (key: string, fallback = key) => {
    const storeKey = buildKey(key, locale);
    const existing = translations[storeKey];
    if (existing) return existing;

    // trigger background translation
    (async () => {
      try {
        if (locale === 'en') {
          // english -> use fallback
          setTranslations(prev => ({ ...prev, [storeKey]: fallback }));
          return;
        }
        const translated = await translationService.translateText(fallback, locale, 'auto');
        if (translated) {
          setTranslations(prev => ({ ...prev, [storeKey]: translated }));
        }
      } catch (e) {
        // ignore
      }
    })();

    return fallback;
  };

  // bulk translate a set of strings and return the map (useful for pre-translating a screen)
  const translateBulk = async (items: Record<string, string>) => {
    if (!items || locale === 'en') {
      // return copy of originals
      return { ...items };
    }
    try {
      const translated = await translationService.translateStrings(items, locale);
      // stash into translations state
      setTranslations(prev => {
        const next = { ...prev };
        Object.keys(translated).forEach(k => {
          next[buildKey(k, locale)] = translated[k];
        });
        return next;
      });
      return translated;
    } catch (e) {
      return { ...items };
    }
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      translateBulk
    }),
    [locale, translations]
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
};

export const useTranslation = () => {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
};