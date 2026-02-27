// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          paddingBottom: 2,
          height: 50,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper-outline" size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{
          tabBarLabel: 'Feed',
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          tabBarLabel: 'Markets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
