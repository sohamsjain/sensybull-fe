// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { colors } from './theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.bg },
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.textPrimary,
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="article/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="chat"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="stock/[symbol]"
              options={{ headerShown: false }}
            />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
