import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast';
import { ThemedText } from '@/components/themed-text';
import { PageLayout } from '@/components/ui/page-layout';

const SHADOW_OFFSET = 3;

const editProfileSchema = z.object({
  display_name: z.string().min(2, 'Nama minimal 2 karakter').max(50, 'Nama maksimal 50 karakter'),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const userEmail = session?.user?.email ?? '';
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
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

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      display_name: '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({ display_name: profile.display_name ?? '' });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: { display_name: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: data.display_name.trim() })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      showToast('Profil berhasil diperbarui', 'success');
      router.back();
    },
    onError: (err: Error) => {
      showToast(err.message || 'Gagal menyimpan profil', 'error');
    },
  });

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin diperlukan', 'Aplikasi butuh akses ke galeri buat ganti foto profil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.uri) return;

    setAvatarUploading(true);
    try {
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const filePath = `avatars/${userId}/${Date.now()}.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Gagal mendapatkan URL avatar');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      showToast('Foto profil berhasil diperbarui', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengupload foto', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw new Error(error.message || 'Gagal menghapus akun');
      showToast('Akun berhasil dihapus', 'success');
      await supabase.auth.signOut();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus akun. Coba lagi nanti.', 'error');
    } finally {
      setDeletingAccount(false);
      setDeleteModalVisible(false);
      setDeleteConfirmText('');
    }
  };

  const onSubmit = (data: EditProfileFormData) => {
    updateMutation.mutate(data);
  };

  if (profileLoading) {
    return (
      <PageLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.black} />
        </View>
      </PageLayout>
    );
  }

  const avatarUrl = profile?.avatar_url;
  const canDelete = deleteConfirmText.toLowerCase() === 'hapus akun saya';

  return (
    <PageLayout>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => (
            <View style={[styles.headerBar, { paddingTop: 12 + insets.top }]}>
              <TouchableOpacity onPress={() => router.back()}>
                <ThemedText style={styles.gajadiText}>Gajadi</ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.headerTitle}>Edit Profil</ThemedText>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <Pressable onPress={handlePickAvatar} disabled={avatarUploading} style={styles.avatarOuter}>
            <View style={styles.avatarShadow} pointerEvents="none" />
            <View style={styles.avatarBox}>
              {avatarUploading ? (
                <ActivityIndicator size="large" color={Colors.black} />
              ) : avatarUrl ? (
                <View style={styles.avatarImageContainer}>
                  <View style={styles.avatarPlaceholder}>
                    <MaterialCommunityIcons name="account" size={40} color={Colors.black} />
                  </View>
                </View>
              ) : (
                <MaterialCommunityIcons name="account" size={40} color={Colors.black} />
              )}
            </View>
            <View style={styles.badgeOuter}>
              <View style={styles.badgeShadow} pointerEvents="none" />
              <View style={styles.badge}>
                <MaterialCommunityIcons name="camera" size={14} color={Colors.black} />
              </View>
            </View>
          </Pressable>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <ThemedText type="smallBold" style={styles.label}>
              Nama Panggilan Lu
            </ThemedText>
            <Controller
              control={control}
              name="display_name"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputOuter}>
                  <View style={styles.inputShadow} pointerEvents="none" />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="lu punya nama panggilan..."
                    placeholderTextColor={Colors.gray}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                </View>
              )}
            />
            {errors.display_name && (
              <ThemedText type="small" style={styles.errorText}>
                {errors.display_name.message}
              </ThemedText>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.emailHeader}>
              <ThemedText type="smallBold">Email lu</ThemedText>
              <Pressable onPress={() => router.push('/profile/change-email')}>
                <ThemedText type="small" style={{ color: Colors.black, textDecorationLine: 'underline' }}>
                  Ganti Email?
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.emailField}>
              <ThemedText type="default" style={styles.emailText}>
                {userEmail}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <View style={styles.submitOuter}>
            <View style={styles.submitShadow} pointerEvents="none" />
            <Pressable
              style={[
                styles.submitBtn,
                (!isDirty || isSubmitting || updateMutation.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={!isDirty || isSubmitting || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.black} />
              ) : null}
              <ThemedText style={styles.submitText}>
                {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.deleteOuter}>
            <View style={styles.deleteShadow} pointerEvents="none" />
            <Pressable
              style={styles.deleteBtn}
              onPress={() => setDeleteModalVisible(true)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.white} />
              <ThemedText style={styles.deleteText}>Hapus Akun</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.deleteCard}>
            <ThemedText style={styles.deleteCardTitle}>Hapus Akun</ThemedText>
            <ThemedText style={styles.deleteCardMessage}>
              Aksi ini gak bisa dibatalin, semua data transaksi lu akan hilang permanen.
            </ThemedText>
            <ThemedText type="small" style={{ marginBottom: 8, marginTop: 4 }}>
              Ketik "<Text style={{ fontWeight: 700 }}>hapus akun saya</Text>" buat konfirmasi
            </ThemedText>
            <TextInput
              style={styles.deleteInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="hapus akun saya"
              placeholderTextColor={Colors.gray}
              autoCapitalize="none"
            />
            <View style={styles.deleteActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                }}
              >
                <ThemedText style={styles.cancelBtnText}>Batal</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmDeleteBtn, !canDelete && styles.confirmDeleteBtnDisabled]}
                onPress={handleDeleteAccount}
                disabled={!canDelete || deletingAccount}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <ThemedText style={styles.confirmDeleteText}>Ya, Hapus</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 32,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.three,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
  },
  gajadiText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
    textDecorationLine: 'underline',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 8,
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
  avatarBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImageContainer: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOuter: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingRight: 2,
    paddingBottom: 2,
  },
  badgeShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: 20,
    marginBottom: 32,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    marginBottom: 2,
  },
  inputOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  inputShadow: {
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
  input: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    fontSize: 16,
    color: Colors.black,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: {
    color: Colors.danger,
  },
  emailField: {
    backgroundColor: Colors.grayLight,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emailText: {
    color: Colors.gray,
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  actions: {
    gap: 20,
  },
  submitOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  submitShadow: {
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingVertical: 16,
  },
  submitBtnDisabled: {
    backgroundColor: Colors.gray,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.black,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.black,
  },
  deleteOuter: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  deleteShadow: {
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingVertical: 16,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  deleteCard: {
    width: 300,
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
  deleteCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: Spacing.two,
  },
  deleteCardMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.black,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  deleteInput: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.black,
    backgroundColor: Colors.white,
    marginBottom: Spacing.three,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
  },
  confirmDeleteBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: 'center',
    backgroundColor: Colors.danger,
  },
  confirmDeleteBtnDisabled: {
    backgroundColor: Colors.gray,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});
