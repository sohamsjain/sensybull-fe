// app/components/NoMoreCards.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface NoMoreCardsProps {
  onRefresh: () => void;
}

export default function NoMoreCards({ onRefresh }: NoMoreCardsProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="checkmark-circle" size={80} color="#34c759" />
      <Text style={styles.text}>You're all caught up!</Text>
      <Text style={styles.subtext}>
        Check back later for new articles
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
        accessibilityLabel="Refresh articles"
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={24} color="#fff" />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: height,
    width: width,
    backgroundColor: '#fff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  subtext: {
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
});
