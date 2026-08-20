import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

import { localDb } from './local-db';
import { enqueue } from './sync-queue';
import { queryClient } from './query-client';
import { supabase } from './supabase';

export function initOnlineManager() {
  let wasOffline = false;

  NetInfo.addEventListener((state) => {
    const online = state.isConnected ?? state.isInternetReachable ?? true;
    onlineManager.setOnline(online);

    if (wasOffline && online) {
      wasOffline = false;
      import('./sync-queue').then(({ processQueue }) =>
        processQueue().then((res) => {
          if (res.success > 0 || res.failed > 0) {
            queryClient.invalidateQueries();
          }
        }),
      );
    }

    if (!online) wasOffline = true;
  });
}

export function cacheQueryData<T extends { id: string }>(table: string, data: T[]) {
  if (!data || data.length === 0) return;
  data.forEach((item) => localDb.upsert(table, item));
}

export function getCachedData<T extends { id: string }>(table: string): T[] {
  return localDb.getAll<T>(table);
}

function invalidateRelatedQueries(queryKeyPrefix: string[]) {
  queryClient.invalidateQueries({ queryKey: queryKeyPrefix });
  queryClient.invalidateQueries({ queryKey: ['transactionSummary'] });
  queryClient.invalidateQueries({ queryKey: ['laporanSummary'] });
  queryClient.invalidateQueries({ queryKey: ['laporanYears'] });
  queryClient.invalidateQueries({ queryKey: ['periodOptions'] });
}

export async function offlineInsert<T extends Record<string, any>>(
  table: 'transactions' | 'categories' | 'profiles',
  item: T,
  queryKeyPrefix: string[],
) {
  localDb.upsert(table, item as any);

  if (!onlineManager.isOnline()) {
    enqueue({ table, action: 'insert', data: item, userId: item.user_id });
    return false;
  }

  try {
    const { id, user_id, ...insertData } = item as any;
    const { error } = await supabase.from(table).insert({ id, ...insertData, user_id: item.user_id });
    if (error) throw error;
    invalidateRelatedQueries(queryKeyPrefix);
    return true;
  } catch {
    enqueue({ table, action: 'insert', data: item, userId: item.user_id });
    return false;
  }
}

export async function offlineUpdate<T extends Record<string, any>>(
  table: 'transactions' | 'categories' | 'profiles',
  item: T,
  queryKeyPrefix: string[],
) {
  localDb.upsert(table, item as any);

  if (!onlineManager.isOnline()) {
    enqueue({ table, action: 'update', data: item, userId: item.user_id });
    return false;
  }

  try {
    const { id, user_id, ...rest } = item as any;
    const { error } = await supabase.from(table).update(rest).eq('id', id);
    if (error) throw error;
    invalidateRelatedQueries(queryKeyPrefix);
    return true;
  } catch {
    enqueue({ table, action: 'update', data: item, userId: item.user_id });
    return false;
  }
}

export async function offlineDelete(
  table: 'transactions' | 'categories' | 'profiles',
  id: string,
  userId: string,
  queryKeyPrefix: string[],
) {
  localDb.remove(table, id);

  if (!onlineManager.isOnline()) {
    enqueue({ table, action: 'delete', data: { id }, userId });
    return false;
  }

  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    invalidateRelatedQueries(queryKeyPrefix);
    return true;
  } catch {
    enqueue({ table, action: 'delete', data: { id }, userId });
    return false;
  }
}
