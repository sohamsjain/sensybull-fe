// app/stock/[symbol].tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const { width, height } = Dimensions.get('window');
const CHART_HEIGHT = height * 0.3;
const TIMELINE_HEIGHT = height * 0.7;

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
  tickers: Array<{ id: string; symbol: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
}

interface Ticker {
  id: string;
  symbol: string;
  name: string;
  last_price?: number;
  last_updated?: string;
}

interface PricePoint {
  timestamp: number;
  price: number;
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeArticleIndex, setActiveArticleIndex] = useState<number | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  useEffect(() => {
    if (symbol) {
      loadTickerData();
      loadArticles(1);
    }
  }, [symbol]);

  const generateMockPriceData = (articles: Article[], basePrice: number): PricePoint[] => {
    if (articles.length === 0) {
      // Generate 30 days of data if no articles
      const now = Date.now() / 1000;
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
      const data: PricePoint[] = [];
      
      for (let i = 0; i < 30; i++) {
        const timestamp = thirtyDaysAgo + (i * 24 * 60 * 60);
        const variance = (Math.random() - 0.5) * (basePrice * 0.05);
        const price = basePrice + variance + (i * 0.5); // Slight upward trend
        data.push({ timestamp, price });
      }
      
      return data;
    }

    // Generate data from oldest article to now
    const oldestTimestamp = Math.min(...articles.map(a => a.timestamp));
    const newestTimestamp = Math.max(...articles.map(a => a.timestamp));
    const now = Date.now() / 1000;
    
    const startTime = oldestTimestamp - (7 * 24 * 60 * 60); // Start 7 days before oldest article
    const endTime = Math.max(newestTimestamp, now);
    const duration = endTime - startTime;
    const numPoints = 100;
    const interval = duration / numPoints;

    const data: PricePoint[] = [];
    let currentPrice = basePrice;

    for (let i = 0; i <= numPoints; i++) {
      const timestamp = startTime + (i * interval);
      
      // Check if there's an article near this timestamp
      const nearbyArticle = articles.find(a => 
        Math.abs(a.timestamp - timestamp) < interval
      );

      if (nearbyArticle) {
        // Simulate market reaction to news
        const reaction = (Math.random() - 0.4) * (basePrice * 0.03);
        currentPrice += reaction;
      } else {
        // Normal market fluctuation
        const variance = (Math.random() - 0.5) * (basePrice * 0.01);
        currentPrice += variance;
      }

      // Keep price within reasonable bounds
      currentPrice = Math.max(basePrice * 0.8, Math.min(basePrice * 1.2, currentPrice));
      
      data.push({ timestamp, price: currentPrice });
    }

    return data;
  };

  const loadTickerData = async () => {
    try {
      const response = await api.getTicker(symbol);
      setTicker(response.ticker);
      
      // Check if following
      const followedResponse = await api.getFollowedTickers();
      const isFollowed = followedResponse.tickers.some(
        (t: Ticker) => t.symbol === symbol
      );
      setIsFollowing(isFollowed);
    } catch (error) {
      console.error('Error loading ticker:', error);
      Alert.alert('Error', 'Failed to load stock information');
    }
  };

  const loadArticles = async (pageNum: number) => {
    if (!symbol) return;

    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await api.getArticlesByTicker(symbol, pageNum, 20);
      
      const newArticles = pageNum === 1 ? response.articles : [...articles, ...response.articles];
      setArticles(newArticles);

      // Generate mock price data based on articles
      const basePrice = ticker?.last_price || 150 + Math.random() * 100;
      const mockData = generateMockPriceData(newArticles, basePrice);
      setPriceData(mockData);

      setPage(pageNum);
      setHasMore(response.articles.length === 20);
    } catch (error) {
      console.error('Error loading articles:', error);
      Alert.alert('Error', 'Failed to load articles');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!ticker) return;

    try {
      if (isFollowing) {
        await api.unfollowTicker(ticker.symbol);
        setIsFollowing(false);
      } else {
        await api.followTicker(ticker.symbol);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update watchlist');
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

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  const formatChartDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPrice = (price?: number): string => {
    if (!price) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadArticles(page + 1);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveArticleIndex(viewableItems[0].index);
    }
  }).current;

  const getChartData = () => {
    if (priceData.length === 0) {
      return {
        labels: ['', '', '', '', ''],
        datasets: [{ data: [0, 0, 0, 0, 0] }]
      };
    }

    // Sample data points for display (show ~7 labels)
    const step = Math.max(1, Math.floor(priceData.length / 7));
    const labels = priceData
      .filter((_, index) => index % step === 0)
      .map(p => formatChartDate(p.timestamp));
    
    const data = priceData.map(p => p.price);

    return {
      labels,
      datasets: [{ data }]
    };
  };

  const getActiveArticleMarkerPosition = (): number | null => {
    if (activeArticleIndex === null || articles.length === 0 || priceData.length === 0) {
      return null;
    }

    const article = articles[activeArticleIndex];
    if (!article) return null;

    const articleTimestamp = article.timestamp;
    const minTimestamp = priceData[0].timestamp;
    const maxTimestamp = priceData[priceData.length - 1].timestamp;

    // Calculate position as percentage
    const position = (articleTimestamp - minTimestamp) / (maxTimestamp - minTimestamp);
    return Math.max(0, Math.min(1, position));
  };

  const renderArticleItem = ({ item, index }: { item: Article; index: number }) => {
    const isActive = index === activeArticleIndex;
    const isLast = index === articles.length - 1;
    
    return (
      <View style={styles.timelineItem}>
        {/* Timeline Connector */}
        <View style={styles.timelineConnector}>
          <View style={[styles.timelineDot, isActive && styles.timelineDotActive]} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Article Card - Simplified */}
        <TouchableOpacity
          style={[styles.articleCard, isActive && styles.articleCardActive]}
          onPress={() => handleOpenArticle(item.url)}
          activeOpacity={0.7}
        >
          {/* Topics */}
          {item.topics && item.topics.length > 0 && (
            <View style={styles.topicsRow}>
              {item.topics.slice(0, 2).map((topic) => (
                <View key={topic.id} style={styles.topicTag}>
                  <Text style={styles.topicText}>{topic.name}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Title */}
          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Footer - Provider and Time */}
          <View style={styles.articleFooter}>
            <View style={styles.providerContainer}>
              <Text style={styles.provider}>{item.provider}</Text>
            </View>
            <Text style={styles.articleTime}>{formatTimestamp(item.timestamp)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const chartData = getChartData();
  const markerPosition = getActiveArticleMarkerPosition();
  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : ticker?.last_price || 0;
  const priceChange = priceData.length > 1 
    ? ((priceData[priceData.length - 1].price - priceData[0].price) / priceData[0].price) * 100
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerSymbol}>{ticker?.symbol || symbol}</Text>
          <Text style={styles.headerName} numberOfLines={1}>
            {ticker?.name || 'Loading...'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleToggleFollow}
          style={styles.followButton}
        >
          <Ionicons
            name={isFollowing ? 'star' : 'star-outline'}
            size={24}
            color={isFollowing ? '#FFD700' : '#007AFF'}
          />
        </TouchableOpacity>
      </View>

      {/* Chart Section - Fixed at Top 40% */}
      <View style={styles.chartContainer}>
        {/* Price Info */}
        <View style={styles.priceInfo}>
          <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
          <View style={[styles.priceChangeContainer, priceChange >= 0 ? styles.priceUp : styles.priceDown]}>
            <Ionicons 
              name={priceChange >= 0 ? 'trending-up' : 'trending-down'} 
              size={16} 
              color={priceChange >= 0 ? '#34C759' : '#FF3B30'} 
            />
            <Text style={[styles.priceChange, priceChange >= 0 ? styles.priceChangeUp : styles.priceChangeDown]}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Chart */}
        {priceData.length > 0 ? (
          <View style={styles.chartWrapper}>
            <LineChart
              data={chartData}
              width={width}
              height={CHART_HEIGHT - 80}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '0',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#e0e0e0',
                  strokeWidth: 1,
                },
              }}
              bezier
              style={styles.chart}
              withHorizontalLabels={true}
              withVerticalLabels={true}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              withHorizontalLines={true}
              segments={4}
            />
            
            {/* Active Article Marker */}
            {markerPosition !== null && (
              <View 
                style={[
                  styles.chartMarker,
                  { left: markerPosition * (width - 32) + 16 }
                ]}
              >
                <View style={styles.markerLine} />
                <View style={styles.markerDot} />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noChartData}>
            <Text style={styles.noChartText}>No price data available</Text>
          </View>
        )}

        {activeArticleIndex !== null && articles[activeArticleIndex] && (
          <View style={styles.activeArticleIndicator}>
            <View style={styles.indicatorDot} />
            <Text style={styles.indicatorText} numberOfLines={1}>
              {articles[activeArticleIndex].title}
            </Text>
          </View>
        )}
      </View>

      {/* Timeline Section - Scrollable 60% */}
      <View style={styles.timelineContainer}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Timeline</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={articles}
          renderItem={renderArticleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={48} color="#999" />
              <Text style={styles.emptyTitle}>No Articles Yet</Text>
              <Text style={styles.emptyText}>
                There are no articles available for {symbol}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : !hasMore && articles.length > 0 ? (
              <View style={styles.endOfTimeline}>
                <View style={styles.endDot} />
                <Text style={styles.endText}>End of timeline</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  followButton: {
    padding: 8,
  },
  
  // Chart Section
  chartContainer: {
    height: CHART_HEIGHT,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  priceUp: {
    backgroundColor: '#E8F5E9',
  },
  priceDown: {
    backgroundColor: '#FFEBEE',
  },
  priceChange: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceChangeUp: {
    color: '#34C759',
  },
  priceChangeDown: {
    color: '#FF3B30',
  },
  chartWrapper: {
    position: 'relative',
  },
  chart: {
    marginVertical: 0,
    borderRadius: 0,
  },
  chartMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: 'center',
  },
  markerLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#FF9500',
    opacity: 0.6,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF9500',
    position: 'absolute',
    top: '50%',
    marginTop: -5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  noChartData: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartText: {
    fontSize: 14,
    color: '#999',
  },
  activeArticleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9500',
  },
  indicatorText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Timeline Section
  timelineContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  timelineHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  timelineSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timelineContent: {
    paddingBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingLeft: 20,
  },
  timelineConnector: {
    width: 30,
    alignItems: 'center',
    paddingTop: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  timelineDotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF9500',
    borderWidth: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 6,
  },
  articleCard: {
    flex: 1,
    marginRight: 20,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  articleCardActive: {
    borderColor: '#FF9500',
    borderWidth: 2,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  topicTag: {
    backgroundColor: '#007AFF15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicText: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '600',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    lineHeight: 22,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  providerContainer: {
    flex: 1,
  },
  provider: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  articleTime: {
    fontSize: 12,
    color: '#999',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfTimeline: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingLeft: 30,
  },
  endDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginBottom: 8,
  },
  endText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});