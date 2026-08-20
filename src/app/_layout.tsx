import { OTAUpdateBanner } from "@/components/ui/ota-update-banner";
import { OTAUpdateModal } from "@/components/ui/ota-update-modal";
import { ToastProvider } from "@/components/ui/toast";
import { UpdateModal } from "@/components/ui/update-modal";
import { useOTAUpdate } from "@/hooks/use-ota-update";
import { queryClient } from "@/lib/query-client";
import { checkForUpdate, type UpdateInfo } from "@/lib/update-checker";
import { useAuthStore } from "@/stores/auth-store";
import { initOnlineManager } from "@/lib/offline";
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts } from "@expo-google-fonts/space-grotesk";
import { QueryClientProvider } from "@tanstack/react-query";
import Constants from "expo-constants";
import { NavigationBar } from "expo-navigation-bar";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

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
  const { isUpdatePending, isDownloading, applyUpdate } = useOTAUpdate();
  const [otaDismissed, setOtaDismissed] = useState(false);

  const showOtaModal = isUpdatePending && !isDownloading && !otaDismissed;

  useEffect(() => {
    initialize();
    initOnlineManager();
  }, []);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setStyle("light");
    }
  }, []);

  useEffect(() => {
    if ((loaded || error) && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, isLoading]);

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version || "1.0.0";
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
          <OTAUpdateBanner visible={isUpdatePending} isDownloading={isDownloading} onApply={applyUpdate} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="logout" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ToastProvider>
        <UpdateModal visible={!!updateInfo} latestVersion={updateInfo?.latestVersion ?? ""} downloadUrl={updateInfo?.downloadUrl ?? ""} releaseNotes={updateInfo?.releaseNotes ?? ""} isForceUpdate={updateInfo?.isForceUpdate ?? false} onClose={() => setUpdateInfo(null)} />
        <OTAUpdateModal visible={showOtaModal} isDownloading={isDownloading} onApply={applyUpdate} onClose={() => setOtaDismissed(true)} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
