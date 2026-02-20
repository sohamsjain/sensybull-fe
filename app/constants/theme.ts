// app/constants/theme.ts
// Centralised design tokens and shared constants.
// TODO (security): Move LOGO_DEV_TOKEN to a backend proxy endpoint so the
// token is never shipped in the app binary. The backend can expose
// GET /api/ticker-logo/:symbol and forward the request server-side.

// ─── Brand / Palette ───────────────────────────────────────────────────────
export const Colors = {
  primary: '#007AFF',
  primaryLight: '#F0F7FF',

  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',

  black: '#000',
  nearBlack: '#1a1a1a',
  darkText: '#333',
  midText: '#666',
  lightText: '#999',
  white: '#fff',

  border: '#e0e0e0',
  borderLight: '#f0f0f0',
  surfaceLight: '#F8F9FA',
  surfaceMid: '#f5f5f5',
  surfaceDark: '#F3F4F6',
} as const;

// ─── Typography ────────────────────────────────────────────────────────────
export const FontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  display: 28,
  hero: 32,
} as const;

// ─── Spacing ───────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

// ─── Border radius ─────────────────────────────────────────────────────────
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  round: 24,
  full: 9999,
} as const;

// ─── Third-party tokens ────────────────────────────────────────────────────
// TODO: proxy logo.dev through the backend so this token is never in the binary.
export const LOGO_DEV_TOKEN = 'pk_NquCcOJqSl2ZVNwLRKmfjw';

export const getTickerLogoUrl = (symbol: string): string =>
  `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${LOGO_DEV_TOKEN}&format=png&theme=light&retina=true`;
