import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';

export default function ForgotPasswordScreen() {
  return (
    <PageLayout center>
      <ThemedText type="title">Lupa Password</ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={{ marginTop: 8 }}>
        Masukin email lu, kita kirim link reset
      </ThemedText>
    </PageLayout>
  );
}
