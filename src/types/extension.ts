export type ThemeMode = 'dark' | 'light';

export type AccentColor = 'orange' | 'cyan' | 'emerald' | 'purple' | 'ruby' | 'monochrome';

export type ActiveTab = 'backgrounds' | 'appearance' | 'interface' | 'settings';

export type AppViewMode = 'popup' | 'faceit-sim' | 'download' | 'code';

export interface WallpaperItem {
  id: string;
  title: string;
  type: 'video' | 'image';
  preview: string;
  sourceUrl?: string;
  fileSize: string;
  duration?: string;
  isPreset?: boolean;
  animeStyle?: boolean;
  category: 'anime' | 'esports' | 'minimal' | 'cyber';
}

export interface InterfaceTweaks {
  hideAds: boolean;
  compactLobby: boolean;
  matchPingHighlight: boolean;
  customEloBadge: boolean;
  soundNotification: boolean;
  glassmorphicCards: boolean;
}

export interface AppearanceTweaks {
  glowIntensity: number;
  cardBorderRadius: number;
  headerTransparency: number;
  dimming: number;
  blur: number;
}

export interface ExtensionConfig {
  theme: ThemeMode;
  accentColor: AccentColor;
  language: 'ru' | 'en';
  activeWallpaperId: string;
  dimming: number;
  blur: number;
  soundEnabled: boolean;
  loopEnabled: boolean;
  isPlaying: boolean;
  fontFamily: 'outfit' | 'jakarta' | 'mono';
  discordUrl: string;
  telegramUrl: string;
  interface: InterfaceTweaks;
  appearance: AppearanceTweaks;
}
