// app/chat.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import groqService, { ArticleContext, Message } from './services/groq';

interface ChatMessage extends Message {
    id: string;
    timestamp: number;
}

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const scrollViewRef = useRef<ScrollView>(null);

    // Parse article context from params — guard against malformed deep-link params
    let articleContext: ArticleContext | undefined;
    try {
        articleContext = params.context
            ? JSON.parse(params.context as string)
            : undefined;
    } catch {
        articleContext = undefined;
    }

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [initialQuestion, setInitialQuestion] = useState(params.question as string || '');

    useEffect(() => {
        let mounted = true;

        // Add welcome message
        const welcomeMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: articleContext
                ? `Hi! I'm here to help you understand this article about ${articleContext.tickers.map(t => t.name).join(', ')}. What would you like to know?`
                : "Hi! I'm Sensybull. How can I help you today?",
            timestamp: Date.now(),
        };
        setMessages([welcomeMessage]);

        // If there's an initial question, send it automatically
        let initialTimer: ReturnType<typeof setTimeout> | undefined;
        if (initialQuestion) {
            initialTimer = setTimeout(() => {
                if (mounted) handleSendMessage(initialQuestion);
            }, 500);
        }

        // Keyboard event listeners
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );

        return () => {
            mounted = false;
            clearTimeout(initialTimer);
            keyboardDidShowListener.remove();
        };
    }, []);

    const handleSendMessage = async (messageText?: string) => {
        const text = messageText || inputText;
        if (!text.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        // Scroll to bottom
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);

        try {
            // Prepare conversation history (exclude system messages and IDs/timestamps)
            const conversationHistory: Message[] = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role,
                    content: m.content,
                }));

            // Add the new user message
            conversationHistory.push({
                role: 'user',
                content: text.trim(),
            });

            // Get AI response
            const response = await groqService.sendMessage(
                conversationHistory,
                articleContext
            );

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
            };

            setMessages(prev => [...prev, assistantMessage]);

            // Scroll to bottom
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm sorry, I encountered an error processing your question. Please try again.",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.headerIconContainer}>
                        <Ionicons name="sparkles" size={20} color="#007AFF" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Ask Sensybull</Text>
                        {articleContext && (
                            <Text style={styles.headerSubtitle}>
                                {articleContext.tickers.map(t => t.symbol).join(', ')}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.headerRight} />
            </View>

            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {messages.map((message) => (
                        <View
                            key={message.id}
                            style={[
                                styles.messageWrapper,
                                message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                            ]}
                        >
                            <View
                                style={[
                                    styles.messageBubble,
                                    message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        message.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                                    ]}
                                >
                                    {message.content}
                                </Text>
                                <Text
                                    style={[
                                        styles.messageTime,
                                        message.role === 'user' ? styles.userMessageTime : styles.assistantMessageTime,
                                    ]}
                                >
                                    {formatTime(message.timestamp)}
                                </Text>
                            </View>
                        </View>
                    ))}

                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <View style={styles.loadingBubble}>
                                <ActivityIndicator size="small" color="#007AFF" />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ask a question..."
                            placeholderTextColor="#999"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            returnKeyType="send"
                            onSubmitEditing={() => handleSendMessage()}
                            blurOnSubmit={false}
                            onFocus={() => {
                                setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                }, 100);
                            }}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
                            onPress={() => handleSendMessage()}
                            disabled={!inputText.trim() || isLoading}
                        >
                            <Ionicons
                                name="send"
                                size={20}
                                color={inputText.trim() && !isLoading ? '#007AFF' : '#999'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    headerIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F0F7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    headerRight: {
        width: 32,
    },
    chatContainer: {
        flex: 1,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 24,
        flexGrow: 1,
    },
    messageWrapper: {
        marginBottom: 16,
    },
    userMessageWrapper: {
        alignItems: 'flex-end',
    },
    assistantMessageWrapper: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    userMessage: {
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    assistantMessage: {
        backgroundColor: '#F3F4F6',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userMessageText: {
        color: '#fff',
    },
    assistantMessageText: {
        color: '#333',
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
    },
    userMessageTime: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    assistantMessageTime: {
        color: '#999',
    },
    loadingContainer: {
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    loadingBubble: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
    },
    inputContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 12 : 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: 44,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        maxHeight: 100,
        paddingVertical: 8,
    },
    sendButton: {
        marginLeft: 8,
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});