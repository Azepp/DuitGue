import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';
import { supabase } from '@/lib/supabase';
import { signOutGoogle } from '@/lib/google-signin';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast';
import { Colors } from '@/constants/theme';

const SHADOW_OFFSET = 3;

export default function GueScreen() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const session = useAuthStore((s) => s.session);
  const user = session?.user;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();
      return data as { display_name: string; avatar_url: string | null } | null;
    },
    enabled: !!userId,
  });

  const displayName =
    profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'UserDuit';
  const email = user?.email || '';

  const handleLogout = async () => {
    setLoading(true);
    await Promise.all([supabase.auth.signOut(), signOutGoogle()]);
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    showToast('Sedang diunduh...', 'success');

    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      const rows = transactions ?? [];
      const header = 'Tanggal,Tipe,Kategori,Note,Jumlah';
      const csvRows = rows.map((t: any) => {
        const date = t.date ?? '';
        const type = t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
        const catName = t.categories?.name ?? '-';
        const note = t.note ? `"${t.note.replace(/"/g, '""')}"` : '';
        const amount = t.type === 'pemasukan' ? t.amount : -t.amount;
        return `${date},${type},${catName},${note},${amount}`;
      });

      const csv = `\uFEFF${header}\n${csvRows.join('\n')}`;
      const fileUri = FileSystem.cacheDirectory + `duitgue-export-${Date.now()}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Data DuitGue',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        showToast('File udah tersimpan di cache', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal export data', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = () => {
    queryClient.clear();
    showToast('Cache berhasil dibersihkan', 'success');
  };

  return (
    <PageLayout>
      <View style={styles.inner}>
        <Pressable onPress={() => router.push('/profile/edit')} style={styles.profileOuter}>
          <View style={styles.profileShadow} pointerEvents="none" />
          <View style={styles.profile}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatarShadow} pointerEvents="none" />
              <View style={styles.avatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <MaterialCommunityIcons name="account" size={36} color={Colors.black} />
                )}
              </View>
            </View>
            <View style={styles.info}>
              <ThemedText style={styles.name}>{displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {email}
              </ThemedText>
            </View>
          </View>
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.menu}>
          <View style={styles.menuOuter}>
            <View style={styles.menuShadow} pointerEvents="none" />
            <Pressable style={styles.menuItem} onPress={handleExport} disabled={exporting}>
              <MaterialCommunityIcons name="export-variant" size={22} color={Colors.black} />
              <ThemedText style={styles.menuText}>
                {exporting ? 'Mengunduh...' : 'Export Data'}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.menuOuter}>
            <View style={styles.menuShadow} pointerEvents="none" />
            <Pressable style={styles.menuItem} onPress={handleClearCache}>
              <MaterialCommunityIcons name="delete-outline" size={22} color={Colors.black} />
              <ThemedText style={styles.menuText}>Hapus Cache</ThemedText>
            </Pressable>
          </View>

          <View style={styles.logoutOuter}>
            <View style={styles.logoutShadow} pointerEvents="none" />
            <Pressable
              style={styles.logoutBtn}
              onPress={handleLogout}
              disabled={loading}
            >
              <MaterialCommunityIcons name="logout" size={20} color={Colors.white} />
              <ThemedText style={styles.logoutText}>
                {loading ? 'Tunggu...' : 'Keluar'}
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.spacer} />
      </View>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingBottom: 32,
  },
  profileOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
    marginBottom: 28,
  },
  profileShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  avatarOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  avatarShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 28,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.black,
    marginBottom: 24,
  },
  menu: {
    gap: 12,
  },
  menuOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  menuShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  logoutOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
    marginTop: 4,
  },
  logoutShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.danger,
  },
  menuText: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 24,
    color: Colors.white,
  },
  spacer: {
    flex: 1,
  },
});
