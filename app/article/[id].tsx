// app/article/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

interface ArticleDetail {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  provider: string;
  timestamp: number;
  tickers: Array<{ symbol: string; name: string }>;
}

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    try {
      const response = await api.getArticle(id as string);
      setArticle(response.article);
    } catch (error) {
      console.error('Error loading article:', error);
      Alert.alert('Error', 'Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOpenURL = async () => {
    if (article?.url) {
      const canOpen = await Linking.canOpenURL(article.url);
      if (canOpen) {
        await Linking.openURL(article.url);
      } else {
        Alert.alert('Error', 'Cannot open URL');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Article not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: article.provider,
          headerRight: () => (
            <TouchableOpacity onPress={handleOpenURL}>
              <Ionicons name="open-outline" size={22} color="#007AFF" />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{article.title}</Text>
          
          <View style={styles.metaContainer}>
            <Text style={styles.provider}>{article.provider}</Text>
            <Text style={styles.date}>{formatDate(article.timestamp)}</Text>
          </View>

          {article.tickers.length > 0 && (
            <View style={styles.tickersContainer}>
              {article.tickers.map((ticker, index) => (
                <View key={index} style={styles.tickerBadge}>
                  <Text style={styles.tickerSymbol}>{ticker.symbol}</Text>
                  <Text style={styles.tickerName}>{ticker.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          {article.summary && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryLabel}>Summary</Text>
              <Text style={styles.summary}>{article.summary}</Text>
            </View>
          )}

          {article.content ? (
            <Text style={styles.content}>{article.content}</Text>
          ) : (
            <View style={styles.noContentContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.noContentText}>
                Full content not available in app
              </Text>
              <TouchableOpacity style={styles.readButton} onPress={handleOpenURL}>
                <Text style={styles.readButtonText}>Read on {article.provider}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.sourceButton} onPress={handleOpenURL}>
          <Ionicons name="globe-outline" size={20} color="#007AFF" />
          <Text style={styles.sourceButtonText}>View Original Article</Text>
          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    lineHeight: 32,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  provider: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  tickersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tickerBadge: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d0e8ff',
  },
  tickerSymbol: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  tickerName: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  summary: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  content: {
    fontSize: 16,
    color: '#333',
    lineHeight: 26,
  },
  noContentContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noContentText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    marginBottom: 20,
  },
  readButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  readButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0e8ff',
  },
  sourceButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 10,
  },
});