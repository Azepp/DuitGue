import { ThemedText } from '@/components/themed-text';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoInput } from '@/components/ui/neo-input';
import { PageLayout } from '@/components/ui/page-layout';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const { showToast } = useToast();

  const validate = () => {
    const e: typeof errors = {};
    if (!password) e.password = 'Password harus diisi';
    else if (password.length < 8) e.password = 'Minimal 8 karakter';
    if (!confirmPassword) e.confirmPassword = 'Konfirmasi password harus diisi';
    else if (password !== confirmPassword) e.confirmPassword = 'Password gak cocok';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrors({ password: 'Gagal mengubah password. Coba lagi nanti.' });
    } else {
      showToast('Password berhasil diubah', 'success');
      router.replace('/login');
    }

    setLoading(false);
  };

  return (
    <PageLayout center>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.titleGroup}>
            <ThemedText type="subtitle">Buat Password Baru</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Password lama udah basi, ganti aje
            </ThemedText>
          </View>

          <View style={styles.form}>
            <NeoInput
              label="Password Baru"
              placeholder="lu punya password baru..."
              secureTextEntry
              value={password}
              onFocus={() => setErrors({})}
              onChangeText={(v) => {
                setPassword(v);
                setErrors({});
              }}
              error={errors.password}
            />

            <NeoInput
              label="Konfirmasi Password"
              placeholder="ketik ulang password lu..."
              secureTextEntry
              value={confirmPassword}
              onFocus={() => setErrors({})}
              onChangeText={(v) => {
                setConfirmPassword(v);
                setErrors({});
              }}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              error={errors.confirmPassword}
            />

            <View style={{ marginTop: 16 }}>
              <NeoButton
                title={loading ? 'Menyimpan...' : 'Simpan'}
                variant="primary"
                onPress={handleSubmit}
                disabled={loading}
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    gap: 24,
  },
  titleGroup: {
    gap: 4,
  },
  form: {
    gap: 20,
  },
});
