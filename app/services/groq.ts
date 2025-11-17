// app/services/groq.ts
import Constants from 'expo-constants';

const GROQ_API_KEY = Constants.expoConfig?.extra?.groqApiKey;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

export class GroqService {
    private apiKey: string | undefined;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || GROQ_API_KEY;
    }

    async sendMessage(
        messages: Message[],
        articleContext?: ArticleContext
    ): Promise<string> {
        try {
            // Build system message with article context
            const systemMessages: Message[] = [];

            if (articleContext) {
                const contextMessage = this.buildContextMessage(articleContext);
                systemMessages.push({
                    role: 'system',
                    content: contextMessage,
                });
            }

            // Add general system instruction
            systemMessages.push({
                role: 'system',
                content: 'You are Sensybull, a helpful AI assistant specializing in financial news and market insights. Provide concise, accurate, and helpful responses about stocks, companies, and market trends. Always base your responses on the article context when provided.',
            });

            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile', // Using Groq's Llama model
                    messages: [...systemMessages, ...messages],
                    temperature: 0.7,
                    max_tokens: 1024,
                    top_p: 0.9,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    `Groq API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
                );
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || 'No response generated';
        } catch (error) {
            console.error('Groq API error:', error);
            throw error;
        }
    }

    private buildContextMessage(context: ArticleContext): string {
        const tickersText = context.tickers.map(t => `${t.name} (${t.symbol})`).join(', ');
        const bulletsText = context.bullets.map((b, i) => `${i + 1}. ${b}`).join('\n');

        return `You are discussing the following article:

Title: ${context.title}

Summary: ${context.summary}

Key Points:
${bulletsText}

Related Companies: ${tickersText}

Use this context to answer questions accurately. If the user asks about specific details not mentioned in the article, you can acknowledge what's in the article and provide general knowledge while being clear about what is from the article versus general information.`;
    }
}

export default new GroqService();