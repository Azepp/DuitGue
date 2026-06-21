import * as Linking from "expo-linking";
import { ThemedText } from "@/components/themed-text";
import { NeoButton } from "@/components/ui/neo-button";
import { NeoInput } from "@/components/ui/neo-input";
import { PageLayout } from "@/components/ui/page-layout";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Image, Keyboard, StyleSheet, TouchableWithoutFeedback, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const googleRedirectUri = Linking.createURL("/");

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!displayName.trim()) e.displayName = "Nama harus diisi";
    if (!email.trim()) e.email = "Email harus diisi";
    if (!password) e.password = "Password harus diisi";
    else if (password.length < 6) e.password = "Minimal 6 karakter";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (error) {
      const msg = error.message === "User already registered" ? "Email udah dipake" : error.message;
      setErrors({ email: msg });
      setLoading(false);
      return;
    }

    if (data?.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: displayName.trim(),
      });

      if (profileError) {
        setErrors({ displayName: "Gagal simpan profil" });
      }
    }

    setLoading(false);
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

  const handleGoogleSignUp = async () => {
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
      setErrors({ email: "Daftar Google gagal" });
    }
  };

  return (
    <PageLayout>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <View style={styles.content}>
            <ThemedText type="subtitle">Daftar jadi UserDuit</ThemedText>

            <View style={styles.form}>
              <View>
                <NeoInput
                  label="Nama Panggilan lu"
                  placeholder="lu punya nama panggilan..."
                  autoCapitalize="words"
                  value={displayName}
                  onFocus={() => setErrors({})}
                  onChangeText={(v) => {
                    setDisplayName(v);
                    setErrors({});
                  }}
                  error={errors.displayName}
                />
              </View>

              <View>
                <NeoInput
                  label="Email lu"
                  placeholder="lu punya email..."
                  keyboardType="email-address"
                  autoCapitalize="none"
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
                <NeoInput
                  label="Password"
                  placeholder="lu punya password..."
                  secureTextEntry
                  value={password}
                  onFocus={() => setErrors({})}
                  onChangeText={(v) => {
                    setPassword(v);
                    setErrors({});
                  }}
                  error={errors.password}
                />
              </View>

              <View style={{ marginTop: 16 }}>
                <NeoButton title={loading ? "Tunggu..." : "Daftarrr"} variant="primary" onPress={handleSignUp} disabled={loading} />
              </View>
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText type="default" style={styles.dividerText}>
                atau
              </ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <NeoButton title="Daftar pakai Google" variant="blue" icon={<Image source={require("@/assets/images/icon/google-icon.png")} style={{ width: 20, height: 20 }} resizeMode="contain" />} onPress={handleGoogleSignUp} />

            <View style={styles.registerRow}>
              <ThemedText type="default" style={styles.registerText}>
                udah punya akun?{" "}
              </ThemedText>
              <Link href="/login" asChild>
                <ThemedText type="default" style={styles.registerLink}>
                  Masuk kuy
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
  content: {
    gap: 24,
  },
  form: {
    gap: 20,
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
