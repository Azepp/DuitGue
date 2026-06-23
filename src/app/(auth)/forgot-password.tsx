import { ThemedText } from '@/components/themed-text';
import { NeoButton } from '@/components/ui/neo-button';
import { NeoInput } from '@/components/ui/neo-input';
import { PageLayout } from '@/components/ui/page-layout';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/toast';
import { useState } from 'react';
import { Keyboard, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { showToast } = useToast();

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Email harus diisi');
      return;
    }
    setLoading(true);
    setError(undefined);

    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim());

    if (sendError) {
      setError(sendError.message);
    } else {
      showToast(`Link reset password udah dikirim ke ${email.trim()}`, 'success', 4000);
      setEmail('');
    }

    setLoading(false);
  };

  return (
    <PageLayout center>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.titleGroup}>
            <ThemedText type="subtitle">Lupa Password</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              masukin email lu buat ngatur ulang password lu
            </ThemedText>
          </View>

          <View style={styles.form}>
            <NeoInput
              label="Email lu"
              placeholder="lu punya email..."
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onFocus={() => setError(undefined)}
              onChangeText={(v) => {
                setEmail(v);
                setError(undefined);
              }}
              error={error}
            />

            <View style={{ marginTop: 16 }}>
              <NeoButton
                title={loading ? 'Mengirim...' : 'Kirim'}
                variant="primary"
                onPress={handleSend}
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
