import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';

export default function LaporanScreen() {
  return (
    <PageLayout>
      <ThemedText type="title">Laporan</ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={{ marginTop: 8 }}>
        Ringkasan keuangan bulanan
      </ThemedText>
    </PageLayout>
  );
}
