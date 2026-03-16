// app/services/api.ts
import * as SecureStore from 'expo-secure-store';
import { Config, validateConfig } from '../utils/config';
import { ApiError, NetworkError } from '../utils/errors';
import { logger } from '../utils/logger';

const API_BASE_URL = Config.apiBaseUrl;

class ApiService {
  private token: string | null = null;
  private tokenLoaded: Promise<void>;

  constructor() {
    validateConfig();
    this.tokenLoaded = this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await SecureStore.getItemAsync('access_token');
    } catch (error) {
      logger.error('Error loading token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      await SecureStore.setItemAsync('access_token', token);
      this.token = token;
    } catch (error) {
      logger.error('Error saving token:', error);
    }
  }

  private async saveRefreshToken(token: string) {
    try {
      await SecureStore.setItemAsync('refresh_token', token);
    } catch (error) {
      logger.error('Error saving refresh token:', error);
    }
  }

  private async clearToken() {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      this.token = null;
    } catch (error) {
      logger.error('Error clearing token:', error);
    }
  }

  private async getHeaders(includeAuth = true) {
    await this.tokenLoaded;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.access_token) {
        await this.saveToken(data.access_token);
        if (data.refresh_token) {
          await this.saveRefreshToken(data.refresh_token);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Attempt token refresh before giving up
      const refreshed = await this.tryRefreshToken();
      if (!refreshed) {
        await this.clearToken();
        throw new ApiError('Authentication required', 401, true);
      }
      // If refreshed, caller should retry — but for simplicity, we throw
      // and let the UI re-authenticate
      throw new ApiError('Session refreshed, please retry', 401, true);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new ApiError(error.error || 'Request failed', response.status);
    }

    return response.json();
  }

  // ────────────────────────────────────────────
  // Auth endpoints
  // ────────────────────────────────────────────

  async register(name: string, email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: await this.getHeaders(false),
      body: JSON.stringify({ name, email, password }),
    });

    const data = await this.handleResponse(response);
    if (data.access_token) {
      await this.saveToken(data.access_token);
      if (data.refresh_token) {
        await this.saveRefreshToken(data.refresh_token);
      }
    }
    return data;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: await this.getHeaders(false),
      body: JSON.stringify({ email, password }),
    });

    const data = await this.handleResponse(response);
    if (data.access_token) {
      await this.saveToken(data.access_token);
      if (data.refresh_token) {
        await this.saveRefreshToken(data.refresh_token);
      }
    }
    return data;
  }

  async logout() {
    await this.clearToken();
  }

  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ────────────────────────────────────────────
  // Articles endpoints
  // ────────────────────────────────────────────

  async getArticles(params: {
    page?: number;
    per_page?: number;
    ticker?: string;
    search?: string;
    provider?: string;
    topic?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${API_BASE_URL}/articles?${queryParams}`;
    const response = await fetch(url, {
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getArticle(articleId: string) {
    const response = await fetch(`${API_BASE_URL}/articles/${articleId}`, {
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getArticlesByTicker(ticker: string, page = 1, perPage = 20) {
    const response = await fetch(
      `${API_BASE_URL}/articles/ticker/${ticker}?page=${page}&per_page=${perPage}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getArticlesByTopic(topicName: string, page = 1, perPage = 20) {
    const response = await fetch(
      `${API_BASE_URL}/articles/topic/${topicName}?page=${page}&per_page=${perPage}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  // ────────────────────────────────────────────
  // Tickers endpoints
  // ────────────────────────────────────────────

  async searchTickers(query: string, page = 1, perPage = 10) {
    const response = await fetch(
      `${API_BASE_URL}/tickers?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getTicker(tickerSymbol: string) {
    const response = await fetch(
      `${API_BASE_URL}/tickers/${tickerSymbol.toUpperCase()}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async followTicker(tickerSymbol: string) {
    const response = await fetch(
      `${API_BASE_URL}/tickers/${tickerSymbol.toUpperCase()}/follow`,
      {
        method: 'POST',
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async unfollowTicker(tickerSymbol: string) {
    const response = await fetch(
      `${API_BASE_URL}/tickers/${tickerSymbol.toUpperCase()}/unfollow`,
      {
        method: 'DELETE',
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getFollowedTickers() {
    const response = await fetch(
      `${API_BASE_URL}/tickers/following`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getTickerSnapshot(symbol: string) {
    const response = await fetch(
      `${API_BASE_URL}/tickers/${symbol.toUpperCase()}/snapshot`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getTickerBars(symbol: string, params: {
    timeframe?: string;
    start?: string;
    end?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value);
      }
    });

    const qs = queryParams.toString();
    const url = `${API_BASE_URL}/tickers/${symbol.toUpperCase()}/bars${qs ? `?${qs}` : ''}`;
    const response = await fetch(url, {
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getBatchSnapshots(symbols: string[]) {
    if (symbols.length === 0) return { prices: {} };
    const response = await fetch(
      `${API_BASE_URL}/tickers/snapshots?symbols=${symbols.map(s => s.toUpperCase()).join(',')}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  // ────────────────────────────────────────────
  // Topics endpoints
  // ────────────────────────────────────────────

  async getAllTopics(params: {
    q?: string;
    page?: number;
    per_page?: number;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${API_BASE_URL}/topics?${queryParams}`;
    const response = await fetch(url, {
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTopic(topicId: string) {
    const response = await fetch(
      `${API_BASE_URL}/topics/${topicId}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getTopicByName(topicName: string) {
    const response = await fetch(
      `${API_BASE_URL}/topics/name/${encodeURIComponent(topicName)}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async followTopic(topicId: string) {
    const response = await fetch(
      `${API_BASE_URL}/topics/${topicId}/follow`,
      {
        method: 'POST',
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async unfollowTopic(topicId: string) {
    const response = await fetch(
      `${API_BASE_URL}/topics/${topicId}/unfollow`,
      {
        method: 'DELETE',
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getFollowedTopics() {
    const response = await fetch(
      `${API_BASE_URL}/topics/following`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async isFollowingTopic(topicId: string) {
    const response = await fetch(
      `${API_BASE_URL}/topics/${topicId}/is-following`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }

  async getTopicArticles(topicId: string, page = 1, perPage = 20) {
    const response = await fetch(
      `${API_BASE_URL}/topics/${topicId}/articles?page=${page}&per_page=${perPage}`,
      {
        headers: await this.getHeaders(),
      }
    );
    return this.handleResponse(response);
  }
}

export default new ApiService();
