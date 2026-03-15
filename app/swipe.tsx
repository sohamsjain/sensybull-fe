// app/swipe.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
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
import { captureRef } from 'react-native-view-shot';
import api from './services/api';

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
  const [sharingArticleId, setSharingArticleId] = useState<string | null>(null);
  const router = useRouter();

  const flatListRef = useRef<FlatList>(null);
  const shareCardRefs = useRef<{ [key: string]: View | null }>({});

  const loadArticles = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setFetchingMore(true);
      }

      let response;

      if (topicId && topicId !== 'for-you') {
        response = await api.getTopicArticles(topicId as string, pageNum, 20);
      } else {
        response = await api.getArticles({
          page: pageNum,
          per_page: 20,
        });
      }

      if (pageNum === 1) {
        let finalArticles = response.articles;
        let targetIndex = -1;

        if (articleId) {
          targetIndex = finalArticles.findIndex((a: Article) => a.id === articleId);

          if (targetIndex === -1) {
            try {
              const singleArticle = await api.getArticle(articleId as string);
              finalArticles = [singleArticle, ...finalArticles];
              targetIndex = 0;
            } catch (err) {
              console.error('Failed to fetch target article:', err);
            }
          }
        }

        setArticles(finalArticles);

        if (targetIndex !== -1) {
          setCurrentIndex(targetIndex);
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
          }, 100);
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

  const handleShare = async (article: Article) => {
    try {
      setSharingArticleId(article.id);

      // Wait for the share card to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const ref = shareCardRefs.current[article.id];
      if (!ref) {
        Alert.alert('Error', 'Could not capture share image');
        setSharingArticleId(null);
        return;
      }

      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: article.title,
        });
      } else {
        Alert.alert('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing article:', error);
      Alert.alert('Error', 'Failed to share article');
    } finally {
      setSharingArticleId(null);
    }
  };

  const handleSendQuestion = () => {
    if (!question.trim()) return;

    const currentArticle = articles[currentIndex];
    if (!currentArticle) {
      Alert.alert('Error', 'No article selected');
      return;
    }

    const articleContext = {
      title: currentArticle.title,
      summary: currentArticle.summary,
      bullets: currentArticle.bullets || [],
      tickers: currentArticle.tickers || [],
    };

    router.push({
      pathname: '/chat',
      params: {
        question: question.trim(),
        context: JSON.stringify(articleContext),
      },
    });

    setQuestion('');
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

  const renderShareCard = (article: Article) => {
    const primaryTopic = article.topics?.[0];

    return (
      <View
        ref={(ref) => { shareCardRefs.current[article.id] = ref; }}
        style={styles.shareCard}
        collapsable={false}
      >
        {/* Topic */}
        {primaryTopic && (
          <View style={styles.shareTopicPill}>
            <Text style={styles.shareTopicText}>{primaryTopic.name}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.shareTitle}>{article.title}</Text>

        {/* Bullets */}
        {article.bullets && article.bullets.length > 0 && (
          <View style={styles.shareBulletsContainer}>
            {article.bullets.map((bullet, index) => {
              const cleanBullet = bullet.replace(/["""]/g, '');
              return (
                <View key={`share-bullet-${index}`} style={styles.shareBulletItem}>
                  <View style={styles.shareBulletDot} />
                  <Text style={styles.shareBulletText}>{cleanBullet}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Meta */}
        <View style={styles.shareMeta}>
          <Text style={styles.shareMetaText}>
            {formatTimestamp(article.timestamp)}
          </Text>
          <Text style={styles.shareMetaDivider}> | </Text>
          <Ionicons name="link-outline" size={12} color="#666" />
          <Text style={styles.shareMetaText}> {article.provider}</Text>
        </View>

        {/* Branding Footer */}
        <View style={styles.shareBrandingFooter}>
          <View style={styles.shareBrandingDivider} />
          <Text style={styles.shareBrandingText}>Powered by Sensybull</Text>
        </View>
      </View>
    );
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
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#333" />
            </TouchableOpacity>

            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => console.log('Bookmark', article.id)}
              >
                <Ionicons name="bookmark-outline" size={20} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleShare(article)}
              >
                <Ionicons name="share-outline" size={20} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            {/* Topic + Follow */}
            {primaryTopic && (
              <View style={styles.topicRow}>
                <View style={styles.topicPill}>
                  <Text style={styles.topicPillText}>{primaryTopic.name}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowingTopic && styles.followButtonActive,
                  ]}
                  onPress={() => handleToggleFollowTopic(primaryTopic.id)}
                >
                  <Text style={[
                    styles.followButtonText,
                    isFollowingTopic && styles.followButtonTextActive,
                  ]}>
                    {isFollowingTopic ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Title */}
            <Text style={styles.title}>{article.title}</Text>

            {/* Bullet Points */}
            {article.bullets && article.bullets.length > 0 && (
              <View style={styles.bulletsContainer}>
                {article.bullets.slice(0, 3).map((bullet, index) => {
                  const cleanBullet = bullet.replace(/["""]/g, '');
                  return (
                    <View key={`${article.id}-bullet-${index}`} style={styles.bulletItem}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.bulletText}>{cleanBullet}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Time and Provider */}
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color="#999" />
              <Text style={styles.metaTime}>
                {formatTimestamp(article.timestamp)}
              </Text>
              <Text style={styles.metaDivider}>|</Text>
              <TouchableOpacity
                style={styles.providerLink}
                onPress={() => handleOpenArticle(article.provider_url)}
              >
                <Ionicons name="link-outline" size={14} color="#007AFF" />
                <Text style={styles.providerText}>{article.provider}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tickers */}
          {article.tickers && article.tickers.length > 0 && (
            <View style={styles.tickersWrapper}>
              {article.tickers.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tickersScrollContainer}
                >
                  {article.tickers.map((ticker, index) => (
                    <TouchableOpacity
                      key={`${article.id}-ticker-${ticker.symbol}-${index}`}
                      style={styles.tickerCardSmall}
                      onPress={() => router.push({
                        pathname: '/stock/[symbol]',
                        params: { symbol: ticker.symbol }
                      })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.tickerLogoContainer}>
                        <Image
                          source={{ uri: getTickerLogoUrl(ticker.symbol) }}
                          style={styles.tickerLogo}
                          resizeMode="contain"
                          defaultSource={require('../assets/images/icon.png')}
                        />
                      </View>
                      <View style={styles.tickerInfo}>
                        <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                        <Text style={styles.tickerName} numberOfLines={1}>
                          {ticker.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.tickersSection}>
                  {article.tickers.map((ticker, index) => (
                    <TouchableOpacity
                      key={`${article.id}-ticker-${ticker.symbol}-${index}`}
                      style={styles.tickerCard}
                      onPress={() => router.push({
                        pathname: '/stock/[symbol]',
                        params: { symbol: ticker.symbol }
                      })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.tickerLogoContainer}>
                        <Image
                          source={{ uri: getTickerLogoUrl(ticker.symbol) }}
                          style={styles.tickerLogo}
                          resizeMode="contain"
                          defaultSource={require('../assets/images/icon.png')}
                        />
                      </View>
                      <View style={styles.tickerInfo}>
                        <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                        <Text style={styles.tickerName} numberOfLines={1}>
                          {ticker.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
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
        </ScrollView>

        {/* Expanded Summary Overlay */}
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
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.summaryOverlayText}>{article.summary}</Text>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Off-screen share card for screenshot */}
        {sharingArticleId === article.id && (
          <View style={styles.shareCardContainer}>
            {renderShareCard(article)}
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
          getItemLayout={(data, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 500);
          }}
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
    backgroundColor: '#fff',
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

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content Section
  contentSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },

  // Topic + Follow
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  topicPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  topicPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  followButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  followButtonTextActive: {
    color: '#4F46E5',
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 30,
    marginBottom: 16,
  },

  // Bullets
  bulletsContainer: {
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
    marginRight: 12,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  metaTime: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  metaDivider: {
    fontSize: 13,
    color: '#D1D5DB',
    marginHorizontal: 8,
  },
  providerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Tickers
  tickersWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
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

  // Summary
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
  },
  moreText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },

  // No More Cards
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

  // Input Container
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
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

  // Summary Overlay
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

  // Share Card (off-screen for screenshot capture)
  shareCardContainer: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
  shareCard: {
    width: width - 40,
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shareTopicPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    marginBottom: 14,
  },
  shareTopicText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  shareTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 14,
  },
  shareBulletsContainer: {
    marginBottom: 14,
  },
  shareBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  shareBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
    marginRight: 10,
    marginTop: 6,
  },
  shareBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  shareMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shareMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  shareMetaDivider: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  shareBrandingFooter: {
    alignItems: 'center',
  },
  shareBrandingDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  shareBrandingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
});
