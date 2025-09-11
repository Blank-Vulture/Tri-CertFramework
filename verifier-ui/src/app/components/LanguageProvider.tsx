'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Lang = 'en' | 'ja';

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18N_STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    'header.language': 'Language',
    'hero.subtitle.verifier': 'Verify zero-knowledge proofs and digital signatures embedded in your PDF.',
    'action.verify': 'Verify PDF',
    'action.verifying': 'Verifying...',
  },
  ja: {
    'header.language': '言語',
    'hero.subtitle.verifier': 'PDFに埋め込まれたゼロ知識証明と電子署名を検証します。',
    'action.verify': 'PDFを検証',
    'action.verifying': '検証中...',
  },
};

const I18nContext = createContext<I18nContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    const saved = window.localStorage.getItem('lang');
    return (saved === 'ja' || saved === 'en') ? (saved as Lang) : 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lang', lang);
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback((key: string) => {
    const dict = I18N_STRINGS[lang];
    return dict[key] ?? key;
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
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-600" htmlFor="lang-select">{lang === 'ja' ? '言語' : 'Language'}</label>
      <select
        id="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
        aria-label={lang === 'ja' ? '言語設定' : 'Language setting'}
      >
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </div>
  );
}

