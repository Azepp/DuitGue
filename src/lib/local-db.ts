import { mmkv } from './mmkv';

const CACHE_PREFIX = 'cache:';

function cacheKey(table: string, id?: string) {
  return id ? `${CACHE_PREFIX}${table}:${id}` : `${CACHE_PREFIX}${table}`;
}

function listKey(table: string) {
  return `${CACHE_PREFIX}${table}:ids`;
}

export const localDb = {
  getAll<T extends { id: string }>(table: string): T[] {
    const ids = mmkv.getString(listKey(table));
    if (!ids) return [];
    try {
      const parsed: string[] = JSON.parse(ids);
      return parsed
        .map((id) => {
          const raw = mmkv.getString(cacheKey(table, id));
          return raw ? (JSON.parse(raw) as T) : null;
        })
        .filter(Boolean) as T[];
    } catch {
      return [];
    }
  },

  getById<T extends { id: string }>(table: string, id: string): T | null {
    const raw = mmkv.getString(cacheKey(table, id));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  upsert<T extends { id: string }>(table: string, item: T) {
    const idsKey = listKey(table);
    const raw = mmkv.getString(idsKey);
    const ids: string[] = raw ? JSON.parse(raw) : [];

    if (!ids.includes(item.id)) {
      ids.push(item.id);
      mmkv.set(idsKey, JSON.stringify(ids));
    }

    mmkv.set(cacheKey(table, item.id), JSON.stringify(item));
  },

  remove(table: string, id: string) {
    const idsKey = listKey(table);
    const raw = mmkv.getString(idsKey);
    if (!raw) return;

    const ids: string[] = JSON.parse(raw);
    const filtered = ids.filter((i) => i !== id);
    mmkv.set(idsKey, JSON.stringify(filtered));
    mmkv.remove(cacheKey(table, id));
  },

  setAll<T extends { id: string }>(table: string, items: T[]) {
    const idsKey = listKey(table);
    const oldRaw = mmkv.getString(idsKey);
    const oldIds: string[] = oldRaw ? JSON.parse(oldRaw) : [];

    const newIds = items.map((i) => i.id);
    mmkv.set(idsKey, JSON.stringify(newIds));

    items.forEach((item) => {
      mmkv.set(cacheKey(table, item.id), JSON.stringify(item));
    });

    oldIds.forEach((oldId) => {
      if (!newIds.includes(oldId)) {
        mmkv.remove(cacheKey(table, oldId));
      }
    });
  },

  clearTable(table: string) {
    const idsKey = listKey(table);
    const raw = mmkv.getString(idsKey);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      ids.forEach((id) => mmkv.remove(cacheKey(table, id)));
    }
    mmkv.remove(idsKey);
  },
};
