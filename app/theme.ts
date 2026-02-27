// app/theme.ts — Sensybull Design System
// Dark-first, content-focused, premium finance aesthetic

export const colors = {
  // Backgrounds
  bg: '#000000',
  surface: '#111111',
  surfaceRaised: '#1C1C1E',
  surfaceHover: '#252528',

  // Borders
  border: '#2C2C2E',
  borderLight: '#3A3A3C',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',

  // Accent
  accent: '#0A84FF',
  accentMuted: 'rgba(10, 132, 255, 0.15)',

  // Semantic
  green: '#30D158',
  greenMuted: 'rgba(48, 209, 88, 0.15)',
  red: '#FF453A',
  redMuted: 'rgba(255, 69, 58, 0.15)',
  orange: '#FF9F0A',
  orangeMuted: 'rgba(255, 159, 10, 0.15)',

  // Overlays
  overlayLight: 'rgba(255, 255, 255, 0.06)',
  overlayMedium: 'rgba(255, 255, 255, 0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const LOGO_TOKEN = 'pk_NquCcOJqSl2ZVNwLRKmfjw';

export const getTickerLogoUrl = (symbol: string) =>
  `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${LOGO_TOKEN}&format=png&size=80&retina=true`;

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
