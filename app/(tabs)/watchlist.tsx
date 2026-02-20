// app/(tabs)/watchlist.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { getTickerLogoUrl } from '../constants/theme';

interface Ticker {
    id: string;
    symbol: string;
    name: string;
    last_price?: number;
    last_updated?: string;
}

export default function WatchlistScreen() {
    const router = useRouter();
    const [watchlist, setWatchlist] = useState<Ticker[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Ticker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);

    useEffect(() => {
        loadWatchlist();
    }, []);

    const loadWatchlist = async () => {
        try {
            setLoading(true);
            const response = await api.getFollowedTickers();
            setWatchlist(response.tickers || []);
        } catch (error) {
            console.error('Error loading watchlist:', error);
            Alert.alert('Error', 'Failed to load your watchlist');
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

            // Remove from search results
            setSearchResults(prev => prev.filter(t => t.id !== ticker.id));

            Alert.alert('Success', `Added ${ticker.symbol} to your watchlist`);
        } catch (error: any) {
            console.error('Error following ticker:', error);
            Alert.alert('Error', error.message || 'Failed to add ticker to watchlist');
        }
    };

    const handleUnfollowTicker = async (ticker: Ticker) => {
        Alert.alert(
            'Remove from Watchlist',
            `Are you sure you want to remove ${ticker.symbol} from your watchlist?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.unfollowTicker(ticker.symbol);
                            setWatchlist(prev => prev.filter(t => t.id !== ticker.id));
                        } catch (error: any) {
                            console.error('Error unfollowing ticker:', error);
                            Alert.alert('Error', error.message || 'Failed to remove ticker from watchlist');
                        }
                    },
                },
            ]
        );
    };

    const formatPrice = (price?: number): string => {
        if (price == null || price === 0) return 'N/A';
        return `$${price.toFixed(2)}`;
    };


    const isTickerInWatchlist = (tickerId: string): boolean => {
        return watchlist.some(t => t.id === tickerId);
    };

    const renderTickerItem = ({ item, isSearchResult = false }: { item: Ticker; isSearchResult?: boolean }) => (
        <View style={styles.tickerItem}>
            <TouchableOpacity
                style={styles.tickerLeft}
                onPress={() => router.push({
                    pathname: '/stock/[symbol]',
                    params: { symbol: item.symbol }
                })}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: getTickerLogoUrl(item.symbol) }}
                    style={styles.tickerLogo}
                    resizeMode="contain"
                />
                <View style={styles.tickerInfo}>
                    <Text style={styles.tickerSymbol}>{item.symbol}</Text>
                    <Text style={styles.tickerName} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>
                {!isSearchResult && item.last_price !== undefined && (
                    <Text style={styles.tickerPrice}>{formatPrice(item.last_price)}</Text>
                )}
            </TouchableOpacity>

            <View style={styles.tickerRight}>
                {isSearchResult ? (
                    isTickerInWatchlist(item.id) ? (
                        <View style={styles.addedBadge}>
                            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                            <Text style={styles.addedText}>Added</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => handleFollowTicker(item)}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    )
                ) : (
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleUnfollowTicker(item)}
                    >
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderEmptyWatchlist = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={64} color="#999" />
            <Text style={styles.emptyTitle}>Your Watchlist is Empty</Text>
            <Text style={styles.emptyText}>
                Search for stocks to add them to your watchlist and stay updated
            </Text>
        </View>
    );

    const renderEmptySearch = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#999" />
            <Text style={styles.emptyTitle}>No Results Found</Text>
            <Text style={styles.emptyText}>
                Try searching with a different ticker symbol or company name
            </Text>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Watchlist</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Watchlist</Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for stocks..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                                setIsSearchMode(false);
                            }}
                            style={styles.clearButton}
                        >
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Content */}
            {isSearchMode ? (
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Search Results</Text>
                    {searching ? (
                        <ActivityIndicator size="small" color="#007AFF" style={styles.searchLoading} />
                    ) : (
                        <FlatList
                            data={searchResults}
                            renderItem={({ item }) => renderTickerItem({ item, isSearchResult: true })}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={renderEmptySearch}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            ) : (
                <View style={styles.content}>
                    <FlatList
                        data={watchlist}
                        renderItem={({ item }) => renderTickerItem({ item, isSearchResult: false })}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={renderEmptyWatchlist}
                        showsVerticalScrollIndicator={false}
                        refreshing={loading}
                        onRefresh={loadWatchlist}
                    />
                </View>
            )}
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
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#f8f8f8',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#000',
    },
    clearButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#f8f8f8',
    },
    listContent: {
        flexGrow: 1,
    },
    tickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    tickerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    tickerLogo: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#f0f0f0',
    },
    tickerInfo: {
        flex: 1,
    },
    tickerSymbol: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    tickerName: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    tickerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tickerPrice: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    addButton: {
        padding: 4,
    },
    addedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addedText: {
        fontSize: 14,
        color: '#34C759',
        fontWeight: '500',
    },
    removeButton: {
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchLoading: {
        marginTop: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
    },
});