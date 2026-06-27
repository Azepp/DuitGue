import { Stack, DefaultTheme, ThemeProvider } from 'expo-router';
import {
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { queryClient } from '@/lib/query-client';
import { ToastProvider } from '@/components/ui/toast';
import { checkForUpdate, type UpdateInfo } from '@/lib/update-checker';
import { UpdateModal } from '@/components/ui/update-modal';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setStyle('dark');
    }
  }, []);

  useEffect(() => {
    if ((loaded || error) && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, isLoading]);

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    checkForUpdate(currentVersion).then((info) => {
      if (info?.hasUpdate) setUpdateInfo(info);
    });
  }, []);

  if ((!loaded && !error) || isLoading) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DefaultTheme}>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="logout" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ToastProvider>
        <UpdateModal
          visible={!!updateInfo}
          latestVersion={updateInfo?.latestVersion ?? ''}
          downloadUrl={updateInfo?.downloadUrl ?? ''}
          releaseNotes={updateInfo?.releaseNotes ?? ''}
          onClose={() => setUpdateInfo(null)}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
