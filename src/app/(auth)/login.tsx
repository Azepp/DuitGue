import * as Linking from "expo-linking";
import { ThemedText } from "@/components/themed-text";
import { NeoButton } from "@/components/ui/neo-button";
import { NeoInput } from "@/components/ui/neo-input";
import { PageLayout } from "@/components/ui/page-layout";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { Image, Keyboard, StyleSheet, TouchableWithoutFeedback, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const googleRedirectUri = Linking.createURL("/");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const isSubmitting = useRef(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email harus diisi";
    if (!password) e.password = "Password harus diisi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (isSubmitting.current) return;
    if (!validate()) return;
    isSubmitting.current = true;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const msg = error.message === "Invalid login credentials" ? "Email atau password salah" : error.message;
      setErrors({ password: msg });
    }
    setLoading(false);
    isSubmitting.current = false;
  };

  useEffect(() => {
    const sub = Linking.addEventListener("url", (event) => {
      const code = event.url.match(/code=([^&]+)/)?.[1];
      if (code) {
        supabase.auth.exchangeCodeForSession(code);
      }
    });
    return () => sub.remove();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: googleRedirectUri },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, googleRedirectUri);
        if (result.type === "success" && result.url) {
          const code = result.url.match(/code=([^&]+)/)?.[1];
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      }
    } catch {
      setErrors({ password: "Login Google gagal" });
    }
  };

  return (
    <PageLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.logoSection}>
            <Image source={require("@/assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.content}>
            <ThemedText type="subtitle">Halo lagi UserDuit</ThemedText>

            <View style={styles.form}>
              <View>
                <NeoInput
                  label="Email lu"
                  placeholder="lu punya email..."
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onFocus={() => setErrors({})}
                  onChangeText={(v) => {
                    setEmail(v);
                    setErrors({});
                  }}
                  error={errors.email}
                />
              </View>

              <View>
                <View style={styles.passwordHeader}>
                  <ThemedText type="smallBold">Password</ThemedText>
                  <Link href="/forgot-password" asChild>
                    <ThemedText type="small" style={{ color: Colors.black, textDecorationLine: "underline" }}>
                      Lupa password?
                    </ThemedText>
                  </Link>
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
                  onSubmitEditing={handleLogin}
                  autoComplete="password"
                  error={errors.password}
                />
              </View>

              <View style={{ marginTop: 16 }}>
                <NeoButton title={loading ? "Tunggu..." : "Masukkk"} variant="primary" onPress={handleLogin} disabled={loading} />
              </View>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText type="default" style={styles.dividerText}>
                atau
              </ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <NeoButton title="Masuk pakai Google" variant="blue" icon={<Image source={require("@/assets/images/icon/google-icon.png")} style={{ width: 20, height: 20 }} resizeMode="contain" />} onPress={handleGoogleLogin} />

            <View style={styles.registerRow}>
              <ThemedText type="default" style={styles.registerText}>
                belum punya akun?{" "}
              </ThemedText>
              <Link href="/sign-up" asChild>
                <ThemedText type="default" style={styles.registerLink}>
                  Daftar kuy
                </ThemedText>
              </Link>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </PageLayout>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    justifyContent: "center",
  },
  logoSection: {
    position: "absolute",
    top: 36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  logo: {
    width: 64,
    height: 64,
  },
  content: {
    gap: 24,
  },
  form: {
    gap: 20,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.black,
  },
  dividerText: {
    fontWeight: 500,
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  registerText: {
    fontWeight: 500,
  },
  registerLink: {
    color: Colors.black,
    textDecorationLine: "underline",
    fontWeight: 700,
  },
});
