// app/services/groq.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl;

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ArticleContext {
    title: string;
    summary: string;
    bullets: string[];
    tickers: Array<{ symbol: string; name: string }>;
}

class ChatService {
    async sendMessage(
        messages: Message[],
        articleContext?: ArticleContext
    ): Promise<string> {
        const token = await AsyncStorage.getItem('access_token');

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                messages,
                article_context: articleContext
                    ? {
                          title: articleContext.title,
                          summary: articleContext.summary,
                          bullets: articleContext.bullets,
                          tickers: articleContext.tickers,
                      }
                    : undefined,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error || `Chat request failed: ${response.status}`
            );
        }

        const data = await response.json();
        return data.response || 'No response generated';
    }
}

export default new ChatService();
