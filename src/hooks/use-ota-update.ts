import { useUpdates, reloadAsync } from "expo-updates";

export function useOTAUpdate() {
  const { isUpdatePending, isDownloading, isChecking } = useUpdates();

  async function applyUpdate() {
    await reloadAsync();
  }

  return { isUpdatePending, isDownloading, isChecking, applyUpdate };
}
