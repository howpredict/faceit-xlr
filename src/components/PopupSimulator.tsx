import React, { useRef, useState } from 'react';
import { 
  ExtensionConfig, 
  WallpaperItem, 
  ActiveTab, 
  AccentColor 
} from '../types/extension';
import { ACCENT_PALETTES } from '../data/wallpapers';
import { 
  Sliders, 
  Layout, 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Check, 
  Sun, 
  Moon, 
  HelpCircle,
  Video,
  Image as ImageIcon,
  RotateCw,
  Sparkles,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Play,
  Pause
} from 'lucide-react';

interface PopupSimulatorProps {
  config: ExtensionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ExtensionConfig>>;
  wallpapers: WallpaperItem[];
  setWallpapers: React.Dispatch<React.SetStateAction<WallpaperItem[]>>;
  onOpenDownloadModal?: () => void;
}

export const PopupSimulator: React.FC<PopupSimulatorProps> = ({
  config,
  setConfig,
  wallpapers,
  setWallpapers,
  onOpenDownloadModal
}) => {
  const [activeTab, setActiveTab] = useState<'wallpaper' | 'appearance' | 'interface' | 'preferences'>('wallpaper');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');

  const activeWallpaper = wallpapers.find(w => w.id === config.activeWallpaperId) || wallpapers[0];
  const accent = ACCENT_PALETTES[config.accentColor] || ACCENT_PALETTES.orange;
  const isDark = config.theme === 'dark';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newWp: WallpaperItem = {
      id: `custom-${Date.now()}`,
      title: file.name,
      type: file.type.startsWith('video') ? 'video' : 'image',
      preview: url,
      sourceUrl: url,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} МБ`,
      duration: file.type.startsWith('video') ? '10 с' : undefined,
      category: 'cyber',
      isPreset: false
    };

    setWallpapers(prev => [newWp, ...prev]);
    setConfig(prev => ({ ...prev, activeWallpaperId: newWp.id }));
    notify('Фон успешно загружен!');
  };

  const notify = (msg: string) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2200);
  };

  const deleteCurrentWallpaper = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (wallpapers.length <= 1) return;
    setWallpapers(prev => prev.filter(w => w.id !== activeWallpaper.id));
    const nextWp = wallpapers.find(w => w.id !== activeWallpaper.id);
    if (nextWp) {
      setConfig(prev => ({ ...prev, activeWallpaperId: nextWp.id }));
    }
    notify('Фон удалён');
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Extension Popup Window (Exact 730x590 dimensions) */}
      <div 
        className="w-[740px] h-[590px] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col select-none bg-[#07080b] text-[#ececf3]"
        style={{
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        <div className="grid grid-cols-[185px_1fr] w-full h-full overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="bg-gradient-to-b from-[#101217] via-[#0c0d12] to-[#07080b] border-r border-white/10 p-5 flex flex-col">
            {/* BRAND HEADER */}
            <div className="flex items-center gap-3">
              {/* Perfectly symmetrical circular X badge */}
              <div className="w-10 h-10 rounded-full border border-white/20 bg-gradient-to-br from-[#242936] to-[#11141c] flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>

              <div className="flex flex-col">
                <span className="text-[9px] font-bold tracking-[0.25em] text-[#8b92a3] uppercase leading-none">
                  FACEIT
                </span>
                <span className="font-display font-black text-2xl tracking-tight leading-none text-white mt-0.5">
                  XLR
                </span>
              </div>
            </div>

            {/* Author row with Telegram and DISCORD! */}
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10">
              <span className="text-[11px] text-[#7b8192] font-medium mr-1">
                by mysoul
              </span>

              {/* Telegram */}
              <a
                href={config.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 rounded-md flex items-center justify-center text-[#9ea5b3] hover:text-white hover:bg-[#229ed9] bg-white/5 border border-white/10 transition-all duration-150"
                title="Telegram канал"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </a>

              {/* Discord - Visible with official Discord icon! */}
              <a
                href={config.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 rounded-md flex items-center justify-center text-[#9ea5b3] hover:text-white hover:bg-[#5865f2] bg-white/5 border border-white/10 transition-all duration-150"
                title="Discord сообщество"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </div>

            {/* Navigation Menu */}
            <nav className="flex flex-col gap-1.5 mt-4">
              <button
                onClick={() => setActiveTab('wallpaper')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'wallpaper'
                    ? 'bg-gradient-to-r from-orange-500/20 to-white/5 border border-orange-500/40 text-white shadow-xs'
                    : 'text-[#9196a6] hover:text-white hover:bg-white/5'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <span>Фон</span>
                {activeTab === 'wallpaper' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-auto shadow-[0_0_8px_#ff5500]" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'bg-gradient-to-r from-orange-500/20 to-white/5 border border-orange-500/40 text-white shadow-xs'
                    : 'text-[#9196a6] hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-4 h-4 text-orange-500" />
                <span>Оформление</span>
              </button>

              <button
                onClick={() => setActiveTab('interface')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'interface'
                    ? 'bg-gradient-to-r from-orange-500/20 to-white/5 border border-orange-500/40 text-white shadow-xs'
                    : 'text-[#9196a6] hover:text-white hover:bg-white/5'
                }`}
              >
                <Layout className="w-4 h-4 text-orange-500" />
                <span>Интерфейс</span>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  activeTab === 'preferences'
                    ? 'bg-gradient-to-r from-orange-500/20 to-white/5 border border-orange-500/40 text-white shadow-xs'
                    : 'text-[#9196a6] hover:text-white hover:bg-white/5'
                }`}
              >
                <SettingsIcon className="w-4 h-4 text-orange-500" />
                <span>Параметры</span>
              </button>
            </nav>

            {/* ADD WALLPAPER SECTION */}
            <div className="mt-auto flex flex-col gap-2 pt-3 border-t border-white/10">
              <span className="font-display text-[9px] font-bold tracking-[1.4px] text-[#7b8192] uppercase">
                ДОБАВИТЬ ФОН
              </span>

              <button
                onClick={() => {
                  setUploadType('image');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/50 text-[#ced3df] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-[#9fa5b5]" />
                  <span>Изображение</span>
                </div>
                <span className="text-orange-500 font-bold text-sm">+</span>
              </button>

              <button
                onClick={() => {
                  setUploadType('video');
                  fileInputRef.current?.click();
                }}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 hover:border-orange-500/50 text-[#ced3df] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-[#9fa5b5]" />
                  <span>Видео MP4</span>
                </div>
                <span className="text-orange-500 font-bold text-sm">+</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept={uploadType === 'video' ? 'video/mp4' : 'image/*'}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <div className="mt-2 text-left text-[10px] text-[#6a6f7e] font-mono">
              v.1.9
            </div>
          </aside>

          {/* MAIN WORKSPACE PANEL */}
          <main className="flex-1 flex flex-col p-5 overflow-y-auto">
            {/* Topbar: Quote + Title + Controls */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] font-semibold text-orange-500 tracking-wider">
                  心を燃やせ · FACEIT ENHANCED
                </span>
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-white mt-0.5">
                  {config.language === 'ru' ? 'Облачное настроение' : 'A little atmosphere'}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                {/* RU / EN switch */}
                <div className="flex items-center px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-xs font-bold">
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, language: 'ru' }))}
                    className={`px-1 rounded cursor-pointer ${
                      config.language === 'ru' ? 'text-orange-500 font-extrabold' : 'text-[#71839f] hover:text-white'
                    }`}
                  >
                    RU
                  </button>
                  <span className="text-[#71839f] px-0.5">/</span>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, language: 'en' }))}
                    className={`px-1 rounded cursor-pointer ${
                      config.language === 'en' ? 'text-orange-500 font-extrabold' : 'text-[#71839f] hover:text-white'
                    }`}
                  >
                    EN
                  </button>
                </div>

                {/* Theme Switch Toggle */}
                <button
                  onClick={() => setConfig(prev => ({ ...prev, theme: isDark ? 'light' : 'dark' }))}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:border-orange-500/50 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  title="Переключить тему"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-orange-500" />}
                </button>
              </div>
            </div>

            {/* TAB: WALLPAPER (ФОН) */}
            {activeTab === 'wallpaper' && (
              <div className="flex flex-col gap-3">
                {/* Preview Box */}
                <div className="rounded-xl border border-white/10 overflow-hidden bg-[#11141c] shadow-lg">
                  <div className="relative w-full h-[145px] bg-black overflow-hidden group">
                    <img
                      src={activeWallpaper.preview}
                      alt={activeWallpaper.title}
                      className="w-full h-full object-cover transition-all duration-300"
                      style={{
                        filter: `blur(${config.blur}px)`
                      }}
                    />

                    {/* Dimming layer */}
                    <div 
                      className="absolute inset-0 transition-colors duration-150 pointer-events-none"
                      style={{
                        backgroundColor: `rgba(0, 0, 0, ${config.dimming / 100})`
                      }}
                    />

                    {/* Top status tags */}
                    <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[9px] font-bold text-white tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ПРЕДПРОСМОТР
                      </span>

                      <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/15 text-[9px] font-bold text-white">
                        ВИДЕО ↻
                      </span>
                    </div>

                    {/* Match type pill */}
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-2 px-3 py-1 rounded-md bg-[#0e1118]/85 backdrop-blur-md border border-white/15 text-xs text-white shadow-lg pointer-events-none">
                      <span className="text-[10px] font-bold text-orange-500">ТИП МАТЧА</span>
                      <span className="text-neutral-500 font-bold">·</span>
                      <span className="text-[10px] font-semibold text-neutral-300">КАРТЫ DE_MIRAGE</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-white/15 flex items-center justify-center text-[9px] text-neutral-300 font-bold">
                        ?
                      </div>
                    </div>
                  </div>

                  {/* Active File Meta */}
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-white/10 bg-[#13161c]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-500 flex items-center justify-center">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">
                          {activeWallpaper.title}
                        </h4>
                        <p className="text-[10px] text-[#8b92a3]">
                          Видео · {config.soundEnabled ? 'со звуком' : 'без звука'} · повтор · {activeWallpaper.fileSize} · 10 с
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={deleteCurrentWallpaper}
                      className="p-1 rounded-md text-[#8b92a3] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Удалить фон"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* My Wallpapers List */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-[#8b92a3] tracking-wider uppercase font-display">
                      МОИ ФОНЫ
                    </span>
                    <span className="text-[10px] text-[#7b8192] font-mono">
                      {wallpapers.length} · {activeWallpaper.fileSize}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {wallpapers.slice(0, 4).map((wp) => (
                      <div
                        key={wp.id}
                        onClick={() => setConfig(prev => ({ ...prev, activeWallpaperId: wp.id }))}
                        className={`relative h-16 rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-150 group ${
                          wp.id === activeWallpaper.id
                            ? 'border-orange-500 shadow-md shadow-orange-500/30 scale-[1.02]'
                            : 'border-transparent hover:border-neutral-600 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img src={wp.preview} alt={wp.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/75 text-white">
                          MP4 ↻
                        </span>

                        <span className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-semibold text-white truncate">
                          {wp.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sliders: Затемнение & Мягкость фона */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#d1d5e0]">
                        Затемнение
                      </span>
                      <span className="text-xs font-mono font-bold text-orange-500">
                        {config.dimming}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="95"
                      value={config.dimming}
                      onChange={(e) => setConfig(prev => ({ ...prev, dimming: Number(e.target.value) }))}
                      style={{ accentColor: '#ff5500' }}
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#d1d5e0]">
                        Мягкость фона
                      </span>
                      <span className="text-xs font-mono font-bold text-orange-500">
                        {config.blur} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={config.blur}
                      onChange={(e) => setConfig(prev => ({ ...prev, blur: Number(e.target.value) }))}
                      style={{ accentColor: '#ff5500' }}
                    />
                  </div>
                </div>

                {/* Bottom Bar Controls */}
                <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between mt-auto">
                  <div className="text-[11px] text-[#8b92a3]">
                    <span>Без звука · повтор включён</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      {config.soundEnabled ? '🔊 Звук вкл' : '🔇 Без звука'}
                    </button>

                    <button
                      onClick={() => setConfig(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      {config.isPlaying ? 'II Пауза' : '▶ Пуск'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: APPEARANCE (ОФОРМЛЕНИЕ) */}
            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-3.5">
                {/* Panel Styles: Classic / Glass / Water */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Стиль панелей
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'classic', name: 'Классика', hint: 'Тёмные подложки' },
                      { id: 'glass', name: 'Стекло', hint: 'Матовое, как в iOS' },
                      { id: 'water', name: 'Вода', hint: 'Прозрачные блики' }
                    ].map(style => (
                      <button
                        key={style.id}
                        className="p-2.5 rounded-xl border border-white/10 bg-black/40 hover:border-orange-500/50 text-left transition-all cursor-pointer"
                      >
                        <strong className="block text-xs font-bold text-white">{style.name}</strong>
                        <small className="block text-[10px] text-neutral-400">{style.hint}</small>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modern Font Picker */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Шрифт интерфейса (Современный шрифт)
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, fontFamily: 'outfit' }))}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        config.fontFamily === 'outfit' ? 'border-orange-500 bg-orange-500/10 text-orange-500 font-bold' : 'border-white/10 text-neutral-300'
                      }`}
                    >
                      <span className="block text-xs font-bold font-display">Outfit</span>
                      <span className="block text-[10px] opacity-70">Esports Bold</span>
                    </button>

                    <button
                      onClick={() => setConfig(prev => ({ ...prev, fontFamily: 'jakarta' }))}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        config.fontFamily === 'jakarta' ? 'border-orange-500 bg-orange-500/10 text-orange-500 font-bold' : 'border-white/10 text-neutral-300'
                      }`}
                    >
                      <span className="block text-xs font-bold">Jakarta</span>
                      <span className="block text-[10px] opacity-70">Clean UI</span>
                    </button>

                    <button
                      onClick={() => setConfig(prev => ({ ...prev, fontFamily: 'mono' }))}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        config.fontFamily === 'mono' ? 'border-orange-500 bg-orange-500/10 text-orange-500 font-bold' : 'border-white/10 text-neutral-300'
                      }`}
                    >
                      <span className="block text-xs font-bold font-mono">JetBrains</span>
                      <span className="block text-[10px] opacity-70">Tech Mono</span>
                    </button>
                  </div>
                </div>

                {/* Accent Color Palette */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col gap-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Свой цвет FACEIT
                  </h3>
                  <div className="flex items-center gap-2.5">
                    {['#ff5500', '#06b6d4', '#10b981', '#a855f7', '#ef4444', '#ffffff'].map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded-full border border-white/30 cursor-pointer transition-transform hover:scale-110 shadow-md"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INTERFACE */}
            {activeTab === 'interface' && (
              <div className="flex flex-col gap-2">
                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Скрыть ESEA-лигу</h4>
                    <p className="text-[11px] text-neutral-400">Баннер «Зарегистрируйтесь сейчас» сверху</p>
                  </div>
                  <input type="checkbox" defaultChecked className="switch" />
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Скрыть миссии</h4>
                    <p className="text-[11px] text-neutral-400">Карточка «Выиграй 10 матчей» и прогресс</p>
                  </div>
                  <input type="checkbox" defaultChecked className="switch" />
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Скрыть ладдеры</h4>
                    <p className="text-[11px] text-neutral-400">Блок «Ладдеры» внизу главной страницы</p>
                  </div>
                  <input type="checkbox" defaultChecked className="switch" />
                </div>

                <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Скрыть панель Elo</h4>
                    <p className="text-[11px] text-neutral-400">Значок ранга, Сезон, Prestige Path и Elo</p>
                  </div>
                  <input type="checkbox" className="switch" />
                </div>
              </div>
            )}

            {/* TAB: PREFERENCES */}
            {activeTab === 'preferences' && (
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-xl border border-[#5865f2]/30 bg-[#5865f2]/10 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#5865f2] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Discord Сообщество
                    </h4>
                    <p className="text-[11px] text-neutral-300 mt-0.5">
                      Поделитесь своими фонами и скачивайте пресеты от игроков
                    </p>
                  </div>
                  <a
                    href={config.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-[#5865f2] text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-110"
                  >
                    <span>Вступить</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-4 rounded-xl border border-[#229ed9]/30 bg-[#229ed9]/10 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#229ed9]">
                      Telegram Канал
                    </h4>
                    <p className="text-[11px] text-neutral-300 mt-0.5">
                      Официальный канал разработчика mysoul
                    </p>
                  </div>
                  <a
                    href={config.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-[#229ed9] text-white text-xs font-bold flex items-center gap-1.5 hover:brightness-110"
                  >
                    <span>Открыть</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Bottom Auto Save Status Indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#8b92a3] mt-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Все изменения применяются автоматически</span>
            </div>
          </main>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="mt-4 flex items-center justify-between w-[740px] px-2 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Оригинальные функции расширения сохранены на 100%</span>
        </div>

        {onOpenDownloadModal && (
          <button
            onClick={onOpenDownloadModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать готовую папку (.ZIP)</span>
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {showNotification && (
        <div className="absolute top-6 right-6 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>{notificationMsg}</span>
        </div>
      )}
    </div>
  );
};
