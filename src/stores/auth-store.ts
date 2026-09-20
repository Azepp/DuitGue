import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { mmkvStorage } from '@/lib/mmkv';

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  accounts: string[];
  setSession: (session: Session | null) => void;
  addAccount: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  removeAccount: (email: string) => Promise<{ success: boolean; error?: string }>;
  switchAccount: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
      } catch (err) {
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
      } catch (err) {
        return { success: false, error: 'Gagal menghapus akun' };
      }
    },

    switchAccount: async (email: string, password: string) => {
      try {
        const accountEmail = get().accounts.find((a) => a === email);
        if (!accountEmail) {
          return { success: false, error: 'Akun tidak ditemukan' };
        }

        set({ isLoading: true });
        try {
          await supabase.auth.signOut();

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;

          const session = data.session ?? null;
          if (session) {
            await get().addAccount(email, password);
            set({ session, isLoading: false });
            return { success: true };
          } else {
            return { success: false, error: 'Gagal mendapatkan session' };
          }
        } catch (authErr: any) {
          return { success: false, error: authErr.message || 'Gagal switch akun' };
        } finally {
          set({ isLoading: false });
        }
      } catch (err) {
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
          if (isMounted) set({ session });
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