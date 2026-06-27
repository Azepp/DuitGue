import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "./supabase";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

GoogleSignin.configure({
  webClientId,
});

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const user = await GoogleSignin.signIn();

    const { idToken } = user;
    if (!idToken) throw new Error("No ID token");

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    if (error?.code === "SIGN_IN_CANCELLED") {
      return { data: null, error: null };
    }
    return { data: null, error };
  }
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore
  }
}
