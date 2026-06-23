import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeoButton } from '@/components/ui/neo-button';
import { NeoInput } from '@/components/ui/neo-input';
import { PageLayout } from '@/components/ui/page-layout';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/toast';

export default function ChangeEmailScreen() {
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const { showToast } = useToast();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ newEmail?: string; password?: string }>({});

  const handleLupaPassword = async () => {
    const email = session?.user?.email;
    if (!email) {
      showToast('Gak bisa deteksi email lu', 'error');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(`Link reset password udah dikirim ke ${email}`, 'success', 4000);
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!newEmail.trim()) e.newEmail = 'Email harus diisi';
    else if (!/\S+@\S+\.\S+/.test(newEmail.trim())) e.newEmail = 'Email gak valid';
    if (!password) e.password = 'Password harus diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session?.user?.email ?? '',
        password,
      });
      if (signInError) {
        setErrors({ password: 'Password salah' });
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (updateError) {
        setErrors({ newEmail: updateError.message });
        return;
      }

      showToast(`Link verifikasi udah dikirim ke ${newEmail.trim()}`, 'success', 4000);
      router.back();
    } catch (err: any) {
      showToast(err?.message || 'Gagal ganti email', 'error');
    } finally {
      setLoading(false);
    }
  };

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
              <ThemedText style={styles.headerTitle}>Ganti Email</ThemedText>
            </View>
          ),
        }}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.content}>
            <View style={styles.titleGroup}>
              <ThemedText type="subtitle">Ganti Email</ThemedText>
              <ThemedText type="default" themeColor="textSecondary">
                masukin email ama password lu buat ganti email
              </ThemedText>
            </View>

            <View style={styles.form}>
              <View>
                <NeoInput
                  label="Email Baru"
                  placeholder="lu punya email baru..."
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={newEmail}
                  onFocus={() => setErrors({})}
                  onChangeText={(v) => {
                    setNewEmail(v);
                    setErrors({});
                  }}
                  error={errors.newEmail}
                />
              </View>

              <View>
                <View style={styles.passwordHeader}>
                  <ThemedText type="smallBold">Password Saat Ini</ThemedText>
                  <TouchableOpacity onPress={handleLupaPassword}>
                    <ThemedText type="small" style={{ color: Colors.black, textDecorationLine: 'underline' }}>
                      Lupa password?
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <NeoInput
                  placeholder="lu punya password..."
                  secureTextEntry
                  value={password}
                  onFocus={() => setErrors({})}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors((e) => ({ ...e, password: undefined }));
                  }}
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  autoComplete="password"
                  error={errors.password}
                />
              </View>

              <View style={{ marginTop: 16 }}>
                <NeoButton
                  title={loading ? 'Mengirim...' : 'Kirim'}
                  variant="primary"
                  onPress={onSubmit}
                  disabled={loading}
                />
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
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
  inner: {
    flex: 1,
  },
  content: {
    gap: 24,
  },
  titleGroup: {
    gap: Spacing.one,
  },
  form: {
    gap: 20,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
});
