// app/chat.tsx — AI Chat
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
import { colors, radius, spacing } from './theme';

interface ChatMessage extends Message {
  id: string;
  timestamp: number;
}

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  const articleContext: ArticleContext | undefined = params.context
    ? JSON.parse(params.context as string)
    : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [initialQuestion] = useState(params.question as string || '');

  useEffect(() => {
    const welcome: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: articleContext
        ? `I can help you understand this article about ${articleContext.tickers.map(t => t.name).join(', ')}. What would you like to know?`
        : "Hi! I'm Sensybull. How can I help you today?",
      timestamp: Date.now(),
    };
    setMessages([welcome]);

    if (initialQuestion) {
      setTimeout(() => handleSendMessage(initialQuestion), 500);
    }

    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => sub.remove();
  }, []);

  const handleSendMessage = async (text?: string) => {
    const msg = text || inputText;
    if (!msg.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history: Message[] = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: msg.trim() });

      const response = await groqService.sendMessage(history, articleContext);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      }]);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={18} color={colors.accent} />
          <Text style={styles.headerTitle}>Ask Sensybull</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[styles.msgWrap, msg.role === 'user' ? styles.msgRight : styles.msgLeft]}
            >
              <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.msgText, msg.role === 'user' ? styles.userText : styles.aiText]}>
                  {msg.content}
                </Text>
                <Text style={[styles.msgTime, msg.role === 'user' ? styles.userTime : styles.aiTime]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            </View>
          ))}

          {isLoading && (
            <View style={styles.msgLeft}>
              <View style={styles.aiBubble}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
              blurOnSubmit={false}
              onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isLoading) && { opacity: 0.3 }]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="arrow-up-circle" size={28} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },

  messages: { flex: 1 },
  messagesContent: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },

  msgWrap: { marginBottom: spacing.lg },
  msgRight: { alignItems: 'flex-end' },
  msgLeft: { alignItems: 'flex-start' },

  bubble: { maxWidth: '82%', padding: spacing.md, borderRadius: radius.lg },
  userBubble: { backgroundColor: colors.accent, borderBottomRightRadius: radius.xs },
  aiBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radius.xs },

  msgText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: colors.textSecondary },

  msgTime: { fontSize: 11, marginTop: spacing.xs },
  userTime: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  aiTime: { color: colors.textTertiary },

  inputBar: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.surface, borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, minHeight: 44,
  },
  input: { flex: 1, fontSize: 15, color: colors.textPrimary, maxHeight: 100, paddingVertical: spacing.xs },
  sendBtn: { marginLeft: spacing.sm, justifyContent: 'center' },
});
