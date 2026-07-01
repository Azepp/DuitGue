import { MaterialCommunityIcons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { ThemedText } from "@/components/themed-text";
import { PageLayout } from "@/components/ui/page-layout";
import { useToast } from "@/components/ui/toast";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { signOutGoogle } from "@/lib/google-signin";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

const SHADOW_OFFSET = 3;

const editProfileSchema = z.object({
  display_name: z.string().min(2, "Nama minimal 2 karakter").max(50, "Nama maksimal 50 karakter"),
});

type EditProfileFormData = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const userEmail = session?.user?.email ?? "";
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).single();
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
      display_name: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({ display_name: profile.display_name ?? "" });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: { display_name: string }) => {
      const { error } = await supabase.from("profiles").update({ display_name: data.display_name.trim() }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      showToast("Profil berhasil diperbarui", "success");
      router.back();
    },
    onError: (err: Error) => {
      showToast(err.message || "Gagal menyimpan profil", "error");
    },
  });

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Izin diperlukan", "Aplikasi butuh akses ke galeri buat ganti foto profil.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.uri) return;

    setAvatarUploading(true);
    try {
      const ext = asset.uri.split(".").pop() ?? "jpg";
      const randomId = Math.random().toString(36).substring(2, 10);
      const filePath = `avatars/${userId}/${Date.now()}-${randomId}.${ext}`;

      const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const contentType = allowedMimeTypes.includes(asset.mimeType ?? "") ? asset.mimeType! : "image/jpeg";

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = atob(base64);
      const array = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        array[i] = bytes.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, array, {
        contentType,
      });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Gagal mendapatkan URL avatar");

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      showToast("Foto profil berhasil diperbarui", "success");
    } catch (err: any) {
      showToast(err?.message || "Gagal mengupload foto", "error");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletePasswordError("");
    setDeletingAccount(true);
    try {
      const email = session?.user?.email;
      if (!email) throw new Error("Gak bisa verifikasi akun");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: deletePassword,
      });
      if (authError) {
        setDeletePasswordError("Password salah");
        return;
      }

      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw new Error(error.message || "Gagal menghapus akun");
      showToast("Akun berhasil dihapus", "success");
      await Promise.all([supabase.auth.signOut(), signOutGoogle()]);
    } catch (err: any) {
      showToast(err?.message || "Gagal menghapus akun. Coba lagi nanti.", "error");
    } finally {
      setDeletingAccount(false);
      setDeleteModalVisible(false);
      setDeleteConfirmText("");
      setDeletePassword("");
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
  const canDelete = deletePassword.length > 0;

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
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
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
                  <TextInput style={styles.input} value={value} onChangeText={onChange} onBlur={onBlur} placeholder="lu punya nama panggilan..." placeholderTextColor={Colors.gray} autoCapitalize="words" autoComplete="name" />
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
              <Pressable onPress={() => router.push("/profile/change-email")}>
                <ThemedText type="small" style={{ color: Colors.black, textDecorationLine: "underline" }}>
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
            <Pressable style={[styles.submitBtn, (!isDirty || isSubmitting || updateMutation.isPending) && styles.submitBtnDisabled]} onPress={handleSubmit(onSubmit)} disabled={!isDirty || isSubmitting || updateMutation.isPending}>
              {updateMutation.isPending ? <ActivityIndicator size="small" color={Colors.black} /> : null}
              <ThemedText style={styles.submitText}>{updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.divider} />

          <View style={styles.deleteOuter}>
            <View style={styles.deleteShadow} pointerEvents="none" />
            <Pressable style={styles.deleteBtn} onPress={() => setDeleteModalVisible(true)}>
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
            <ThemedText style={styles.deleteCardMessage}>Aksi ini gak bisa dibatalin, semua data transaksi lu akan hilang permanen.</ThemedText>
            <ThemedText type="small" style={{ marginBottom: 8, marginTop: 4 }}>
              Masukin password lu buat konfirmasi hapus akun
            </ThemedText>
            <View style={{ marginBottom: 16 }}>
              <View style={styles.inputOuter}>
                <View style={styles.inputShadow} pointerEvents="none" />
                <TextInput
                  style={styles.deleteInput}
                  value={deletePassword}
                  onChangeText={(v) => {
                    setDeletePassword(v);
                    setDeletePasswordError("");
                  }}
                  placeholder="masukin password lu"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>
            {deletePasswordError ? (
              <ThemedText type="small" style={{ color: Colors.danger, marginTop: 4 }}>
                {deletePasswordError}
              </ThemedText>
            ) : null}
            <View style={styles.deleteActions}>
              <View style={styles.cancelOuter}>
                <View style={styles.cancelShadow} pointerEvents="none" />
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    setDeleteConfirmText("");
                  }}
                >
                  <ThemedText style={styles.cancelBtnText}>Batal</ThemedText>
                </Pressable>
              </View>
              <View style={styles.confirmDeleteOuter}>
                <View style={styles.confirmDeleteShadow} pointerEvents="none" />
                <Pressable style={[styles.confirmDeleteBtn, !canDelete && styles.confirmDeleteBtnDisabled]} onPress={handleDeleteAccount} disabled={!canDelete || deletingAccount}>
                  {deletingAccount ? <ActivityIndicator size="small" color={Colors.white} /> : <ThemedText style={styles.confirmDeleteText}>Ya, Hapus</ThemedText>}
                </Pressable>
              </View>
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
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    paddingBottom: 32,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.pageX,
    paddingVertical: Spacing.three,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  gajadiText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textDecorationLine: "underline",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 8,
  },
  avatarOuter: {
    position: "relative",
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  avatarShadow: {
    position: "absolute",
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
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  badgeOuter: {
    position: "absolute",
    bottom: -2,
    right: -2,
    paddingRight: 2,
    paddingBottom: 2,
  },
  badgeShadow: {
    position: "absolute",
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
    alignItems: "center",
    justifyContent: "center",
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
    position: "relative",
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  inputShadow: {
    position: "absolute",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  actions: {
    gap: 20,
  },
  submitOuter: {
    position: "relative",
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  submitShadow: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  divider: {
    height: 2,
    backgroundColor: Colors.black,
  },
  deleteOuter: {
    position: "relative",
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  deleteShadow: {
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.danger,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingVertical: 16,
  },
  deleteText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
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
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.two,
  },
  deleteCardMessage: {
    fontSize: 14,
    fontFamily: Fonts.medium,
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
  },
  deleteActions: {
    flexDirection: "row",
    gap: Spacing.twoHalf,
  },
  cancelOuter: {
    flex: 1,
    position: "relative",
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  cancelShadow: {
    position: "absolute",
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
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  confirmDeleteOuter: {
    flex: 1,
    position: "relative",
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  confirmDeleteShadow: {
    position: "absolute",
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  confirmDeleteBtn: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    paddingVertical: Spacing.twoHalf,
    alignItems: "center",
    backgroundColor: Colors.danger,
  },
  confirmDeleteBtnDisabled: {
    backgroundColor: Colors.gray,
  },
  confirmDeleteText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
});
