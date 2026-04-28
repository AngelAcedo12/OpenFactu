import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import esMessages from './locales/es.json';
import enMessages from './locales/en.json';

type Messages = Record<string, any>;

export type Locale = 'es' | 'en';

const MESSAGES: Record<Locale, Messages> = {
  es: esMessages as Messages,
  en: enMessages as Messages,
};

const STORAGE_KEY = 'keirost_locale';

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch {
    /* noop */
  }
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return nav === 'en' ? 'en' : 'es';
}

function lookup(obj: Messages, path: string): string | undefined {
  const keys = path.split('.');
  let cur: any = obj;
  for (const k of keys) {
    if (cur && typeof cur === 'object' && k in cur) cur = cur[k];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* noop */
    }
    document.documentElement.lang = l;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      const primary = lookup(MESSAGES[locale], path);
      if (primary != null) return interpolate(primary, vars);
      // Fallback a español, luego a la propia clave
      const fallback = lookup(MESSAGES.es, path);
      if (fallback != null) return interpolate(fallback, vars);
      return path;
    },
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
