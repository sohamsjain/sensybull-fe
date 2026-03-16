// app/utils/config.ts
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra;

export const Config = {
  apiBaseUrl: extra?.apiBaseUrl as string | undefined,
  logoDevToken: extra?.logoDevToken as string | undefined,
} as const;

/**
 * Validates that required config values are present.
 * Call this early in app startup to fail fast.
 */
export function validateConfig(): void {
  if (!Config.apiBaseUrl) {
    console.warn('Missing API_BASE_URL environment variable. API calls will fail.');
  }
  if (!Config.logoDevToken) {
    console.warn('Missing LOGO_DEV_TOKEN environment variable. Ticker logos will not load.');
  }
}
