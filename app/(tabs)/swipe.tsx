// app/(tabs)/swipe.tsx — Immersive Article Reader
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { colors, formatRelativeTime, getTickerLogoUrl, radius, spacing } from '../theme';

const { width, height } = Dimensions.get('window');

interface Article {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  url: string;
  provider: string;
  provider_url: string;
  timestamp: number;
  image_url?: string;
  tickers: Array<{ symbol: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
}

export default function SwipeScreen() {
  const params = useLocalSearchParams();
  const { articleId, topicId } = params;
  const router = useRouter();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [followedTopics, setFollowedTopics] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState('');
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const loadArticles = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setFetchingMore(true);

      let response;
      if (topicId && topicId !== 'for-you' && pageNum === 1) {
        response = await api.getTopicArticles(topicId as string, pageNum, 20);
      } else {
        response = await api.getArticles({ page: pageNum, per_page: 20 });
      }

      if (pageNum === 1) {
        setArticles(response.articles);
        if (articleId) {
          const index = response.articles.findIndex((a: Article) => a.id === articleId);
          if (index !== -1) {
            setCurrentIndex(index);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index, animated: false });
            }, 100);
          }
        }
      } else {
        setArticles(prev => [...prev, ...response.articles]);
      }
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  }, [topicId, articleId]);

  useEffect(() => {
    loadArticles();
    loadFollowedTopics();
  }, []);

  const loadFollowedTopics = async () => {
    try {
      const response = await api.getFollowedTopics();
      setFollowedTopics(new Set(response.topics.map((t: { id: string }) => t.id)));
    } catch (error) {
      console.error('Error loading followed topics:', error);
    }
  };

  const handleToggleFollowTopic = async (id: string) => {
    try {
      if (followedTopics.has(id)) {
        await api.unfollowTopic(id);
        setFollowedTopics(prev => { const next = new Set(prev); next.delete(id); return next; });
      } else {
        await api.followTopic(id);
        setFollowedTopics(prev => new Set(prev).add(id));
      }
    } catch (error) {
      console.error('Error toggling topic follow:', error);
    }
  };

  const handleOpenArticle = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Failed to open article'));
  };

  const handleSendQuestion = () => {
    if (!question.trim()) return;
    const currentArticle = articles[currentIndex];
    if (!currentArticle) return;

    router.push({
      pathname: '/chat',
      params: {
        question: question.trim(),
        context: JSON.stringify({
          title: currentArticle.title,
          summary: currentArticle.summary,
          bullets: currentArticle.bullets || [],
          tickers: currentArticle.tickers || [],
        }),
      },
    });
    setQuestion('');
  };

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderCard = ({ item: article }: { item: Article }) => {
    if (!article) return null;

    const primaryTopic = article.topics?.[0];
    const isFollowing = primaryTopic ? followedTopics.has(primaryTopic.id) : false;
    const isSummaryExpanded = expandedSummaryId === article.id;

    return (
      <View style={styles.card}>
        <ScrollView
          style={styles.cardScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={!isSummaryExpanded}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.imageContainer}>
              {article.image_url ? (
                <>
                  <Image
                    source={{ uri: article.image_url }}
                    style={styles.heroImageBg}
                    resizeMode="cover"
                    blurRadius={20}
                  />
                  <Image
                    source={{ uri: article.image_url }}
                    style={styles.heroImageMain}
                    resizeMode="cover"
                  />
                </>
              ) : (
                <View style={styles.placeholderHero}>
                  <Ionicons name="newspaper-outline" size={64} color={colors.textTertiary} />
                </View>
              )}
            </View>

            <LinearGradient
              colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)', '#000000']}
              locations={[0, 0.25, 0.5, 1]}
              style={styles.gradient}
            />

            {/* Back + Actions */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.actionBtns}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleOpenArticle(article.provider_url)}
              >
                <Ionicons name="open-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Content over hero */}
            <View style={styles.heroContent}>
              {primaryTopic && (
                <View style={styles.topicRow}>
                  <Text style={styles.topicLabel}>{primaryTopic.name}</Text>
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                    onPress={() => handleToggleFollowTopic(primaryTopic.id)}
                  >
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.heroTitle}>{article.title}</Text>

              {/* Bullets */}
              {article.bullets && article.bullets.length > 0 && (
                <View style={styles.bulletsContainer}>
                  {article.bullets.slice(0, 3).map((bullet, index) => (
                    <View key={index} style={styles.bulletItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>
                        {bullet.replace(/["""]/g, '')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{article.provider}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{formatRelativeTime(article.timestamp)}</Text>
              </View>
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            {/* Tickers */}
            {article.tickers && article.tickers.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tickerScroll}
              >
                {article.tickers.map((ticker, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.tickerCard}
                    onPress={() => router.push({
                      pathname: '/stock/[symbol]',
                      params: { symbol: ticker.symbol },
                    })}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: getTickerLogoUrl(ticker.symbol) }}
                      style={styles.tickerLogo}
                      resizeMode="contain"
                    />
                    <View style={styles.tickerInfo}>
                      <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                      <Text style={styles.tickerName} numberOfLines={1}>{ticker.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Summary */}
            {article.summary && (
              <TouchableOpacity
                style={styles.summarySection}
                onPress={() => setExpandedSummaryId(prev => prev === article.id ? null : article.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.summaryText} numberOfLines={isSummaryExpanded ? undefined : 4}>
                  {article.summary}
                </Text>
                {!isSummaryExpanded && article.summary.length > 200 && (
                  <Text style={styles.readMoreText}>Read more</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Read Original */}
            <TouchableOpacity
              style={styles.readOriginalBtn}
              onPress={() => handleOpenArticle(article.provider_url)}
              activeOpacity={0.7}
            >
              <Ionicons name="globe-outline" size={18} color={colors.accent} />
              <Text style={styles.readOriginalText}>Read Original</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Expanded Summary Overlay */}
        {isSummaryExpanded && (
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.overlayBg}
              activeOpacity={1}
              onPress={() => setExpandedSummaryId(null)}
            />
            <View style={styles.overlayContent}>
              <TouchableOpacity
                style={styles.overlayHandle}
                onPress={() => setExpandedSummaryId(null)}
              >
                <View style={styles.handleBar} />
              </TouchableOpacity>
              <ScrollView
                style={styles.overlayScroll}
                contentContainerStyle={styles.overlayScrollContent}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <Text style={styles.overlayText}>{article.summary}</Text>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && articles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={articles}
          renderItem={renderCard}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          scrollEnabled={expandedSummaryId === null}
          onEndReached={() => {
            if (!fetchingMore && articles.length >= 20) loadArticles(page + 1);
          }}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
          ListFooterComponent={
            fetchingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            ) : null
          }
        />

        {/* Ask Sensybull Input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <Ionicons name="sparkles" size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="Ask Sensybull..."
              placeholderTextColor={colors.textTertiary}
              value={question}
              onChangeText={setQuestion}
              returnKeyType="send"
              onSubmitEditing={handleSendQuestion}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !question.trim() && { opacity: 0.3 }]}
              onPress={handleSendQuestion}
              disabled={!question.trim()}
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
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    height,
    width,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  cardScroll: { flex: 1 },

  // Hero
  heroSection: {
    minHeight: 480,
    position: 'relative',
    backgroundColor: colors.surface,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: colors.surface,
  },
  heroImageBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  heroImageMain: {
    position: 'absolute',
    width: '100%',
    height: 280,
  },
  placeholderHero: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Nav buttons
  backBtn: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtns: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    gap: spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero content
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  followBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  followBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  followBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  followBtnTextActive: {
    color: colors.textPrimary,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 30,
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  bulletsContainer: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.85)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textTertiary,
  },

  // Content section
  contentSection: {
    backgroundColor: colors.bg,
    paddingVertical: spacing.xl,
    paddingBottom: 120,
  },
  tickerScroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginRight: spacing.md,
    gap: spacing.md,
    minWidth: 180,
  },
  tickerLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tickerInfo: {
    flex: 1,
  },
  tickerSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tickerName: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Summary
  summarySection: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  readMoreText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  // Read original
  readOriginalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  readOriginalText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },

  // Input bar
  inputBar: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
  sendBtn: {
    marginLeft: spacing.sm,
  },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  overlayBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  overlayContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '75%',
    overflow: 'hidden',
  },
  overlayHandle: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
  },
  overlayScroll: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  overlayScrollContent: {
    paddingBottom: 40,
  },
  overlayText: {
    fontSize: 16,
    lineHeight: 25,
    color: colors.textSecondary,
  },
  loadingMore: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
