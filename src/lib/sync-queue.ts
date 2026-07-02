import { mmkv } from './mmkv';
import { supabase } from './supabase';

const QUEUE_KEY = 'sync:queue';
const ENTRY_PREFIX = 'sync:entry:';

export type SyncOperation = {
  table: 'transactions' | 'categories' | 'profiles';
  action: 'insert' | 'update' | 'delete';
  data: Record<string, any>;
  userId: string;
  createdAt: number;
};

function getQueue(): string[] {
  const raw = mmkv.getString(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function setQueue(ids: string[]) {
  mmkv.set(QUEUE_KEY, JSON.stringify(ids));
}

export function enqueue(op: Omit<SyncOperation, 'createdAt'>) {
  const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: SyncOperation = { ...op, createdAt: Date.now() };

  const ids = getQueue();
  ids.push(id);
  setQueue(ids);

  mmkv.set(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
}

function dequeue(id: string) {
  const ids = getQueue();
  const filtered = ids.filter((i) => i !== id);
  setQueue(filtered);
  mmkv.remove(`${ENTRY_PREFIX}${id}`);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export async function processQueue(): Promise<{ success: number; failed: number }> {
  const ids = getQueue();
  let success = 0;
  let failed = 0;

  for (const id of ids) {
    const raw = mmkv.getString(`${ENTRY_PREFIX}${id}`);
    if (!raw) {
      dequeue(id);
      continue;
    }

    try {
      const op: SyncOperation = JSON.parse(raw);
      await executeOperation(op);
      dequeue(id);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

async function executeOperation(op: SyncOperation) {
  const { table, action, data, userId } = op;

  switch (action) {
    case 'insert': {
      const { user_id, ...insertData } = data;
      const { error } = await supabase.from(table).insert({ ...insertData, user_id: userId });
      if (error) throw error;
      break;
    }
    case 'update': {
      const { id, user_id, ...rest } = data;
      const { error } = await supabase.from(table).update(rest).eq('id', id);
      if (error) throw error;
      break;
    }
    case 'delete': {
      const { error } = await supabase.from(table).delete().eq('id', data.id);
      if (error) throw error;
      break;
    }
  }
}
