import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';

export default function DetailProfileScreen() {
  const insets = useSafeAreaInsets();

  return (
    <PageLayout style={{ paddingBottom: insets.bottom + 16 }}>
      <ThemedText type="title">Detail Profil</ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={{ marginTop: 8 }}>
        Ganti email, hapus akun, dan lainnya
      </ThemedText>
    </PageLayout>
  );
}
