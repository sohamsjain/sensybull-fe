// app/(tabs)/swipe.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

interface Article {
  id: string;
  title: string;
  summary: string;
  url: string;
  provider: string;
  timestamp: number;
  image_url?: string;
  tickers: Array<{ symbol: string; name: string }>;
}

export default function SwipeScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fetchingMore, setFetchingMore] = useState(false);
  const swiperRef = useRef<any>(null);
  const [page, setPage] = useState(1);

  const loadArticles = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setFetchingMore(true);
      }

      const response = await api.getArticles({
        page: pageNum,
        per_page: 20,
      });

      if (pageNum === 1) {
        setArticles(response.articles);
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
  }, []);

  useEffect(() => {
    loadArticles();
  }, []);

  const handleSwipedAll = () => {
    loadArticles(page + 1);
  };

  const handleSwiped = (index: number) => {
    setCurrentIndex(index + 1);

    // Load more articles when we're near the end
    if (index >= articles.length - 3 && !fetchingMore) {
      loadArticles(page + 1);
    }
  };

  const handleOpenArticle = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open article');
    });
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderCard = (article: Article) => {
    if (!article) return null;

    return (
      <View style={styles.card}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
          {article.image_url ? (
            <>
              <Image
                source={{ uri: article.image_url }}
                style={styles.imageBackground}
                resizeMode="cover"
                blurRadius={12}
              />
              <Image
                source={{ uri: article.image_url }}
                style={styles.image}
                resizeMode="contain"
              />
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="newspaper-outline" size={80} color="#ccc" />
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Provider and Time */}
          <View style={styles.metaRow}>
            <Text style={styles.provider}>{article.provider}</Text>
            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Liked', article.id)}>
                <Ionicons name="heart-outline" size={20} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => console.log('Bookmarked', article.id)}>
                <Ionicons name="bookmark-outline" size={20} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenArticle(article.url)}>
                <Ionicons name="share-outline" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {article.title}
          </Text>

          {/* Summary */}
          {article.summary && (
            <>
              <Text style={styles.summary} numberOfLines={12}>
                {article.summary}
              </Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(article.timestamp)}
              </Text>
            </>
          )}

          {/* Tickers */}
          {article.tickers && article.tickers.length > 0 && (
            <View style={styles.tickersContainer}>
              {article.tickers.slice(0, 3).map((ticker, index) => (
                <View key={index} style={styles.tickerBadge}>
                  <Text style={styles.tickerText}>{ticker.symbol}</Text>
                </View>
              ))}
              {article.tickers.length > 3 && (
                <View style={styles.tickerBadge}>
                  <Text style={styles.tickerText}>
                    +{article.tickers.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Floating Action Buttons */}

      </View>
    );
  };



  const renderNoMoreCards = () => {
    return (
      <View style={styles.noMoreCards}>
        <Ionicons name="checkmark-circle" size={80} color="#34c759" />
        <Text style={styles.noMoreCardsText}>You're all caught up!</Text>
        <Text style={styles.noMoreCardsSubtext}>
          Check back later for new articles
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            setCurrentIndex(0);
            setPage(1);
            loadArticles(1);
          }}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && articles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Swiper */}
      <View style={styles.swiperContainer}>
        {articles.length > 0 ? (
          <Swiper
            ref={swiperRef}
            cards={articles}
            cardVerticalMargin={0}
            cardHorizontalMargin={4}
            renderCard={renderCard}
            onSwiped={handleSwiped}
            onSwipedAll={handleSwipedAll}
            cardIndex={0}
            backgroundColor="transparent"
            swipeAnimationDuration={200}
            stackSize={3}
            stackScale={5}
            stackSeparation={14}
            animateOverlayLabelsOpacity
            animateCardOpacity={false}
            swipeBackCard
            verticalSwipe={true}
            verticalThreshold={10}
            horizontalSwipe={false}
            infinite={false}
          />
        ) : (
          renderNoMoreCards()
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperContainer: {
    flex: 1,
    paddingVertical: 0,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 126,
  },
  imageContainer: {
    height: 250,
    width: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  imageBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  provider: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  timestamp: {
    fontStyle: 'italic',
    fontSize: 12,
    color: '#999',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  summary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  tickersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    marginTop: 16,
  },
  tickerBadge: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMoreCards: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noMoreCardsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  noMoreCardsSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 30,
    gap: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fetchingMore: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  fetchingMoreText: {
    color: '#fff',
    fontSize: 12,
  },
});