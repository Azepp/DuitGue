import { createClient } from '@supabase/supabase-js';
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import * as Linking from 'expo-linking';
import { mmkvStorage } from './mmkv';

if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = {};
}

if (!globalThis.crypto.getRandomValues) {
  globalThis.crypto.getRandomValues = (array: Uint8Array) => {
    const bytes = getRandomBytes(array.length);
    array.set(bytes);
    return array;
  };
}

if (!globalThis.crypto.subtle) {
  globalThis.crypto.subtle = {
    digest: async (algorithm: string, data: Uint8Array) => {
      if (algorithm === 'SHA-256') {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(data);
        const hex = await digestStringAsync(CryptoDigestAlgorithm.SHA256, text);
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        return bytes.buffer;
      }
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    },
  };
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: mmkvStorage,
  },
});
