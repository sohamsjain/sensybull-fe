// app/services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

console.log('Expo Config Extra:', Constants.expoConfig?.extra);
console.log('API Base URL:', Constants.expoConfig?.extra?.apiBaseUrl);

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl;

class ApiService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  private async saveToken(token: string) {
    try {
      await AsyncStorage.setItem('access_token', token);
      this.token = token;
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  private async clearToken() {
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      this.token = null;
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  private async getHeaders(includeAuth = true) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  private async handleResponse(response: Response) {
    if (response.status === 401) {
      // Token expired or invalid
      await this.clearToken();
      throw new Error('Authentication required');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
  }

  // Auth endpoints
  async register(name: string, email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: await this.getHeaders(false),
      body: JSON.stringify({ name, email, password }),
    });
    
    const data = await this.handleResponse(response);
    if (data.access_token) {
      await this.saveToken(data.access_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
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
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
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

  // Articles endpoints
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

  // Tickers endpoints
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

  // Topics endpoints
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