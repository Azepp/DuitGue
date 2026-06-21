import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function LogoutScreen() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.signOut().then(() => setDone(true));
  }, []);

  if (done) return <Redirect href="/login" />;

  return null;
}
