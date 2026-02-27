// app/stock/[symbol].tsx — Stock Detail
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
  ViewToken,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { colors, formatRelativeTime, radius, spacing } from '../theme';

const { width } = Dimensions.get('window');

interface Article {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  url: string;
  provider: string;
  provider_url: string;
  timestamp: number;
  tickers: Array<{ id: string; symbol: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
}

interface Ticker {
  id: string;
  symbol: string;
  name: string;
  last_price?: number;
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
  const [snapshotPrice, setSnapshotPrice] = useState<number | null>(null);
  const [activeArticleIndex, setActiveArticleIndex] = useState<number | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 100 }).current;

  useEffect(() => {
    if (symbol) {
      loadTickerData();
      loadPriceData();
      loadArticles(1);
    }
  }, [symbol]);

  const loadPriceData = async () => {
    try {
      const [barsResp, snapResp] = await Promise.all([
        api.getTickerBars(symbol),
        api.getTickerSnapshot(symbol),
      ]);
      if (barsResp.bars?.length > 0) {
        setPriceData(barsResp.bars.map((b: any) => ({ timestamp: b.timestamp, price: b.price })));
      }
      if (snapResp.price) setSnapshotPrice(snapResp.price);
    } catch (error) {
      console.error('Error loading price data:', error);
    }
  };

  const loadTickerData = async () => {
    try {
      const response = await api.getTicker(symbol);
      setTicker(response.ticker);
      const followedResp = await api.getFollowedTickers();
      setIsFollowing(followedResp.tickers.some((t: Ticker) => t.symbol === symbol));
    } catch (error) {
      console.error('Error loading ticker:', error);
    }
  };

  const loadArticles = async (pageNum: number) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const response = await api.getArticlesByTicker(symbol, pageNum, 20);
      setArticles(pageNum === 1 ? response.articles : [...articles, ...response.articles]);
      setPage(pageNum);
      setHasMore(response.articles.length === 20);
    } catch (error) {
      console.error('Error loading articles:', error);
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
      Alert.alert('Error', 'Failed to update watchlist');
    }
  };

  const formatChartDate = (ts: number): string =>
    new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const formatPrice = (p?: number): string => p ? `$${p.toFixed(2)}` : '—';

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveArticleIndex(viewableItems[0].index);
    }
  }).current;

  const getChartData = () => {
    if (priceData.length === 0) return { labels: ['', '', '', '', ''], datasets: [{ data: [0, 0, 0, 0, 0] }] };
    const step = Math.max(1, Math.floor(priceData.length / 7));
    return {
      labels: priceData.filter((_, i) => i % step === 0).map(p => formatChartDate(p.timestamp)),
      datasets: [{ data: priceData.map(p => p.price) }],
    };
  };

  const renderArticleItem = ({ item, index }: { item: Article; index: number }) => {
    const isActive = index === activeArticleIndex;
    const isLast = index === articles.length - 1;

    return (
      <View style={styles.timelineItem}>
        <View style={styles.connector}>
          <View style={[styles.dot, isActive && styles.dotActive]} />
          {!isLast && <View style={styles.line} />}
        </View>

        <TouchableOpacity
          style={[styles.articleCard, isActive && styles.articleCardActive]}
          onPress={() => Linking.openURL(item.url)}
          activeOpacity={0.7}
        >
          {item.topics?.[0] && (
            <Text style={styles.articleTopic}>{item.topics[0].name}</Text>
          )}
          <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.articleFooter}>
            <Text style={styles.articleProvider}>{item.provider}</Text>
            <Text style={styles.articleTime}>{formatRelativeTime(item.timestamp)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

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

  const chartData = getChartData();
  const currentPrice = snapshotPrice || (priceData.length > 0 ? priceData[priceData.length - 1].price : ticker?.last_price || 0);
  const priceChange = priceData.length > 1
    ? ((priceData[priceData.length - 1].price - priceData[0].price) / priceData[0].price) * 100
    : 0;
  const isUp = priceChange >= 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSymbol}>{ticker?.symbol || symbol}</Text>
          <Text style={styles.headerName} numberOfLines={1}>{ticker?.name || ''}</Text>
        </View>
        <TouchableOpacity onPress={handleToggleFollow} style={styles.followBtn}>
          <Ionicons
            name={isFollowing ? 'star' : 'star-outline'}
            size={22}
            color={isFollowing ? colors.orange : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Price */}
      <View style={styles.priceSection}>
        <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
        <View style={[styles.changePill, isUp ? styles.changePillUp : styles.changePillDown]}>
          <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={14} color={isUp ? colors.green : colors.red} />
          <Text style={[styles.changeValue, isUp ? { color: colors.green } : { color: colors.red }]}>
            {isUp ? '+' : ''}{priceChange.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* Chart */}
      {priceData.length > 0 ? (
        <View style={styles.chartWrap}>
          <LineChart
            data={chartData}
            width={width}
            height={180}
            chartConfig={{
              backgroundColor: colors.bg,
              backgroundGradientFrom: colors.bg,
              backgroundGradientTo: colors.bg,
              decimalPlaces: 2,
              color: () => colors.accent,
              labelColor: () => colors.textTertiary,
              propsForDots: { r: '0' },
              propsForBackgroundLines: { strokeDasharray: '', stroke: colors.border, strokeWidth: 0.5 },
            }}
            bezier
            withHorizontalLabels
            withVerticalLabels
            withInnerLines
            withOuterLines={false}
            withVerticalLines={false}
            segments={3}
            style={styles.chart}
          />
        </View>
      ) : (
        <View style={styles.noChart}>
          <Text style={styles.noChartText}>No price data available</Text>
        </View>
      )}

      {/* Timeline */}
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTitle}>News Timeline</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderArticleItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (!loadingMore && hasMore) loadArticles(page + 1); }}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="newspaper-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No articles for {symbol}</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  headerCenter: { flex: 1, marginLeft: spacing.md },
  headerSymbol: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  headerName: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },
  followBtn: { padding: spacing.sm },

  // Price
  priceSection: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  currentPrice: { fontSize: 32, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 },
  changePill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full,
  },
  changePillUp: { backgroundColor: colors.greenMuted },
  changePillDown: { backgroundColor: colors.redMuted },
  changeValue: { fontSize: 14, fontWeight: '600' },

  // Chart
  chartWrap: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  chart: { marginVertical: 0 },
  noChart: { height: 100, justifyContent: 'center', alignItems: 'center' },
  noChartText: { fontSize: 13, color: colors.textTertiary },

  // Timeline
  timelineHeader: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  timelineTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  timelineContent: { paddingBottom: spacing.xxxl },
  timelineItem: { flexDirection: 'row', paddingLeft: spacing.xl },
  connector: { width: 24, alignItems: 'center', paddingTop: spacing.lg },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.bg,
  },
  dotActive: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.orange, borderWidth: 2 },
  line: { width: 1.5, flex: 1, backgroundColor: colors.border, marginTop: spacing.xs },
  articleCard: {
    flex: 1, marginRight: spacing.xl, marginVertical: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  articleCardActive: { borderColor: colors.orange },
  articleTopic: {
    fontSize: 11, fontWeight: '600', color: colors.accent,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  articleTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, lineHeight: 21, marginBottom: spacing.md },
  articleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  articleProvider: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
  articleTime: { fontSize: 12, color: colors.textTertiary },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.md },
});
