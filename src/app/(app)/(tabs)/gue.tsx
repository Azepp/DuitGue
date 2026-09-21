import { useState } from 'react';
import { Pressable, StyleSheet, View, Modal, KeyboardAvoidingView, Platform } from 'react-native';
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
import { signOutGoogle, signInWithGoogle } from '@/lib/google-signin';
import { mmkv } from '@/lib/mmkv';
import { NeoInput } from '@/components/ui/neo-input';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const SHADOW_OFFSET = 3;

export default function GueScreen() {
  const session = useAuthStore((s) => s.session);
  const user = session?.user;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const accounts = useAuthStore((s) => s.accounts);
  const addAccount = useAuthStore((s) => s.addAccount);
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
  const [exporting, setExporting] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

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
  };

  const closeAccountModal = () => {
    setModalVisible(false);
  };

  const handleSwitchAccount = async (targetEmail: string) => {
    closeAccountModal();
    const result = await switchAccount(targetEmail);
    if (!result.success) {
      showToast(result.error || 'Gagal switch akun', 'error');
    }
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

  const handleAddAccountGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) throw error;
      if (!data?.session || !data?.user?.email) {
        return;
      }
      await addAccount(data.user.email, '');
      showToast('Akun Google ditambahkan', 'success');
      closeAccountModal();
    } catch (err: any) {
      if (err?.code !== 'SIGN_IN_CANCELLED') {
        showToast(err?.message || 'Gagal login Google', 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderAccountItems = () => {
    if (accounts.length === 0) {
      return (
        <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
          Belum ada akun yang tersimpan
        </ThemedText>
      );
    }
    const currentEmail = user?.email;
    return (
      <View style={styles.accountList}>
        {accounts.map((accountEmail, index) => (
          <Pressable
            key={accountEmail}
            style={[
              styles.accountItem,
              currentEmail === accountEmail && styles.accountItemActive,
            ]}
            onPress={() => {
              if (accountEmail !== currentEmail) {
                handleSwitchAccount(accountEmail);
              }
            }}
            disabled={accountEmail === currentEmail}
          >
            <MaterialCommunityIcons name="account-outline" size={20} color={Colors.black} />
            <ThemedText style={styles.accountText}>{accountEmail}</ThemedText>
            {currentEmail === accountEmail && (
              <MaterialCommunityIcons name="check-circle" size={22} color={Colors.success} />
            )}
            {currentEmail !== accountEmail && (
              <MaterialCommunityIcons name="swap-horizontal" size={22} color={Colors.primary} />
            )}
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

          <View style={styles.menuOuter}>
            <View style={styles.menuShadow} pointerEvents="none" />
            <Pressable style={styles.menuItem} onPress={openAccountModal}>
              <MaterialCommunityIcons name="account-switch" size={22} color={Colors.black} />
              <ThemedText style={styles.menuText}>Ganti Akun</ThemedText>
            </Pressable>
          </View>

          <View style={styles.logoutOuter}>
            <View style={styles.logoutShadow} pointerEvents="none" />
            <Pressable
              style={styles.logoutBtn}
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color={Colors.white} />
              <ThemedText style={styles.logoutText}>
                Keluar
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeAccountModal}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.backdropTouch} onPress={closeAccountModal} />

            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="account-multiple" size={24} color={Colors.black} />
                <ThemedText style={styles.modalTitle}>Pilih Akun</ThemedText>
                <Pressable onPress={closeAccountModal} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={22} color={Colors.black} />
                </Pressable>
              </View>

              {renderAccountItems()}

              {accounts.length > 0 && (
                <View style={styles.modalDivider} />
              )}

              <View style={styles.divider} />

              <ThemedText style={styles.sectionTitle}>Tambah Akun Baru</ThemedText>
              <View style={styles.addAccountOptions}>
                <Pressable
                  style={[
                    styles.addAccountOption,
                    { backgroundColor: Colors.white, borderColor: Colors.black },
                  ]}
                  onPress={() => {
                    setNewAccountEmail('');
                    setNewAccountPassword('');
                    setAddingAccount(true);
                  }}
                >
                  <MaterialCommunityIcons name="email-outline" size={24} color={Colors.black} />
                  <ThemedText style={styles.addAccountOptionText}>Email</ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.addAccountOption,
                    { backgroundColor: Colors.white, borderColor: Colors.black },
                  ]}
                  onPress={handleAddAccountGoogle}
                  disabled={googleLoading}
                >
                  <Image
                    source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                    style={styles.googleIcon}
                  />
                  <ThemedText style={styles.addAccountOptionText}>
                    {googleLoading ? 'Loading...' : 'Google'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={addingAccount} transparent animationType="fade" onRequestClose={() => {
          setAddingAccount(false);
          setNewAccountEmail('');
          setNewAccountPassword('');
        }}>
          <KeyboardAvoidingView
            style={styles.modalBackdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Pressable style={styles.backdropTouch} onPress={() => {
              setAddingAccount(false);
              setNewAccountEmail('');
              setNewAccountPassword('');
            }} />

            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons name="account-plus" size={24} color={Colors.black} />
                <ThemedText style={styles.modalTitle}>Tambah Akun Baru</ThemedText>
                <Pressable onPress={() => {
                  setAddingAccount(false);
                  setNewAccountEmail('');
                  setNewAccountPassword('');
                }} hitSlop={12}>
                  <MaterialCommunityIcons name="close" size={22} color={Colors.black} />
                </Pressable>
              </View>

              <ThemedText type="default" themeColor="textSecondary" style={styles.modalSubtitle}>
                Masukin email dan password akun baru
              </ThemedText>

              <ThemedText style={styles.label}>Email</ThemedText>
              <View style={styles.inputOuter}>
                <View style={styles.inputShadow} pointerEvents="none" />
                <NeoInput
                  placeholder="email..."
                  value={newAccountEmail}
                  onChangeText={setNewAccountEmail}
                  error={newAccountEmail.trim() ? undefined : 'Email harus diisi'}
                />
              </View>

              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.inputOuter}>
                <View style={styles.inputShadow} pointerEvents="none" />
                <NeoInput
                  placeholder="password..."
                  secureTextEntry
                  value={newAccountPassword}
                  onChangeText={setNewAccountPassword}
                  error={newAccountPassword.trim() ? undefined : 'Password harus diisi'}
                />
              </View>

              <View style={styles.modalActions}>
                <View style={styles.cancelOuter}>
                  <View style={styles.cancelShadow} pointerEvents="none" />
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => {
                      setNewAccountEmail('');
                      setNewAccountPassword('');
                      setAddingAccount(false);
                    }}
                  >
                    <ThemedText style={styles.cancelText}>Batal</ThemedText>
                  </Pressable>
                </View>

                <View style={styles.confirmOuter}>
                  <View style={styles.confirmShadow} pointerEvents="none" />
                  <Pressable
                    style={[styles.confirmBtn, (!newAccountEmail.trim() || !newAccountPassword.trim()) && styles.confirmBtnDisabled]}
                    onPress={handleAddAccount}
                    disabled={!newAccountEmail.trim() || !newAccountPassword.trim()}
                  >
                    <ThemedText style={styles.confirmText}>Simpan</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <BugReportModal
          visible={bugModalVisible}
          onClose={() => setBugModalVisible(false)}
          userEmail={user?.email}
        />
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

  // Modal styles (matching BugReportModal)
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: {
    position: 'absolute',
    inset: 0,
  },
  modalCard: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.four,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  accountList: {
    marginBottom: Spacing.two,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: Spacing.three,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.grayLight,
    marginBottom: Spacing.two,
  },
  accountItemActive: {
    borderColor: Colors.success,
    backgroundColor: '#E8F5E9',
  },
  accountItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFDE7',
  },
  accountText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.black,
    flex: 1,
  },
  modalDivider: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.black,
    marginVertical: Spacing.two,
  },
  hintText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },
  inputOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
    marginBottom: Spacing.two,
  },
  inputShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  addAccountOptions: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    marginTop: Spacing.one,
  },
  addAccountOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderWidth: 2,
    borderRadius: 10,
  },
  addAccountOptionText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    marginTop: Spacing.two,
  },
  cancelOuter: {
    flex: 1,
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  cancelShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  cancelBtn: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  confirmOuter: {
    flex: 1,
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  confirmShadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  confirmBtn: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.gray,
  },
  confirmText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
});