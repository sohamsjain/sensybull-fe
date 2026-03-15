// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const DEFAULT_IMAGE = require('../../assets/images/default.jpg');

// --- Types
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

export default function HomeScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<Article> | null>(null);

  // Topics state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const FOR_YOU_TAB = { id: 'for-you', name: 'Watchlist Updates' };

  // Watchlist state
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(new Set());

  // Articles state
  const [articlesByTopic, setArticlesByTopic] = useState<Map<string, Article[]>>(new Map());
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [page, setPage] = useState<Map<string, number>>(new Map());
  const [hasMore, setHasMore] = useState<Map<string, boolean>>(new Map());

  // Load topics and watchlist on mount
  useEffect(() => {
    loadFollowedTopics();
    loadWatchlistTickers();
  }, []);

  // Load articles when topic changes
  useEffect(() => {
    if (topics.length > 0) {
      const selectedTopic = topics[selectedTopicIndex];
      if (!articlesByTopic.has(selectedTopic.id)) {
        loadArticlesForTopic(selectedTopic.id, 1);
      }
    }
  }, [selectedTopicIndex, topics]);

  // --- API loaders
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
    } finally {
      setLoadingTopics(false);
    }
  };

  const loadWatchlistTickers = async () => {
    try {
      const response = await api.getFollowedTickers();
      if (response.tickers && response.tickers.length > 0) {
        setWatchlistSymbols(new Set(response.tickers.map((t: { symbol: string }) => t.symbol)));
      }
    } catch (error) {
      console.error('Error loading watchlist tickers:', error);
    }
  };

  const loadArticlesForTopic = async (topicId: string, pageNum: number) => {
    try {
      setLoadingArticles(true);

      let response;
      if (topicId === 'for-you') {
        response = await api.getArticles({ page: pageNum, per_page: 50 });
      } else {
        response = await api.getTopicArticles(topicId, pageNum, 20);
      }

      const existingArticles = articlesByTopic.get(topicId) || [];
      const existingIds = new Set(existingArticles.map(a => a.id));

      // Deduplicate: only add articles we don't already have
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

  // --- Image helpers
  const getTickerLogoUrl = (symbol: string) => {
    const token = 'pk_NquCcOJqSl2ZVNwLRKmfjw';
    return `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${token}&size=300&square=true&retina=true`;
  };

  const getTickerLogoUriForArticle = (article: Article): string | undefined => {
    if (article.tickers && article.tickers.length > 0 && article.tickers[0].symbol) {
      return getTickerLogoUrl(article.tickers[0].symbol);
    }
    return undefined;
  };

  // --- Handlers
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

  const handleArticlePress = (article: Article) => {
    const selectedTopic = topics[selectedTopicIndex];
    const allArticles = articlesByTopic.get(selectedTopic.id) || [];

    router.push({
      pathname: '/swipe',
      params: {
        articleId: article.id,
        topicId: selectedTopic.id,
        articleIds: JSON.stringify(allArticles.map(a => a.id)),
      },
    });
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // --- Renderers
  const renderArticleRow = ({ item }: { item: Article }) => {
    const logoUri = getTickerLogoUriForArticle(item);

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={logoUri ? { uri: logoUri } : DEFAULT_IMAGE}
          style={styles.rowLogo}
          resizeMode="cover"
        />

        <View style={styles.rowContent}>
          <View style={styles.rowTopLine}>
            {item.topics && item.topics.length > 0 && (
              <Text style={styles.rowTopic} numberOfLines={1}>
                {item.topics[0].name}
              </Text>
            )}
            <View style={styles.rowMeta}>
              <Text style={styles.rowProvider} numberOfLines={1}>{item.provider}</Text>
              <Text style={styles.rowDot}> · </Text>
              <Text style={styles.rowTime}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          </View>

          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loadingTopics || loadingArticles) return null;

    const selectedTopic = topics[selectedTopicIndex];
    if (selectedTopic?.id === 'for-you' && watchlistSymbols.size === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="star-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No Watchlist Tickers</Text>
          <Text style={styles.emptyText}>
            Follow tickers from the Watchlist tab to see updates here
          </Text>
        </View>
      );
    }

    if (topics.length === 1 && topics[0].id === 'for-you') {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={64} color="#666" />
          <Text style={styles.emptyTitle}>No Followed Topics</Text>
          <Text style={styles.emptyText}>
            Start following topics to see personalized news
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/swipe')}
          >
            <Text style={styles.exploreButtonText}>Explore Topics</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="newspaper-outline" size={64} color="#666" />
        <Text style={styles.emptyTitle}>No Articles Yet</Text>
        <Text style={styles.emptyText}>Check back soon for new articles</Text>
      </View>
    );
  };

  if (loadingTopics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  const selectedTopic = topics[selectedTopicIndex];
  let articles = selectedTopic ? articlesByTopic.get(selectedTopic.id) || [] : [];

  // Filter watchlist tab: only show articles with at least one ticker in watchlist
  if (selectedTopic?.id === 'for-you' && watchlistSymbols.size > 0) {
    articles = articles.filter(article =>
      article.tickers.some(t => watchlistSymbols.has(t.symbol))
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Topics Tabs */}
      {topics.length > 0 && (
        <View style={styles.tabsContainer}>
          <FlatList
            horizontal
            data={topics}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTopicChange(index)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTopicIndex === index && styles.tabTextActive,
                  ]}
                >
                  {item.name}
                </Text>
                {selectedTopicIndex === index && (
                  <View style={styles.tabIndicator} />
                )}
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          />
        </View>
      )}

      {/* Articles List */}
      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderArticleRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          loadingArticles && articles.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#000" />
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
    backgroundColor: '#fff',
  },

  // Tabs
  tabsContainer: {
    backgroundColor: '#fff',
    paddingBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 24,
  },
  tab: {
    paddingVertical: 8,
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#999',
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#000',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#000',
    borderRadius: 1,
  },

  // Articles List
  listContent: {
    paddingBottom: 32,
  },

  // Gmail-style row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  rowLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  rowContent: {
    flex: 1,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowTopic: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5f6368',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
    marginRight: 8,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowProvider: {
    fontSize: 12,
    color: '#999',
    maxWidth: 80,
  },
  rowDot: {
    fontSize: 12,
    color: '#ccc',
  },
  rowTime: {
    fontSize: 12,
    color: '#999',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#202124',
    lineHeight: 20,
  },

  // Empty States
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    marginTop: 24,
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
