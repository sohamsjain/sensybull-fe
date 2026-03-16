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
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import ArticleCard from './components/ArticleCard';
import NoMoreCards from './components/NoMoreCards';
import api from './services/api';
import { Article } from './types';
import { getErrorMessage } from './utils/errors';
import { logger } from './utils/logger';

const { width, height } = Dimensions.get('window');

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
            } catch (err: unknown) {
              logger.error('Failed to fetch target article:', err);
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
    } catch (error: unknown) {
      logger.error('Error loading articles:', error);
      Alert.alert('Error', getErrorMessage(error));
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
    } catch (error: unknown) {
      logger.error('Error loading followed topics:', error);
    }
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
    } catch (error: unknown) {
      logger.error('Error toggling topic follow:', error);
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
    } catch (error: unknown) {
      logger.error('Error sharing article:', error);
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

  const handleNavigateToStock = (symbol: string) => {
    router.push({
      pathname: '/stock/[symbol]',
      params: { symbol },
    });
  };

  const renderCard = ({ item: article }: { item: Article }) => {
    if (!article) return null;

    const primaryTopic = article.topics?.[0];
    const isFollowingTopic = primaryTopic ? followedTopics.has(primaryTopic.id) : false;
    const isSummaryExpanded = expandedSummaryId === article.id;

    return (
      <ArticleCard
        article={article}
        isFollowingTopic={isFollowingTopic}
        isSummaryExpanded={isSummaryExpanded}
        sharingArticleId={sharingArticleId}
        onBack={() => router.back()}
        onShare={handleShare}
        onToggleFollow={handleToggleFollowTopic}
        onOpenArticle={handleOpenArticle}
        onToggleSummary={toggleSummaryExpanded}
        onNavigateToStock={handleNavigateToStock}
        shareCardRef={(ref) => { shareCardRefs.current[article.id] = ref; }}
      />
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
              accessibilityLabel="Ask a question about this article"
              accessibilityHint="Type a question and press send"
            />
            <TouchableOpacity
              style={[styles.sendButton, !question.trim() && styles.sendButtonDisabled]}
              onPress={handleSendQuestion}
              disabled={!question.trim()}
              accessibilityLabel="Send question"
              accessibilityRole="button"
              accessibilityState={{ disabled: !question.trim() }}
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
  loadingMore: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
