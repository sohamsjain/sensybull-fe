// app/article/[id].tsx — Article Detail (deep link support)
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { colors, radius, spacing } from '../theme';

interface ArticleDetail {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  url: string;
  provider: string;
  timestamp: number;
  tickers: Array<{ symbol: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
}

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadArticle(); }, [id]);

  const loadArticle = async () => {
    try {
      const response = await api.getArticle(id as string);
      setArticle(response.article);
    } catch (error) {
      Alert.alert('Error', 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Article not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerProvider}>{article.provider}</Text>
        <TouchableOpacity onPress={() => Linking.openURL(article.url)}>
          <Ionicons name="open-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Topic */}
        {article.topics?.[0] && (
          <Text style={styles.topic}>{article.topics[0].name}</Text>
        )}

        <Text style={styles.title}>{article.title}</Text>

        <Text style={styles.date}>{formatDate(article.timestamp)}</Text>

        {/* Tickers */}
        {article.tickers.length > 0 && (
          <View style={styles.tickersRow}>
            {article.tickers.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={styles.tickerPill}
                onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: t.symbol } })}
              >
                <Text style={styles.tickerText}>${t.symbol}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bullets */}
        {article.bullets && article.bullets.length > 0 && (
          <View style={styles.bulletsCard}>
            <Text style={styles.bulletsLabel}>Key Points</Text>
            {article.bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{b.replace(/["""]/g, '')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        {article.summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Summary</Text>
            <Text style={styles.summaryText}>{article.summary}</Text>
          </View>
        )}

        {/* Ask AI */}
        <TouchableOpacity
          style={styles.askBtn}
          onPress={() => router.push({
            pathname: '/chat',
            params: {
              context: JSON.stringify({
                title: article.title,
                summary: article.summary,
                bullets: article.bullets || [],
                tickers: article.tickers || [],
              }),
            },
          })}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={18} color={colors.accent} />
          <Text style={styles.askBtnText}>Ask Sensybull about this</Text>
        </TouchableOpacity>

        {/* Read original */}
        <TouchableOpacity
          style={styles.readBtn}
          onPress={() => Linking.openURL(article.url)}
          activeOpacity={0.7}
        >
          <Text style={styles.readBtnText}>Read Original</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: colors.textTertiary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  headerProvider: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl * 2 },

  topic: {
    fontSize: 12, fontWeight: '600', color: colors.accent,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md,
  },
  title: {
    fontSize: 24, fontWeight: '700', color: colors.textPrimary,
    lineHeight: 31, letterSpacing: -0.3, marginBottom: spacing.md,
  },
  date: { fontSize: 13, color: colors.textTertiary, marginBottom: spacing.xl },

  tickersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  tickerPill: {
    backgroundColor: colors.surfaceRaised, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2, borderRadius: radius.full,
  },
  tickerText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  bulletsCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xl,
  },
  bulletsLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 15, lineHeight: 22, color: colors.textSecondary },

  summaryCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.xl,
  },
  summaryLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md,
  },
  summaryText: { fontSize: 15, lineHeight: 23, color: colors.textSecondary },

  askBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentMuted, borderRadius: radius.md,
    paddingVertical: spacing.md + 2, gap: spacing.sm, marginBottom: spacing.lg,
  },
  askBtnText: { fontSize: 15, fontWeight: '600', color: colors.accent },

  readBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: spacing.md, gap: spacing.sm,
  },
  readBtnText: { fontSize: 15, fontWeight: '600', color: colors.accent },
});
