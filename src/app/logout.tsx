import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { signOutGoogle } from "@/lib/google-signin";
import { useEffect, useState } from "react";

export default function LogoutScreen() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([supabase.auth.signOut(), signOutGoogle()]).then(() => setDone(true));
  }, []);

  if (done) return <Redirect href="/login" />;

  return null;
}
