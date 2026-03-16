// app/theme/index.ts

export const colors = {
  primary: '#007AFF',
  primaryLight: '#F0F7FF',
  accent: '#4F46E5',
  accentLight: '#EEF2FF',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',

  text: {
    primary: '#000',
    secondary: '#333',
    tertiary: '#666',
    muted: '#999',
  },

  background: {
    primary: '#fff',
    secondary: '#F3F4F6',
    tertiary: '#F8F9FA',
    input: '#f5f5f5',
  },

  border: {
    light: '#f0f0f0',
    medium: '#e0e0e0',
    dark: '#D1D5DB',
    separator: '#E5E7EB',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  body: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  title: 24,
  hero: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 24,
  circle: 999,
} as const;
