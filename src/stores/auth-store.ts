import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { mmkvStorage } from '@/lib/mmkv';
import { signInWithGoogle } from '@/lib/google-signin';

let isSwitchingAccount = false;
let onAuthChangeCallback: (() => void) | null = null;

export const setAuthChangeCallback = (callback: (() => void) | null) => {
  onAuthChangeCallback = callback;
};

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  accounts: string[];
  setSession: (session: Session | null) => void;
  addAccount: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  removeAccount: (email: string) => Promise<{ success: boolean; error?: string }>;
  switchAccount: (email: string) => Promise<{ success: boolean; error?: string }>;
  initialize: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    isLoading: true,
    accounts: [],

    setSession: (session) => set({ session, isLoading: false }),

    addAccount: async (email: string, password: string) => {
      try {
        const updatedAccounts = [...new Set([...get().accounts, email])];
        const storedPasswordsStr = await mmkvStorage.getItem('passwords') ?? '{}';
        const storedPasswords = JSON.parse(storedPasswordsStr);
        const updatedPasswords = { ...storedPasswords, [email]: password };
        await mmkvStorage.setItem('accounts', JSON.stringify(updatedAccounts));
        await mmkvStorage.setItem('passwords', JSON.stringify(updatedPasswords));
        set({ accounts: updatedAccounts });
        return { success: true };
      } catch {
        return { success: false, error: 'Gagal menyimpan akun' };
      }
    },

    removeAccount: async (email: string) => {
      try {
        const updatedAccounts = get().accounts.filter((a) => a !== email);
        const storedPasswordsStr = await mmkvStorage.getItem('passwords') ?? '{}';
        const storedPasswords = JSON.parse(storedPasswordsStr);
        delete storedPasswords[email];
        await mmkvStorage.setItem('accounts', JSON.stringify(updatedAccounts));
        await mmkvStorage.setItem('passwords', JSON.stringify(storedPasswords));
        set({ accounts: updatedAccounts });
        if (get().session?.user?.email === email) {
          set({ session: null });
        }
        return { success: true };
      } catch {
        return { success: false, error: 'Gagal menghapus akun' };
      }
    },

    switchAccount: async (email: string) => {
      try {
        const accountEmail = get().accounts.find((a) => a === email);
        if (!accountEmail) {
          return { success: false, error: 'Akun tidak ditemukan' };
        }

        const storedPasswordsStr = await mmkvStorage.getItem('passwords') ?? '{}';
        const storedPasswords = JSON.parse(storedPasswordsStr);
        const password = storedPasswords[email] || '';

        const currentSession = get().session;

        isSwitchingAccount = true;
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();

          let session = null;
          
          // If password is empty, it's a Google account - use Google sign-in
          if (!password) {
            const { data, error } = await signInWithGoogle();
            if (error) throw error;
            session = data?.session ?? null;
          } else {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (error) throw error;
            session = data.session ?? null;
          }

          if (session) {
            await get().addAccount(email, password);
            set({ session, isLoading: false });
            isSwitchingAccount = false;
            if (onAuthChangeCallback) onAuthChangeCallback();
            return { success: true };
          } else {
            throw new Error('Gagal mendapatkan session');
          }
        } catch (authErr: any) {
          if (currentSession) {
            await supabase.auth.setSession(currentSession);
            set({ session: currentSession, isLoading: false });
          } else {
            set({ isLoading: false });
          }
          isSwitchingAccount = false;
          return { success: false, error: authErr.message || 'Gagal switch akun' };
        }
      } catch {
        isSwitchingAccount = false;
        return { success: false, error: 'Error tak terduga' };
      }
    },

    initialize: async () => {
      let isMounted = true;

      const doInitialize = async () => {
        const { data } = await supabase.auth.getSession();

        const storedAccountsStr = await mmkvStorage.getItem('accounts') ?? '[]';
        const storedAccounts = JSON.parse(storedAccountsStr);
        const storedPasswordsStr = await mmkvStorage.getItem('passwords') ?? '{}';
        const storedPasswords = JSON.parse(storedPasswordsStr);

        if (storedAccounts.length > 0 && data.session) {
          const password = storedPasswords[storedAccounts[0]] || '';
          const { data: loginData, error } = await supabase.auth.signInWithPassword({
            email: storedAccounts[0],
            password,
          });
          if (error) {
            if (isMounted) set({ session: data.session, accounts: storedAccounts, isLoading: false });
          } else {
            if (isMounted) set({ session: loginData.session, accounts: storedAccounts, isLoading: false });
          }
        } else {
          if (isMounted) set({ session: data.session, accounts: storedAccounts, isLoading: false });
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (isMounted && !isSwitchingAccount) {
            set({ session });
            if (onAuthChangeCallback) onAuthChangeCallback();
          }
        });
      };

      try {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth init timeout')), 10000)
        );
        await Promise.race([doInitialize(), timeout]);
      } catch {
        const storedAccountsStr = await mmkvStorage.getItem('accounts') ?? '[]';
        const storedAccounts = JSON.parse(storedAccountsStr);
        if (isMounted) set({ session: null, accounts: storedAccounts, isLoading: false });
      }
    },
  })
);