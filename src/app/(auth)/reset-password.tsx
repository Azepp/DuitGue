import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';

export default function ResetPasswordScreen() {
  return (
    <PageLayout center>
      <ThemedText type="title">Buat Password Baru</ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={{ marginTop: 8 }}>
        Password lama udah basi, ganti aje
      </ThemedText>
    </PageLayout>
  );
}
