import React from 'react';
import { ExtensionConfig, WallpaperItem } from '../types/extension';
import { ACCENT_PALETTES } from '../data/wallpapers';
import { Shield, Users, Trophy, Radio, Volume2, MapPin, Swords } from 'lucide-react';

interface FaceitSimulatorProps {
  config: ExtensionConfig;
  activeWallpaper: WallpaperItem;
}

export const FaceitSimulator: React.FC<FaceitSimulatorProps> = ({
  config,
  activeWallpaper
}) => {
  const accent = ACCENT_PALETTES[config.accentColor] || ACCENT_PALETTES.orange;
  const isDark = config.theme === 'dark';

  return (
    <div className="w-full max-w-6xl mx-auto p-4 lg:p-6 flex flex-col items-center">
      {/* Simulation Frame Container */}
      <div className="w-full relative rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-black min-h-[640px]">
        {/* Background Image / Video Layer */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <img
            src={activeWallpaper.preview}
            alt={activeWallpaper.title}
            className="w-full h-full object-cover transition-all duration-300"
            style={{
              filter: `blur(${config.blur}px)`
            }}
          />

          {/* Dimming Layer */}
          <div 
            className="absolute inset-0 transition-colors duration-150"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${config.dimming / 100})`
            }}
          />
        </div>

        {/* Foreground Faceit Interface Mockup */}
        <div className="relative z-10 w-full h-full flex flex-col text-white">
          {/* Top Faceit Nav Header */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-black/60 backdrop-blur-md border-b border-white/10">
            <div className="flex items-center gap-6">
              {/* Faceit Logo */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#ff5500] rounded-sm flex items-center justify-center font-black text-black text-sm">
                  F
                </div>
                <span className="font-display font-black tracking-wider text-sm uppercase">FACEIT</span>
              </div>

              {/* Nav items */}
              <div className="hidden md:flex items-center gap-5 text-xs font-semibold text-neutral-300">
                <span className="text-white border-b-2 border-[#ff5500] pb-1">CS2 Matchmaking</span>
                <span className="hover:text-white cursor-pointer">Tournaments</span>
                <span className="hover:text-white cursor-pointer">Clans</span>
                <span className="hover:text-white cursor-pointer">Stats</span>
              </div>
            </div>

            {/* Profile Bar */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-orange-400">LVL 10</span>
                <span className="text-neutral-300 font-mono">2,480 ELO</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-300 p-0.5">
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                  alt="avatar" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
            </div>
          </div>

          {/* Matchroom Banner */}
          <div className="p-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
            {/* Match Status Bar */}
            <div className={`p-4 rounded-xl border backdrop-blur-md flex items-center justify-between ${
              isDark ? 'bg-neutral-900/70 border-white/10' : 'bg-white/80 border-slate-200 text-slate-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-500 flex items-center justify-center">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-500">МАТЧ ГОТОВ</span>
                    <span className="text-xs opacity-50">·</span>
                    <span className="text-xs font-mono font-medium">5v5 Ranked Competitive</span>
                  </div>
                  <h2 className="text-lg font-bold font-display leading-tight">
                    DE_MIRAGE · Server: Frankfurt (18 ms)
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all">
                  ПОДКЛЮЧИТЬСЯ К СЕРВЕРУ
                </button>
              </div>
            </div>

            {/* Teams Roster Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Team 1 */}
              <div className={`p-4 rounded-xl border backdrop-blur-md flex flex-col gap-3 ${
                isDark ? 'bg-neutral-900/70 border-white/10' : 'bg-white/80 border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-orange-500">КОМАНДА A (Terrorists)</span>
                  <span className="text-[11px] font-mono opacity-60">Avg ELO: 2,420</span>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { name: 'mysoul', elo: 2480, lvl: 10, ping: '16ms', captain: true },
                    { name: 'shir0_fan', elo: 2390, lvl: 10, ping: '22ms', captain: false },
                    { name: 's1mple_peek', elo: 2410, lvl: 10, ping: '19ms', captain: false },
                    { name: 'zywoo_clutch', elo: 2450, lvl: 10, ping: '25ms', captain: false },
                    { name: 'donk_entry', elo: 2370, lvl: 9, ping: '18ms', captain: false },
                  ].map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">
                          {player.lvl}
                        </span>
                        <span className="text-xs font-semibold">{player.name}</span>
                        {player.captain && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-white/10 text-orange-400">
                            CAPTAIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="opacity-80">{player.elo} ELO</span>
                        <span className="text-emerald-400 font-semibold">{player.ping}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team 2 */}
              <div className={`p-4 rounded-xl border backdrop-blur-md flex flex-col gap-3 ${
                isDark ? 'bg-neutral-900/70 border-white/10' : 'bg-white/80 border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-cyan-400">КОМАНДА B (Counter-Terrorists)</span>
                  <span className="text-[11px] font-mono opacity-60">Avg ELO: 2,435</span>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { name: 'niko_deagle', elo: 2510, lvl: 10, ping: '20ms', captain: true },
                    { name: 'monesy_flick', elo: 2440, lvl: 10, ping: '17ms', captain: false },
                    { name: 'b1t_headshot', elo: 2420, lvl: 10, ping: '24ms', captain: false },
                    { name: 'ropz_lurk', elo: 2460, lvl: 10, ping: '21ms', captain: false },
                    { name: 'rain_veteran', elo: 2350, lvl: 9, ping: '19ms', captain: false },
                  ].map((player, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-white">
                          {player.lvl}
                        </span>
                        <span className="text-xs font-semibold">{player.name}</span>
                        {player.captain && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-white/10 text-cyan-300">
                            CAPTAIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="opacity-80">{player.elo} ELO</span>
                        <span className="text-emerald-400 font-semibold">{player.ping}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Live Preview Settings Overlay Controls */}
            <div className="mt-4 p-3 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Живой фон FACEIT XLR активен: {activeWallpaper.title} (Затемнение: {config.dimming}%, Блюр: {config.blur}px)
              </span>
              <span className="text-neutral-400 font-mono text-[11px]">
                Нажмите «Интерфейс Popup», чтобы изменить фон
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
