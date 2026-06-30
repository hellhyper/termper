import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/i18n';

type Language = 'ru' | 'ua';
type Theme = 'light' | 'dark';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem('termhub_lang');
    return (stored === 'ua' || stored === 'ru') ? stored : 'ru';
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('termhub_theme');
    return (stored === 'light' || stored === 'dark') ? stored : 'light';
  });

  useEffect(() => {
    localStorage.setItem('termhub_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('termhub_theme', theme);
    // Apply theme class to document body
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const t = (key: string): string => {
    const dict = translations[lang] || translations.ru;
    // Walk paths or check direct keys
    if (key in dict) {
      return (dict as any)[key];
    }
    // Fallback to Russian
    if (key in translations.ru) {
      return (translations.ru as any)[key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, theme, setTheme }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}
