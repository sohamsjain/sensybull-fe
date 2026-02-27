// app/(tabs)/watchlist.tsx — Markets
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { colors, getTickerLogoUrl, radius, spacing } from '../theme';

interface Ticker {
  id: string;
  symbol: string;
  name: string;
  last_price?: number;
  last_updated?: string;
}

interface LivePrice {
  price: number;
  prev_close: number;
  change_percent: number;
}

export default function MarketsScreen() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<Ticker[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadLivePrices = async (tickers: Ticker[]) => {
    if (tickers.length === 0) return;
    try {
      const response = await api.getBatchSnapshots(tickers.map(t => t.symbol));
      setLivePrices(response.prices || {});
    } catch (error) {
      console.error('Error loading live prices:', error);
    }
  };

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      const response = await api.getFollowedTickers();
      const tickers = response.tickers || [];
      setWatchlist(tickers);
      await loadLivePrices(tickers);
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchMode(false);
      return;
    }
    setIsSearchMode(true);
    setSearching(true);
    try {
      const response = await api.searchTickers(query, 1, 20);
      setSearchResults(response.tickers || []);
    } catch (error) {
      console.error('Error searching tickers:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleFollowTicker = async (ticker: Ticker) => {
    try {
      await api.followTicker(ticker.symbol);
      setWatchlist(prev => [...prev, ticker]);
      setSearchResults(prev => prev.filter(t => t.id !== ticker.id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add ticker');
    }
  };

  const handleUnfollowTicker = async (ticker: Ticker) => {
    Alert.alert('Remove', `Remove ${ticker.symbol} from watchlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.unfollowTicker(ticker.symbol);
            setWatchlist(prev => prev.filter(t => t.id !== ticker.id));
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to remove');
          }
        },
      },
    ]);
  };

  const isInWatchlist = (tickerId: string): boolean =>
    watchlist.some(t => t.id === tickerId);

  const formatPrice = (symbol: string, dbPrice?: number): string => {
    const live = livePrices[symbol];
    if (live && live.price > 0) return `$${live.price.toFixed(2)}`;
    if (dbPrice && dbPrice > 0) return `$${dbPrice.toFixed(2)}`;
    return '—';
  };

  const renderWatchlistItem = ({ item }: { item: Ticker }) => {
    const live = livePrices[item.symbol];
    const pct = live?.change_percent;
    const up = pct !== undefined && pct >= 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: item.symbol } })}
        activeOpacity={0.6}
      >
        <Image source={{ uri: getTickerLogoUrl(item.symbol) }} style={styles.logo} resizeMode="contain" />
        <View style={styles.info}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>{formatPrice(item.symbol, item.last_price)}</Text>
          {pct !== undefined && pct !== 0 && (
            <View style={[styles.badge, up ? styles.badgeUp : styles.badgeDown]}>
              <Text style={[styles.badgeText, up ? styles.badgeTextUp : styles.badgeTextDown]}>
                {up ? '+' : ''}{pct.toFixed(2)}%
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.xBtn} onPress={() => handleUnfollowTicker(item)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSearchItem = ({ item }: { item: Ticker }) => {
    const added = isInWatchlist(item.id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: item.symbol } })}
        activeOpacity={0.6}
      >
        <Image source={{ uri: getTickerLogoUrl(item.symbol) }} style={styles.logo} resizeMode="contain" />
        <View style={styles.info}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        </View>
        {added ? (
          <View style={styles.addedCircle}>
            <Ionicons name="checkmark" size={14} color={colors.green} />
          </View>
        ) : (
          <TouchableOpacity style={styles.addCircle} onPress={() => handleFollowTicker(item)}>
            <Ionicons name="add" size={20} color={colors.accent} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>Markets</Text></View>
        <View style={styles.center}><ActivityIndicator size="small" color={colors.textSecondary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>Markets</Text></View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stocks..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setIsSearchMode(false); }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearchMode ? (
        <>
          <Text style={styles.section}>Results</Text>
          {searching ? (
            <View style={styles.center}><ActivityIndicator size="small" color={colors.textSecondary} /></View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No results</Text></View>}
            />
          )}
        </>
      ) : (
        <>
          <Text style={styles.section}>Watchlist</Text>
          <FlatList
            data={watchlist}
            renderItem={renderWatchlistItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadWatchlist} tintColor={colors.textSecondary} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="star-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyTitle}>No stocks yet</Text>
                <Text style={styles.emptyText}>Search above to add stocks</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 },
  searchWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 44,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  section: {
    fontSize: 13, fontWeight: '600', color: colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  list: { paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md + 2, gap: spacing.md,
  },
  logo: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface },
  info: { flex: 1 },
  symbol: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  name: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },
  priceCol: { alignItems: 'flex-end', gap: spacing.xs },
  price: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeUp: { backgroundColor: colors.greenMuted },
  badgeDown: { backgroundColor: colors.redMuted },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextUp: { color: colors.green },
  badgeTextDown: { color: colors.red },
  xBtn: { padding: spacing.xs },
  addCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.accentMuted, justifyContent: 'center', alignItems: 'center',
  },
  addedCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.greenMuted, justifyContent: 'center', alignItems: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },
});
