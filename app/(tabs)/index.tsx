// app/(tabs)/index.tsx — The Feed
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { colors, formatRelativeTime, getTickerLogoUrl, radius, spacing } from '../theme';

interface Topic {
  id: string;
  name: string;
}

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

const FOR_YOU_TAB: Topic = { id: 'for-you', name: 'For You' };

export default function FeedScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<Article> | null>(null);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [articlesByTopic, setArticlesByTopic] = useState<Map<string, Article[]>>(new Map());
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState<Map<string, number>>(new Map());
  const [hasMore, setHasMore] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    loadFollowedTopics();
  }, []);

  useEffect(() => {
    if (topics.length > 0) {
      const selectedTopic = topics[selectedTopicIndex];
      if (!articlesByTopic.has(selectedTopic.id)) {
        loadArticlesForTopic(selectedTopic.id, 1);
      }
    }
  }, [selectedTopicIndex, topics]);

  const loadFollowedTopics = async () => {
    try {
      setLoadingTopics(true);
      const response = await api.getFollowedTopics();
      if (response.topics && response.topics.length > 0) {
        setTopics([FOR_YOU_TAB, ...response.topics]);
      } else {
        setTopics([FOR_YOU_TAB]);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      setTopics([FOR_YOU_TAB]);
    } finally {
      setLoadingTopics(false);
    }
  };

  const loadArticlesForTopic = async (topicId: string, pageNum: number) => {
    try {
      setLoadingArticles(true);
      let response;
      if (topicId === 'for-you') {
        response = await api.getArticles({ page: pageNum, per_page: 20 });
      } else {
        response = await api.getTopicArticles(topicId, pageNum, 20);
      }

      const existingArticles = articlesByTopic.get(topicId) || [];
      const existingIds = new Set(existingArticles.map(a => a.id));
      const newUniqueArticles = response.articles.filter((a: Article) => !existingIds.has(a.id));

      const newArticles = pageNum === 1
        ? response.articles
        : [...existingArticles, ...newUniqueArticles];

      setArticlesByTopic(prev => new Map(prev).set(topicId, newArticles));
      setPage(prev => new Map(prev).set(topicId, pageNum));
      setHasMore(prev => new Map(prev).set(topicId, response.pagination.has_next));
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleTopicChange = (index: number) => {
    setSelectedTopicIndex(index);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const handleLoadMore = () => {
    if (topics.length > 0 && !loadingArticles) {
      const selectedTopic = topics[selectedTopicIndex];
      const currentPage = page.get(selectedTopic.id) || 1;
      const hasMorePages = hasMore.get(selectedTopic.id) ?? true;
      if (hasMorePages) {
        loadArticlesForTopic(selectedTopic.id, currentPage + 1);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const selectedTopic = topics[selectedTopicIndex];
    if (selectedTopic) {
      await loadArticlesForTopic(selectedTopic.id, 1);
    }
    setRefreshing(false);
  };

  const handleArticlePress = (article: Article) => {
    const selectedTopic = topics[selectedTopicIndex];
    const articles = articlesByTopic.get(selectedTopic.id) || [];
    router.push({
      pathname: '/swipe',
      params: {
        articleId: article.id,
        topicId: selectedTopic.id,
        articleIds: JSON.stringify(articles.map(a => a.id)),
      },
    });
  };

  const renderTopicPill = ({ item, index }: { item: Topic; index: number }) => {
    const isActive = index === selectedTopicIndex;
    return (
      <TouchableOpacity
        style={[styles.pill, isActive && styles.pillActive]}
        onPress={() => handleTopicChange(index)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderArticleCard = ({ item }: { item: Article }) => {
    const firstTopic = item.topics?.[0];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.7}
      >
        {/* Top row: topic + time */}
        <View style={styles.cardTop}>
          {firstTopic ? (
            <Text style={styles.cardTopic}>{firstTopic.name}</Text>
          ) : (
            <View />
          )}
          <Text style={styles.cardTime}>{formatRelativeTime(item.timestamp)}</Text>
        </View>

        {/* Headline */}
        <Text style={styles.cardTitle} numberOfLines={3}>
          {item.title}
        </Text>

        {/* Tickers */}
        {item.tickers && item.tickers.length > 0 && (
          <View style={styles.tickersRow}>
            {item.tickers.slice(0, 4).map((ticker, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.tickerBadge}
                onPress={() => {
                  router.push({
                    pathname: '/stock/[symbol]',
                    params: { symbol: ticker.symbol },
                  });
                }}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: getTickerLogoUrl(ticker.symbol) }}
                  style={styles.tickerLogo}
                  resizeMode="contain"
                />
                <Text style={styles.tickerSymbol}>${ticker.symbol}</Text>
              </TouchableOpacity>
            ))}
            {item.tickers.length > 4 && (
              <View style={styles.tickerBadge}>
                <Text style={styles.tickerMore}>+{item.tickers.length - 4}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer: provider */}
        <Text style={styles.cardProvider}>{item.provider}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loadingTopics || loadingArticles) return null;

    if (topics.length <= 1) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="compass-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Welcome to Sensybull</Text>
          <Text style={styles.emptyText}>
            Follow topics and tickers to build your personalized feed
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="newspaper-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No articles yet</Text>
        <Text style={styles.emptyText}>Check back soon for updates</Text>
      </View>
    );
  };

  if (loadingTopics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedTopic = topics[selectedTopicIndex];
  const articles = selectedTopic ? articlesByTopic.get(selectedTopic.id) || [] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>sensybull</Text>
      </View>

      {/* Topic Pills */}
      {topics.length > 0 && (
        <FlatList
          horizontal
          data={topics}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderTopicPill}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsContainer}
          style={styles.pillsRow}
        />
      )}

      {/* Articles */}
      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderArticleCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.textSecondary}
          />
        }
        ListFooterComponent={
          loadingArticles && articles.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  pillsRow: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  pillsContainer: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.bg,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTopic: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 23,
    marginBottom: spacing.md,
  },
  tickersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    gap: 6,
  },
  tickerLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  tickerSymbol: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tickerMore: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  cardProvider: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
