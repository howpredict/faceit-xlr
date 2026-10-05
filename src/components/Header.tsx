import React from 'react';
import { AppViewMode, ThemeMode } from '../types/extension';
import { Download, Eye, Code2, Monitor, Sun, Moon, Sparkles } from 'lucide-react';

interface HeaderProps {
  viewMode: AppViewMode;
  setViewMode: (mode: AppViewMode) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  onDownloadZip: () => void;
  isDownloading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  theme,
  setTheme,
  onDownloadZip,
  isDownloading
}) => {
  return (
    <header className={`w-full border-b transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-neutral-900/90 border-neutral-800 text-neutral-100' 
        : 'bg-white/95 border-slate-200 text-slate-800 shadow-xs'
    } backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3.5`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone (Single element wordmark with icon) */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-950 p-0.5 shadow-md shadow-orange-500/10 border border-neutral-700/60 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="10" fill="#181A20" />
                <path d="M12 12L28 28M28 12L12 28" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M20 7L24 11L20 15L16 11Z" fill="#FF5500"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-lg tracking-tight bg-gradient-to-r from-neutral-100 to-neutral-300 dark:from-white dark:to-neutral-300 bg-clip-text text-transparent">
                  FACEIT <span className="text-orange-500">XLR</span>
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-sm bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  v2.1
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 hidden sm:block">
                Облачное настроение · Chrome Extension Studio
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <nav className="flex items-center p-1 rounded-xl bg-neutral-950/40 dark:bg-neutral-950/60 border border-neutral-800/80 text-xs font-medium">
          <button
            onClick={() => setViewMode('popup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
              viewMode === 'popup'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-orange-500" />
            <span>Интерфейс Popup</span>
          </button>

          <button
            onClick={() => setViewMode('faceit-sim')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
              viewMode === 'faceit-sim'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-orange-500" />
            <span>Симулятор FACEIT</span>
          </button>

          <button
            onClick={() => setViewMode('download')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
              viewMode === 'download'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden md:inline">Установка и ZIP</span>
            <span className="md:hidden">ZIP</span>
          </button>

          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 ${
              viewMode === 'code'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden md:inline">Код файлов</span>
            <span className="md:hidden">Код</span>
          </button>
        </nav>

        {/* Actions Zone: Theme Toggle & Download CTA */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'bg-neutral-800/80 border-neutral-700/80 text-amber-400 hover:bg-neutral-700'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/20 transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Сборка архива...' : 'Скачать .ZIP'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
