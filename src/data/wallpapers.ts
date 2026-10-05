import { WallpaperItem } from '../types/extension';

export const INITIAL_WALLPAPERS: WallpaperItem[] = [
  {
    id: 'shiro-mp4',
    title: '白凪shiro.mp4',
    type: 'video',
    preview: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    sourceUrl: 'https://assets.mixkit.co/videos/preview/mixkit-white-smoke-cloud-and-sparks-of-fire-42861-large.mp4',
    fileSize: '138.1 МБ',
    duration: '10 с',
    isPreset: true,
    animeStyle: true,
    category: 'anime'
  },
  {
    id: 'cyber-mirage',
    title: 'Mirage_Neon_CS2.mp4',
    type: 'video',
    preview: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    sourceUrl: 'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4',
    fileSize: '84.4 МБ',
    duration: '14 с',
    isPreset: true,
    animeStyle: false,
    category: 'cyber'
  },
  {
    id: 'nuage-minimal',
    title: 'Nuage_Dark_Clouds.jpg',
    type: 'image',
    preview: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop&q=80',
    fileSize: '4.2 МБ',
    isPreset: true,
    animeStyle: false,
    category: 'minimal'
  },
  {
    id: 'tokyo-rain',
    title: 'Shibuya_Nights_Anime.mp4',
    type: 'video',
    preview: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
    fileSize: '112.0 МБ',
    duration: '12 с',
    isPreset: true,
    animeStyle: true,
    category: 'anime'
  },
  {
    id: 'esports-arena',
    title: 'Major_Championship_Stage.jpg',
    type: 'image',
    preview: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
    fileSize: '6.8 МБ',
    isPreset: true,
    animeStyle: false,
    category: 'esports'
  }
];

export const ACCENT_PALETTES = {
  orange: {
    name: 'Faceit Classic',
    primary: '#ff5500',
    glow: 'rgba(255, 85, 0, 0.4)',
    bg: 'bg-orange-500',
    border: 'border-orange-500',
    text: 'text-orange-500',
    gradient: 'from-orange-500 to-amber-500'
  },
  cyan: {
    name: 'Cyber Cyan',
    primary: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.4)',
    bg: 'bg-cyan-500',
    border: 'border-cyan-500',
    text: 'text-cyan-500',
    gradient: 'from-cyan-500 to-blue-500'
  },
  emerald: {
    name: 'Pro Emerald',
    primary: '#10b981',
    glow: 'rgba(16, 185, 129, 0.4)',
    bg: 'bg-emerald-500',
    border: 'border-emerald-500',
    text: 'text-emerald-500',
    gradient: 'from-emerald-500 to-teal-500'
  },
  purple: {
    name: 'Electric Violet',
    primary: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    bg: 'bg-purple-500',
    border: 'border-purple-500',
    text: 'text-purple-500',
    gradient: 'from-purple-500 to-pink-500'
  },
  ruby: {
    name: 'Crimson Red',
    primary: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    bg: 'bg-red-500',
    border: 'border-red-500',
    text: 'text-red-500',
    gradient: 'from-red-500 to-rose-600'
  },
  monochrome: {
    name: 'Monochrome Shiro',
    primary: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.3)',
    bg: 'bg-white',
    border: 'border-white',
    text: 'text-white',
    gradient: 'from-neutral-200 to-neutral-400'
  }
};
