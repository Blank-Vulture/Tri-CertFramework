"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../../i18n/en.json';
import ja from '../../i18n/ja.json';

type Lang = 'en' | 'ja';

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const DICTS: Record<Lang, Record<string, unknown>> = { en, ja };

function getFromPath(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((acc: unknown, k: string) => (acc && typeof acc === 'object' && acc !== null && k in acc ? (acc as Record<string, unknown>)[k] : undefined), obj) as string | undefined;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang === 'ja' || urlLang === 'en') return urlLang as Lang;
    const saved = window.localStorage.getItem('lang');
    if (saved === 'ja' || saved === 'en') return saved as Lang;
    const nav = navigator.language || navigator.languages?.[0] || 'en';
    return nav.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lang', lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback((key: string) => {
    const val = getFromPath(DICTS[lang], key);
    return (typeof val === 'string' ? val : undefined) ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}

export function HeaderLangSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-600" htmlFor="lang-select">{t('header.language')}</label>
      <select
        id="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
        aria-label={t('header.language')}
      >
        <option value="en">{t('lang.en')}</option>
        <option value="ja">{t('lang.ja')}</option>
      </select>
    </div>
  );
}
