import React, { useState } from 'react';
import { downloadExtensionZip } from './utils/zipHelper';
import { Download, CheckCircle2, Chrome } from 'lucide-react';

export default function App() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadExtensionZip();
      setJustDownloaded(true);
      setTimeout(() => setJustDownloaded(false), 4000);
    } catch (err) {
      console.error('Error downloading zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-between p-3 select-none">
      {/* Top extension bar with download CTA */}
      <header className="w-full max-w-[760px] flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold">
            <div className="w-4 h-4 rounded-[4px] bg-[#12151c] border border-white/20 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
              <svg viewBox="0 0 128 128" className="w-3.5 h-3.5" fill="none">
                <path d="M26 28 L50 28 L64 49 L78 28 L102 28 L78 64 L102 100 L78 100 L64 79 L50 100 L26 100 L50 64 Z" fill="#b0bac9" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.6" />
              </svg>
            </div>
            <span>FACEIT XLR Extension</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-medium">v2.2.0</span>
          </div>
          <span className="hidden sm:inline text-xs text-neutral-400">
            Окно Popup расширения Chrome
          </span>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          title="Скачать ZIP архив расширения для установки в chrome://extensions"
        >
          {isDownloading ? (
            <span>Сборка архива...</span>
          ) : justDownloaded ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Архив скачан!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Скачать .ZIP</span>
            </>
          )}
        </button>
      </header>

      {/* The actual real extension popup window */}
      <main className="flex-1 flex items-center justify-center p-2">
        <div className="rounded-[18px] p-[1px] bg-gradient-to-b from-white/20 via-white/5 to-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
          <iframe
            src="/extension/popup.html"
            title="FACEIT XLR Extension Popup"
            className="w-[730px] h-[590px] rounded-[17px] border-none block bg-[#08090d]"
          />
        </div>
      </main>

      {/* Bottom hint for Chrome installation */}
      <footer className="w-full max-w-[760px] py-1.5 px-1 text-[11px] text-neutral-500 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Все оригинальные функции расширения и стили активны</span>
        </div>
        <div>
          Установка в Chrome: <b>chrome://extensions</b> → «Загрузить распакованное»
        </div>
      </footer>
    </div>
  );
}
