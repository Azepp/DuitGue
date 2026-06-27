import { createMMKV } from 'react-native-mmkv';

export const mmkv = createMMKV({
  id: 'duitgue-storage',
});

export const mmkvStorage = {
  getItem: (key: string) => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  setItem: (key: string, value: string) => {
    mmkv.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    mmkv.remove(key);
    return Promise.resolve();
  },
};
