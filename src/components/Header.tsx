import { Box, Network, Calendar, Database, HelpCircle, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useI18n } from '../context/LanguageContext';

interface HeaderProps {
  onShowHelp: () => void;
  isHelpActive: boolean;
  onLogoClick: () => void;
}

export default function Header({ onShowHelp, isHelpActive, onLogoClick }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const { lang, setLang, t, theme, setTheme } = useI18n();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900/70 border-b border-slate-800 sticky top-0 z-45 backdrop-blur-md shadow-lg shadow-black/10 animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Branding clickable button to return home */}
          <button
            onClick={onLogoClick}
            className="flex items-center space-x-3 text-left focus:outline-hidden rounded-xl p-1 -m-1 hover:bg-slate-800/40 transition-colors active:scale-95 cursor-pointer group"
            title={t('return_home')}
          >
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:shadow-blue-500/20 transition-all duration-300">
              <Box className="h-5 w-5 stroke-[2] group-hover:rotate-6 transition-transform" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Перемога</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <Database className="w-2.5 h-2.5 mr-1 text-blue-400" />
                  {t('json_db_active')}
                </span>
              </div>
              <h1 className="text-md sm:text-lg font-bold tracking-tight text-white uppercase">
                Terminal<span className="text-blue-400 font-extrabold group-hover:text-blue-300 transition-colors">Hub</span>
              </h1>
            </div>
          </button>

          {/* Right side controls */}
          <div className="flex items-center space-x-3 text-sm">
            {/* Metadata, Clock and System Indicators */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Sync Indicator */}
              <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-slate-300">{t('sync_active')}</span>
              </div>

              {/* DateTime clock */}
              <div className="flex items-center space-x-2 font-mono text-xs text-slate-300 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                <span>{time.toLocaleDateString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}</span>
                <span className="text-slate-600">|</span>
                <span>{time.toLocaleTimeString(lang === 'ua' ? 'uk-UA' : 'ru-RU')}</span>
              </div>
            </div>

            {/* Language Switcher Selector */}
            <div className="flex items-center space-x-0.5 bg-slate-800/80 border border-slate-700/60 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setLang('ru')}
                className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  lang === 'ru'
                    ? 'bg-blue-600/35 text-white shadow-xs font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Русский язык"
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => setLang('ua')}
                className={`px-2.5 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  lang === 'ua'
                    ? 'bg-blue-600/35 text-white shadow-xs font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Українська мова"
              >
                UA
              </button>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl border border-slate-700/60 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-blue-400" />
              )}
            </button>

            {/* Help Question icon button */}
            <button
              onClick={onShowHelp}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isHelpActive
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-705'
              }`}
              title={t('sc_instructions_title')}
            >
              <HelpCircle className="h-4.5 w-4.5 stroke-[2]" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

