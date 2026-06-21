import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';

export default function GrafikScreen() {
  return (
    <PageLayout>
      <ThemedText type="title">Grafik</ThemedText>
      <ThemedText type="default" themeColor="textSecondary" style={{ marginTop: 8 }}>
        Visualisasi pemasukan dan pengeluaran
      </ThemedText>
    </PageLayout>
  );
}
