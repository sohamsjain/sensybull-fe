// app/components/ArticleCard.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Article } from '../types';
import { formatTimestampDetailed } from '../utils/format';
import { getTickerLogoUrl } from '../utils/images';

const { width, height } = Dimensions.get('window');

interface ArticleCardProps {
  article: Article;
  isFollowingTopic: boolean;
  isSummaryExpanded: boolean;
  sharingArticleId: string | null;
  onBack: () => void;
  onShare: (article: Article) => void;
  onToggleFollow: (topicId: string) => void;
  onOpenArticle: (url: string) => void;
  onToggleSummary: (articleId: string) => void;
  onNavigateToStock: (symbol: string) => void;
  shareCardRef: (ref: View | null) => void;
}

export default function ArticleCard({
  article,
  isFollowingTopic,
  isSummaryExpanded,
  sharingArticleId,
  onBack,
  onShare,
  onToggleFollow,
  onOpenArticle,
  onToggleSummary,
  onNavigateToStock,
  shareCardRef,
}: ArticleCardProps) {
  const router = useRouter();

  if (!article) return null;

  const primaryTopic = article.topics?.[0];

  const renderShareCard = () => {
    return (
      <View
        ref={shareCardRef}
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
              const cleanBullet = bullet.replace(/["\u201C\u201D]/g, '');
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
            {formatTimestampDetailed(article.timestamp)}
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
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color="#333" />
          </TouchableOpacity>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {/* Bookmark */}}
              accessibilityLabel="Bookmark article"
              accessibilityRole="button"
            >
              <Ionicons name="bookmark-outline" size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onShare(article)}
              accessibilityLabel="Share article"
              accessibilityRole="button"
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
                onPress={() => onToggleFollow(primaryTopic.id)}
                accessibilityLabel={isFollowingTopic ? `Unfollow ${primaryTopic.name}` : `Follow ${primaryTopic.name}`}
                accessibilityRole="button"
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
          <Text style={styles.title} accessibilityRole="header">{article.title}</Text>

          {/* Bullet Points */}
          {article.bullets && article.bullets.length > 0 && (
            <View style={styles.bulletsContainer}>
              {article.bullets.slice(0, 3).map((bullet, index) => {
                const cleanBullet = bullet.replace(/["\u201C\u201D]/g, '');
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
              {formatTimestampDetailed(article.timestamp)}
            </Text>
            <Text style={styles.metaDivider}>|</Text>
            <TouchableOpacity
              style={styles.providerLink}
              onPress={() => onOpenArticle(article.provider_url)}
              accessibilityLabel={`Open article from ${article.provider}`}
              accessibilityRole="link"
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
                    onPress={() => onNavigateToStock(ticker.symbol)}
                    activeOpacity={0.7}
                    accessibilityLabel={`View stock ${ticker.symbol} - ${ticker.name}`}
                    accessibilityRole="button"
                  >
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
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.tickersSection}>
                {article.tickers.map((ticker, index) => (
                  <TouchableOpacity
                    key={`${article.id}-ticker-${ticker.symbol}-${index}`}
                    style={styles.tickerCard}
                    onPress={() => onNavigateToStock(ticker.symbol)}
                    activeOpacity={0.7}
                    accessibilityLabel={`View stock ${ticker.symbol} - ${ticker.name}`}
                    accessibilityRole="button"
                  >
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
            onPress={() => onToggleSummary(article.id)}
            activeOpacity={0.7}
            accessibilityLabel={isSummaryExpanded ? 'Collapse summary' : 'Expand summary'}
            accessibilityRole="button"
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
            onPress={() => onToggleSummary(article.id)}
            accessibilityLabel="Close expanded summary"
            accessibilityRole="button"
          />
          <View style={styles.summaryOverlayContent}>
            <TouchableOpacity
              style={styles.summaryOverlayHandle}
              onPress={() => onToggleSummary(article.id)}
              activeOpacity={0.7}
              accessibilityLabel="Close summary"
              accessibilityRole="button"
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
          {renderShareCard()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
