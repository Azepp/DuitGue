import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

import { localDb } from './local-db';
import { mmkv } from './mmkv';
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
  queryClient.invalidateQueries({ queryKey: queryKeyPrefix, exact: false });
  queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['transactionSummary'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['laporanSummary'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['laporanYears'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['periodOptions'], exact: false });
}

function refreshLocalBalance() {
  const allTx = localDb.getAll<{ id: string; amount: number; type: 'pengeluaran' | 'pemasukan'; date?: string }>('transactions');
  const balance = allTx.reduce((acc, t) => t.type === 'pemasukan' ? acc + t.amount : acc - t.amount, 0);
  mmkv.set('cached_balance', balance);
  const slim = allTx
    .filter((t): t is typeof t & { date: string } => typeof t.date === 'string')
    .map(({ id, amount, type, date }) => ({ id, amount, type, date }));
  if (slim.length > 0) localDb.setAll('transactions_all', slim);
}

export async function offlineInsert<T extends Record<string, any>>(
  table: 'transactions' | 'categories' | 'profiles',
  item: T,
  queryKeyPrefix: string[],
) {
  localDb.upsert(table, item as any);

  if (!onlineManager.isOnline()) {
    enqueue({ table, action: 'insert', data: item, userId: item.user_id });
    refreshLocalBalance();
    return false;
  }

  try {
    const { id, user_id, ...insertData } = item as any;
    const { error } = await supabase.from(table).insert({ id, ...insertData, user_id: item.user_id });
    if (error) throw error;
    invalidateRelatedQueries(queryKeyPrefix);
    refreshLocalBalance();
    return true;
  } catch {
    enqueue({ table, action: 'insert', data: item, userId: item.user_id });
    refreshLocalBalance();
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
    refreshLocalBalance();
    return false;
  }

  try {
    const { id, user_id, ...rest } = item as any;
    const { error } = await supabase.from(table).update(rest).eq('id', id);
    if (error) throw error;
    invalidateRelatedQueries(queryKeyPrefix);
    refreshLocalBalance();
    return true;
  } catch {
    enqueue({ table, action: 'update', data: item, userId: item.user_id });
    refreshLocalBalance();
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
    if (table === 'transactions') refreshLocalBalance();
    return false;
  }

  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    invalidateRelatedQueries(queryKeyPrefix);
    if (table === 'transactions') refreshLocalBalance();
    return true;
  } catch {
    enqueue({ table, action: 'delete', data: { id }, userId });
    if (table === 'transactions') refreshLocalBalance();
    return false;
  }
}
