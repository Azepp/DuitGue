import { ThemedText } from '@/components/themed-text';
import { NeoButton } from '@/components/ui/neo-button';
import { PageLayout } from '@/components/ui/page-layout';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

export default function GueScreen() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <PageLayout>
      <View style={styles.inner}>
        <View>
          <ThemedText type="title">Gue</ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={{ marginTop: 8 }}>
            Profil, pengaturan, dan keamanan akun
          </ThemedText>
        </View>

        <View style={styles.spacer} />

        <NeoButton
          title={loading ? "Tunggu..." : "Keluar"}
          variant="danger"
          onPress={handleLogout}
          disabled={loading}
        />
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  spacer: {
    flex: 1,
  },
});
