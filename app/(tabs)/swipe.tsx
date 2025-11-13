// app/(tabs)/swipe.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

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
  const { articleId, topicId, articleIds } = params;

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
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setFetchingMore(true);
      }

      let response;

      // If we have a topicId from params, load that topic's articles
      if (topicId && topicId !== 'for-you' && pageNum === 1) {
        response = await api.getTopicArticles(topicId as string, pageNum, 20);
      } else {
        // Default: load all articles
        response = await api.getArticles({
          page: pageNum,
          per_page: 20,
        });
      }

      if (pageNum === 1) {
        setArticles(response.articles);

        // If we have a specific articleId, find its index and scroll to it
        if (articleId) {
          const index = response.articles.findIndex((a: Article) => a.id === articleId);
          if (index !== -1) {
            setCurrentIndex(index);
            // Use setTimeout to ensure FlatList is mounted
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
      const topicIds = new Set<string>(
        response.topics.map((t: { id: string; name: string }) => t.id)
      );
      setFollowedTopics(topicIds);
    } catch (error) {
      console.error('Error loading followed topics:', error);
    }
  };

  // Get ticker logo URL
  const getTickerLogoUrl = (symbol: string): string => {
    return `https://img.logo.dev/ticker/${symbol}?token=pk_NquCcOJqSl2ZVNwLRKmfjw&format=png&theme=light&retina=true`;
  };

  const handleToggleFollowTopic = async (topicId: string) => {
    try {
      if (followedTopics.has(topicId)) {
        await api.unfollowTopic(topicId);
        setFollowedTopics(prev => {
          const next = new Set(prev);
          next.delete(topicId);
          return next;
        });
      } else {
        await api.followTopic(topicId);
        setFollowedTopics(prev => new Set(prev).add(topicId));
      }
    } catch (error) {
      console.error('Error toggling topic follow:', error);
    }
  };

  const handleOpenArticle = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open article');
    });
  };

  const handleSendQuestion = () => {
    if (question.trim()) {
      // TODO: Implement question handling logic
      console.log('Question sent:', question);
      Alert.alert('Question Sent', `You asked: ${question}`);
      setQuestion('');
    }
  };

  const toggleSummaryExpanded = (articleId: string) => {
    setExpandedSummaryId(prev => prev === articleId ? null : articleId);
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

  const renderCard = ({ item: article }: { item: Article }) => {
    if (!article) return null;

    const primaryTopic = article.topics?.[0];
    const isFollowingTopic = primaryTopic ? followedTopics.has(primaryTopic.id) : false;
    const isSummaryExpanded = expandedSummaryId === article.id;

    return (
      <View style={styles.card}>
        <ScrollView
          style={styles.cardScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={!isSummaryExpanded}
        >
          {/* Hero Section with Image and Gradient Overlay */}
          <View style={styles.heroSection}>
            {/* Image Container - Top Aligned */}
            <View style={styles.imageContainer}>
              {article.image_url ? (
                <>
                  {/* Blurred background layer - covers entire space */}
                  <Image
                    source={{ uri: article.image_url }}
                    style={styles.heroImageBackground}
                    resizeMode="cover"
                    blurRadius={20}
                  />
                  {/* Main image layer - fits without cropping */}
                  <Image
                    source={{ uri: article.image_url }}
                    style={styles.heroImageMain}
                    resizeMode="cover"
                  />
                </>
              ) : (
                <View style={styles.placeholderHero}>
                  <Ionicons name="newspaper-outline" size={80} color="rgba(255,255,255,0.3)" />
                </View>
              )}
            </View>

            {/* Linear Gradient Overlay - Black fading shades */}
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.1)', // light fade near top
                'rgba(0,0,0,0.5)',
                'rgba(0,0,0,0.9)',
                '#000000',         // strong coverage at bottom
              ]}
              locations={[0, 0.3, 0.4, 1]}
              style={styles.gradientOverlay}
            />

            {/* Floating Action Buttons - Fixed Bottom Right */}
            <View style={styles.floatingActionButtons}>
              <TouchableOpacity
                style={styles.floatingActionButton}
                onPress={() => console.log('Bookmark', article.id)}
              >
                <Ionicons name="bookmark-outline" size={18} color="#000" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.floatingActionButton}
                onPress={() => handleOpenArticle(article.provider_url)}
              >
                <Ionicons name="share-outline" size={18} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Content over the image */}
            <View style={styles.heroContent}>
              {/* Topic and Follow Button - Full Width */}
              {primaryTopic && (
                <View style={styles.topicRow}>
                  <Text style={styles.topicName}>{primaryTopic.name}</Text>
                  <TouchableOpacity
                    style={styles.followButton}
                    onPress={() => handleToggleFollowTopic(primaryTopic.id)}
                  >
                    <Text style={styles.followButtonText}>
                      {isFollowingTopic ? 'Following ✓' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Title - Full Width */}
              <Text style={styles.heroTitle}>{article.title}</Text>

              {/* Bullet Points - Full Width */}
              {article.bullets && article.bullets.length > 0 && (
                <View style={styles.heroBulletsContainer}>
                  {article.bullets.slice(0, 2).map((bullet, index) => (
                    <Text key={`${article.id}-bullet-${index}`} style={styles.heroBulletText}>
                      • {bullet}
                    </Text>
                  ))}
                </View>
              )}


              {/* Time and Source - Full Width */}
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {formatTimestamp(article.timestamp)}
                </Text>
                <Text style={styles.metaDivider}> | </Text>
                <Text style={styles.metaText}>{article.provider}</Text>
              </View>
            </View>
          </View>

          {/* White Section - Tickers and Summary */}
          <View style={styles.whiteSection}>
            {/* Tickers */}
            {article.tickers && article.tickers.length > 0 && (
              article.tickers.length > 1 ? (
                // Horizontal scroll for multiple tickers
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tickersScrollContainer}
                >
                  {article.tickers.map((ticker, index) => (
                    <View key={`${article.id}-ticker-${ticker.symbol}-${index}`} style={styles.tickerCardSmall}>
                      <View style={styles.tickerLogoContainer}>
                        <Image
                          source={{ uri: getTickerLogoUrl(ticker.symbol) }}
                          style={styles.tickerLogo}
                          resizeMode="contain"
                          defaultSource={require('../../assets/images/icon.png')}
                        />
                      </View>
                      <View style={styles.tickerInfo}>
                        <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                        <Text style={styles.tickerName} numberOfLines={1}>
                          {ticker.name}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                // Single ticker (normal layout)
                <View style={styles.tickersSection}>
                  {article.tickers.map((ticker, index) => (
                    <View key={`${article.id}-ticker-${ticker.symbol}-${index}`} style={styles.tickerCard}>
                      <View style={styles.tickerLogoContainer}>
                        <Image
                          source={{ uri: getTickerLogoUrl(ticker.symbol) }}
                          style={styles.tickerLogo}
                          resizeMode="contain"
                          defaultSource={require('../../assets/images/icon.png')}
                        />
                      </View>
                      <View style={styles.tickerInfo}>
                        <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                        <Text style={styles.tickerName} numberOfLines={1}>
                          {ticker.name}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )
            )}


            {/* Summary */}
            {article.summary && (
              <TouchableOpacity
                style={styles.summarySection}
                onPress={() => toggleSummaryExpanded(article.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.summaryText} numberOfLines={isSummaryExpanded ? undefined : article.tickers.length > 0 ? 3 : 7}>
                  {article.summary}
                  {!isSummaryExpanded && article.summary.length > 150 && (
                    <Text style={styles.moreText}> more...</Text>
                  )}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Expanded Summary Overlay - Instagram Reels Style */}
        {isSummaryExpanded && (
          <View style={styles.summaryOverlay}>
            <TouchableOpacity
              style={styles.summaryOverlayBackground}
              activeOpacity={1}
              onPress={() => setExpandedSummaryId(null)}
            />
            <View style={styles.summaryOverlayContent}>
              <TouchableOpacity
                style={styles.summaryOverlayHandle}
                onPress={() => setExpandedSummaryId(null)}
                activeOpacity={0.7}
              >
                <View style={styles.summaryOverlayHandleLine} />
              </TouchableOpacity>
              <ScrollView
                style={styles.summaryScrollView}
                contentContainerStyle={styles.summaryScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true} // ✅
                keyboardShouldPersistTaps="handled" // ✅
              >
                <Text style={styles.summaryOverlayText}>{article.summary}</Text>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderNoMoreCards = () => {
    return (
      <View style={[styles.card, styles.noMoreCards]}>
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

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
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
            if (!fetchingMore && articles.length >= 20) {
              loadArticles(page + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          ListFooterComponent={
            fetchingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : null
          }
        />

        {/* Fixed Input Box at Bottom */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="sparkles" size={20} color="#007AFF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Ask Sensybull"
              placeholderTextColor="#999"
              value={question}
              onChangeText={setQuestion}
              returnKeyType="send"
              onSubmitEditing={handleSendQuestion}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, !question.trim() && styles.sendButtonDisabled]}
              onPress={handleSendQuestion}
              disabled={!question.trim()}
            >
              <Ionicons name="send" size={20} color={question.trim() ? '#007AFF' : '#ccc'} />
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
    backgroundColor: '#000',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    height: height,
    width: width,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardScroll: {
    flex: 1,
  },

  // Hero Section - Dynamic height
  heroSection: {
    minHeight: 500,
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },

  // Image Container - Top aligned
  imageContainer: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  heroImageBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
  },
  heroImageMain: {
    position: 'absolute',
    width: '100%',
    top: 0,
    height: 280,
  },
  placeholderHero: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Gradient overlay - starts earlier and stays solid longer
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Floating Action Buttons
  floatingActionButtons: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 10,
    gap: 12,
  },
  floatingActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingRight: 90,
    paddingBottom: 24,
  },

  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  topicName: {
    fontSize: 12,
    fontWeight: '400',
    color: '#fff',
    marginRight: 12,
  },
  followButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  followButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 30,
    marginBottom: 14,
  },

  heroBulletsContainer: {
    marginBottom: 14,
  },
  heroBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  heroBulletDot: {
    fontSize: 10,
    color: '#fff',
    marginRight: 10,
    marginTop: 2,
  },
  heroBulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#fff',
    marginBottom: 8,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metaDivider: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },

  whiteSection: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 30,
  },
  tickersSection: {
    marginBottom: 10,
  },
  tickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  tickerLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tickerLogo: {
    width: 36,
    height: 36,
  },
  tickerInfo: {
    flex: 1,
  },
  tickerSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  tickerName: {
    fontSize: 13,
    color: '#666',
  },

  tickersScrollContainer: {
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
  },

  tickerCardSmall: {
    width: 160,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
  },

  summarySection: {
    marginBottom: 24,
    marginHorizontal: 10,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  moreText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  readArticleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    gap: 8,
  },
  readArticleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },

  noMoreCards: {
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
  loadingMore: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Fixed Input Container at Bottom
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  sendButton: {
    marginLeft: 8,
    padding: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Summary Overlay - Instagram Reels Style
  summaryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  summaryOverlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  summaryOverlayContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    overflow: 'hidden',
  },
  summaryOverlayHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryOverlayHandleLine: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  summaryScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  summaryScrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 10,
  },
  summaryOverlayText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});