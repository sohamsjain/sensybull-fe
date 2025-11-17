// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const { width, height } = Dimensions.get('window');
const MIN_CARD_HEIGHT = 400;
const MAX_CARD_HEIGHT = height * 0.8;
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
  const FOR_YOU_TAB = { id: 'for-you', name: 'Watchlist' };

  // Articles state
  const [articlesByTopic, setArticlesByTopic] = useState<Map<string, Article[]>>(new Map());
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [page, setPage] = useState<Map<string, number>>(new Map());
  const [hasMore, setHasMore] = useState<Map<string, boolean>>(new Map());

  // Image dimensions state keyed by imageUri string. For default (local) images we don't fetch dims.
  const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

  // Load topics on mount
  useEffect(() => {
    loadFollowedTopics();
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

  // Load image dimensions for visible articles (ticker logos)
  useEffect(() => {
    const selectedTopic = topics[selectedTopicIndex];
    if (selectedTopic) {
      const articles = articlesByTopic.get(selectedTopic.id) || [];
      // only attempt to fetch dimensions for the first N articles to avoid spamming requests
      articles.slice(0, 12).forEach(article => {
        const imageUri = getTickerLogoUriForArticle(article);
        if (imageUri && !imageDimensions.has(imageUri)) {
          getImageDimensions(imageUri);
        }
      });
    }
  }, [selectedTopicIndex, articlesByTopic]);

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
  // Build the high-res square JPEG ticker logo URL
  const getTickerLogoUrl = (symbol: string) => {
    // Use the first-token format you provided; adjust token if needed.
    const token = 'pk_NquCcOJqSl2ZVNwLRKmfjw';
    // high-res square jpeg
    return `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${token}&size=300&square=true&retina=true`;
  };

  // For an article, return the ticker logo URI (first ticker) or undefined if none.
  const getTickerLogoUriForArticle = (article: Article): string | undefined => {
    if (article.tickers && article.tickers.length > 0 && article.tickers[0].symbol) {
      return getTickerLogoUrl(article.tickers[0].symbol);
    }
    return undefined;
  };

  // Fetch remote image dimensions (works for remote images only)
  const getImageDimensions = (imageUri: string) => {
    if (imageDimensions.has(imageUri)) return;

    Image.getSize(
      imageUri,
      (imgWidth, imgHeight) => {
        setImageDimensions(prev => new Map(prev).set(imageUri, {
          width: imgWidth,
          height: imgHeight
        }));
      },
      (error) => {
        console.error('Error getting image size for', imageUri, error);
        // Fallback: set a conservative default so card remains usable
        setImageDimensions(prev => new Map(prev).set(imageUri, {
          width: width,
          height: MIN_CARD_HEIGHT
        }));
      }
    );
  };

  // Decide card height: if there's a ticker logo uri, use its aspect ratio; otherwise use default
  const getCardHeight = (article: Article): number => {
    const imageUri = getTickerLogoUriForArticle(article);
    // If no ticker logo, use default height (local image)
    if (!imageUri) return MIN_CARD_HEIGHT + 50;

    const dimensions = imageDimensions.get(imageUri);
    if (!dimensions) return MIN_CARD_HEIGHT;

    const aspectRatio = dimensions.height / dimensions.width;
    const calculatedHeight = (width - 32) * aspectRatio; // subtract horizontal padding

    return Math.max(MIN_CARD_HEIGHT, Math.min(MAX_CARD_HEIGHT, calculatedHeight));
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
  const renderArticleCard = ({ item }: { item: Article }) => {
    const cardHeight = getCardHeight(item);
    const logoUri = getTickerLogoUriForArticle(item);

    return (
      <TouchableOpacity
        style={[styles.card, { height: cardHeight }]}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.95}
      >
        <View style={styles.imageContainer}>
          {/* If there is a ticker logo, use it, otherwise fall back to local default image */}
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.cardImage}
              resizeMode="cover"
              // defaultSource works only with local images on Android; keep local fallback below
            />
          ) : (
            <Image
              source={DEFAULT_IMAGE}
              style={styles.cardImage}
              resizeMode="cover"
            />
          )}

          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0)',
              'rgba(0, 0, 0, 0.3)',
              'rgba(0, 0, 0, 0.7)',
              'rgba(0, 0, 0, 0.9)',
            ]}
            locations={[0, 0.3, 0.7, 1]}
            style={styles.gradientOverlay}
          />

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Title */}
            <Text style={styles.cardTitle} numberOfLines={3}>
              {item.title}
            </Text>

            {/* Tickers */}
            {item.tickers && item.tickers.length > 0 && (
              <View style={styles.tickersRow}>
                {item.tickers.slice(0, 3).map((ticker, index) => (
                  <View key={index} style={styles.tickerBadge}>
                    <Image
                      source={{ uri: getTickerLogoUrl(ticker.symbol) }}
                      style={styles.tickerIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                  </View>
                ))}
                {item.tickers.length > 3 && (
                  <Text style={styles.moreTickersText}>
                    +{item.tickers.length - 3}
                  </Text>
                )}
              </View>
            )}

            {/* Metadata */}
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{item.provider}</Text>
              <Text style={styles.metaDivider}> • </Text>
              <Text style={styles.metaText}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loadingTopics || loadingArticles) return null;

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
  const articles = selectedTopic ? articlesByTopic.get(selectedTopic.id) || [] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Topics Tabs - Simple Text */}
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
        renderItem={renderArticleCard}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },

  // Tabs - Simple text style
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
    padding: 16,
    paddingBottom: 32,
  },

  // Article Card - Image Background with Dynamic Height
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Card Content - Over gradient
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 28,
    marginBottom: 12,
  },

  // Tickers
  tickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tickerIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    borderRadius: 8,
  },
  tickerSymbol: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  moreTickersText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },

  // Metadata
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metaDivider: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
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
