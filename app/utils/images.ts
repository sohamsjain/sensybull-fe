// app/utils/images.ts
import { Config } from './config';

/**
 * Generates a Logo.dev URL for a ticker symbol.
 */
export function getTickerLogoUrl(symbol: string): string {
  const token = Config.logoDevToken;
  return `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${token}&format=png&size=300&retina=true`;
}
