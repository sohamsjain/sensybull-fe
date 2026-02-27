// app/index.tsx
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './contexts/AuthContext';
import { colors } from './theme';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
