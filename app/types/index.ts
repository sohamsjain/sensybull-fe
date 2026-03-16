// app/types/index.ts

export interface Article {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  url: string;
  provider: string;
  provider_url: string;
  timestamp: number;
  image_url?: string;
  tickers: Array<{ id?: string; symbol: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
}

export interface Ticker {
  id: string;
  symbol: string;
  name: string;
  last_price?: number;
  last_updated?: string;
}

export interface Topic {
  id: string;
  name: string;
}

export interface LivePrice {
  price: number;
  prev_close: number;
  change_percent: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
}
