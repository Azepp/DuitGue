import { Stack, Redirect } from 'expo-router';
import { View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export default function AppLayout() {
  const session = useAuthStore((s) => s.session);

  if (!session) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-transaction"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="detail-profile" />
        <Stack.Screen name="category-settings" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/change-email" />
        <Stack.Screen name="search" />
      </Stack>
    </View>
  );
}
