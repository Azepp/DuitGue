import { useState } from 'react';
import { Pressable, StyleSheet, View, Modal, TextInput, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';
import { useToast } from '@/components/ui/toast';
import { BugReportModal } from '@/components/ui/bug-report-modal';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { signOutGoogle } from '@/lib/google-signin';
import { mmkv } from '@/lib/mmkv';
import { NeoInput } from '@/components/ui/neo-input';
import { NeoButton } from '@/components/ui/neo-button';
import { Colors, Fonts } from '@/constants/theme';

const SHADOW_OFFSET = 3;

export default function GueScreen() {
  const session = useAuthStore((s) => s.session);
  const user = session?.user;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const accounts = useAuthStore((s) => s.accounts);
  const setSession = useAuthStore((s) => s.setSession);
  const addAccount = useAuthStore((s) => s.addAccount);
  const removeAccount = useAuthStore((s) => s.removeAccount);
  const switchAccount = useAuthStore((s) => s.switchAccount);

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

  const [modalVisible, setModalVisible] = useState(false);
  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await signOutGoogle();
    mmkv.remove('cached_balance');
    router.replace('/login');
  };

  const openAccountModal = () => {
    setModalVisible(true);
    setPassword('');
    setSelectedAccount(null);
  };

  const closeAccountModal = () => {
    setModalVisible(false);
    setPassword('');
    setSelectedAccount(null);
  };

  const handleSwitchAccount = async () => {
    if (!password || !selectedAccount) {
      showToast('Pilih akun dan masukin password', 'error');
      return;
    }
    closeAccountModal();
    await switchAccount(selectedAccount, password);
  };

  const handleAddAccount = async () => {
    if (!newAccountEmail.trim() || !newAccountPassword.trim()) {
      showToast('Isi email dan password', 'error');
      return;
    }
    setAddingAccount(true);
    try {
      await addAccount(newAccountEmail.trim(), newAccountPassword.trim());
      showToast('Akun baru ditambahkan', 'success');
      closeAccountModal();
      setNewAccountEmail('');
      setNewAccountPassword('');
    } catch (err: any) {
      showToast(err?.message || 'Gagal menambah akun', 'error');
    } finally {
      setAddingAccount(false);
    }
  };

  const renderAccountItems = () => {
    if (accounts.length === 0) {
      return (
        <ThemedText type="default" themeColor="textSecondary">
          Belum ada akun yang tersimpan
        </ThemedText>
      );
    }
    return (
      <View style={styles.accountList}>
        {accounts.map((accountEmail, index) => (
          <Pressable
            key={accountEmail}
            style={styles.accountItem}
            onPress={() => setSelectedAccount(accountEmail)}
          >
            <MaterialCommunityIcons name="account-outline" size={20} color={Colors.black} />
            <ThemedText style={styles.accountText}>{accountEmail}</ThemedText>
          </Pressable>
        ))}
      </View>
    );
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

          <View style={styles.menuOuter}>
            <View style={styles.menuShadow} pointerEvents="none" />
            <Pressable style={styles.menuItem} onPress={() => setBugModalVisible(true)}>
              <MaterialCommunityIcons name="bug-outline" size={22} color={Colors.black} />
              <ThemedText style={styles.menuText}>Lapor Bug</ThemedText>
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

          <View style={styles.menuOuter}>
            <View style={styles.menuShadow} pointerEvents="none" />
            <Pressable style={styles.menuItem} onPress={openAccountModal}>
              <MaterialCommunityIcons name="account-switch" size={22} color={Colors.black} />
              <ThemedText style={styles.menuText}>Ganti Akun</ThemedText>
            </Pressable>
          </View>
        </View>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeAccountModal}>
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <ThemedText type="subtitle">Pilih Akun</ThemedText>
              {renderAccountItems()}
              {accounts.length > 0 && (
                <View style={styles.divider} />
              )}
              {accounts.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Tekan akun untuk switch
                </ThemedText>
              )}
              {accounts.length > 0 && (
                <View style={styles.addAccountRow} onPress={() => setAddingAccount(true)}>
                  <MaterialCommunityIcons name="plus" size={20} color={Colors.black} />
                  <ThemedText style={styles.addAccountText}>Tambah Akun</ThemedText>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={addingAccount} transparent animationType="fade" onRequestClose={() => setAddingAccount(false)}>
          <View style={styles.modalBackground}>
            <View style={styles.modalContent}>
              <ThemedText type="subtitle">Tambah Akun Baru</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">Masukin email dan password akun baru</ThemedText>
              <View style={styles.inputGroup}>
                <NeoInput
                  placeholder="email..."
                  value={newAccountEmail}
                  onChangeText={setNewAccountEmail}
                  error={!newAccountEmail.trim()}
                  errorText="Email harus diisi"
                />
                <NeoInput
                  placeholder="password..."
                  secureTextEntry
                  value={newAccountPassword}
                  onChangeText={setNewAccountPassword}
                  error={!newAccountPassword.trim()}
                  errorText="Password harus diisi"
                />
              </View>
              <View style={styles.buttonGroup}>
                <NeoButton
                  title="Batal"
                  variant="secondary"
                  onPress={() => {
                    setNewAccountEmail('');
                    setNewAccountPassword('');
                    setAddingAccount(false);
                  }}
                />
                <NeoButton
                  title="Simpan"
                  variant="primary"
                  onPress={handleAddAccount}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>

      <BugReportModal
        visible={bugModalVisible}
        onClose={() => setBugModalVisible(false)}
        userEmail={user?.email}
      />
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
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.bold,
    lineHeight: 24,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    lineHeight: 24,
    color: Colors.white,
  },
  spacer: {
    flex: 1,
  },

  // Modal styles
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 350,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalContentHeader: {
    width: '100%',
    marginBottom: 20,
  },
  accountList: {
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.grayLight,
    marginBottom: 8,
  },
  accountText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  divider: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.black,
    marginVertical: 8,
  },
  addAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  addAccountText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});