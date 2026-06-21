import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,

  setSession: (session) => set({ session, isLoading: false }),

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, isLoading: false });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },
}));
