import Dexie, { Table } from 'dexie';
import { Account, Profile, Transaction } from '../types';
import { supabase, isRealSupabaseConfigured } from './supabase';
import {
  getStoredAccounts,
  saveStoredAccounts,
  getStoredTransactions,
  saveStoredTransactions,
} from '../utils/storage';

export interface OfflinePendingTransaction {
  id?: number;
  offline_id: string;
  account_id: string;
  account_no: string;
  account_name: string;
  agent_id: string;
  agent_name: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  nepali_date: string;
  day_number: number;
  month_year: string;
  remarks?: string;
  created_at: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  error_message?: string;
}

export interface SyncLog {
  id?: number;
  timestamp: string;
  synced_count: number;
  status: 'success' | 'partial' | 'error';
  message: string;
}

export interface SyncState {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

class ManasOfflineDatabase extends Dexie {
  pendingTransactions!: Table<OfflinePendingTransaction, number>;
  syncLogs!: Table<SyncLog, number>;

  constructor() {
    super('ManasCooperativeOfflineDB');
    this.version(1).stores({
      pendingTransactions:
        '++id, offline_id, account_id, account_no, agent_id, type, nepali_date, sync_status, created_at',
      syncLogs: '++id, timestamp, status',
    });
  }
}

export const db = new ManasOfflineDatabase();

// Internal state tracking
let currentState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSimulatedOffline: false,
  syncStatus: 'idle',
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
};

type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener({ ...currentState });
    } catch (err) {
      console.error('Error in sync listener:', err);
    }
  });
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncState(): SyncState {
  return { ...currentState };
}

export async function refreshPendingCount(): Promise<number> {
  try {
    const count = await db.pendingTransactions
      .where('sync_status')
      .anyOf(['pending', 'failed'])
      .count();
    currentState.pendingCount = count;
    notifyListeners();
    return count;
  } catch (err) {
    console.error('Failed to count pending transactions:', err);
    return 0;
  }
}

/**
 * Toggle simulation mode for testing offline field collection
 */
export function setSimulatedOnline(online: boolean) {
  currentState.isSimulatedOffline = !online;
  notifyListeners();
  if (online && currentState.pendingCount > 0) {
    syncOfflineData();
  }
}

/**
 * Queue a transaction locally into IndexedDB and LocalStorage
 */
export async function queueOfflineTransaction(
  data: Omit<Transaction, 'id' | 'created_at' | 'sync_status'>,
  account: Account,
  agent: Profile
): Promise<{ transaction: Transaction; newBalance: number; offlineId: string }> {
  const offlineId = `tx-off-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nowISO = new Date().toISOString();

  const isActuallyOnline =
    navigator.onLine && !currentState.isSimulatedOffline;

  const newTx: Transaction = {
    ...data,
    id: offlineId,
    offline_id: offlineId,
    created_at: nowISO,
    sync_status: isActuallyOnline ? 'synced' : 'pending',
  };

  // 1. Immediately update LocalStorage cache
  const localAccounts = getStoredAccounts();
  const accIdx = localAccounts.findIndex((a) => a.id === data.account_id);
  let updatedBalance = account.current_balance;

  if (accIdx !== -1) {
    if (data.type === 'deposit') {
      localAccounts[accIdx].current_balance += Number(data.amount);
    } else {
      localAccounts[accIdx].current_balance -= Number(data.amount);
    }
    updatedBalance = localAccounts[accIdx].current_balance;
    saveStoredAccounts(localAccounts);
  }

  const localTxs = getStoredTransactions();
  localTxs.unshift(newTx);
  saveStoredTransactions(localTxs);

  // 2. Persist to Dexie IndexedDB
  try {
    await db.pendingTransactions.add({
      offline_id: offlineId,
      account_id: data.account_id,
      account_no: account.account_no,
      account_name: account.name,
      agent_id: agent.id,
      agent_name: agent.full_name,
      type: data.type,
      amount: Number(data.amount),
      nepali_date: data.nepali_date,
      day_number: data.day_number,
      month_year: data.month_year,
      remarks: data.remarks || '',
      created_at: nowISO,
      sync_status: isActuallyOnline ? 'synced' : 'pending',
      attempts: 0,
    });
  } catch (dbErr) {
    console.warn('Dexie IndexedDB insert warning:', dbErr);
  }

  await refreshPendingCount();

  // If online, immediately attempt background sync
  if (isActuallyOnline) {
    syncOfflineData();
  }

  return {
    transaction: newTx,
    newBalance: updatedBalance,
    offlineId,
  };
}

/**
 * Background Sync Engine
 * Pushes pending transactions from IndexedDB to Supabase
 */
export async function syncOfflineData(): Promise<{
  syncedCount: number;
  errorCount: number;
  message: string;
}> {
  if (currentState.isSimulatedOffline || !navigator.onLine) {
    return {
      syncedCount: 0,
      errorCount: 0,
      message: 'Network offline. Transactions remain securely in local IndexedDB.',
    };
  }

  if (currentState.syncStatus === 'syncing') {
    return {
      syncedCount: 0,
      errorCount: 0,
      message: 'Sync already in progress...',
    };
  }

  currentState.syncStatus = 'syncing';
  currentState.lastError = null;
  notifyListeners();

  try {
    const pendingItems = await db.pendingTransactions
      .where('sync_status')
      .anyOf(['pending', 'failed'])
      .toArray();

    if (pendingItems.length === 0) {
      currentState.syncStatus = 'synced';
      currentState.lastSyncedAt = new Date();
      currentState.pendingCount = 0;
      notifyListeners();
      return { syncedCount: 0, errorCount: 0, message: 'All transactions up to date.' };
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const item of pendingItems) {
      try {
        if (isRealSupabaseConfigured) {
          // Attempt real Supabase insertion
          const { error: insertErr } = await supabase.from('transactions').insert([
            {
              account_id: item.account_id,
              agent_id: item.agent_id,
              type: item.type,
              amount: item.amount,
              nepali_date: item.nepali_date,
              day_number: item.day_number,
              month_year: item.month_year,
              remarks: item.remarks,
              created_at: item.created_at,
            },
          ]);

          if (insertErr) throw insertErr;

          // Update member balance on Supabase
          const { data: accData } = await supabase
            .from('accounts')
            .select('current_balance')
            .eq('id', item.account_id)
            .single();

          if (accData) {
            const newBal =
              item.type === 'deposit'
                ? accData.current_balance + item.amount
                : accData.current_balance - item.amount;

            await supabase
              .from('accounts')
              .update({ current_balance: newBal })
              .eq('id', item.account_id);
          }
        }

        // Mark as synced in Dexie
        if (item.id) {
          await db.pendingTransactions.update(item.id, {
            sync_status: 'synced',
            attempts: (item.attempts || 0) + 1,
            error_message: undefined,
          });
        }

        syncedCount++;
      } catch (itemErr: any) {
        console.error('Failed to sync item:', item, itemErr);
        errorCount++;
        if (item.id) {
          await db.pendingTransactions.update(item.id, {
            sync_status: 'failed',
            attempts: (item.attempts || 0) + 1,
            error_message: itemErr.message || 'Unknown network error',
          });
        }
      }
    }

    // Update LocalStorage transaction sync statuses
    const localTxs = getStoredTransactions();
    const updatedLocalTxs = localTxs.map((t) => ({
      ...t,
      sync_status: 'synced' as const,
    }));
    saveStoredTransactions(updatedLocalTxs);

    // Record log
    await db.syncLogs.add({
      timestamp: new Date().toISOString(),
      synced_count: syncedCount,
      status: errorCount === 0 ? 'success' : 'partial',
      message: `Synced ${syncedCount} entries, ${errorCount} errors`,
    });

    currentState.syncStatus = errorCount === 0 ? 'synced' : 'error';
    currentState.lastSyncedAt = new Date();
    await refreshPendingCount();

    return {
      syncedCount,
      errorCount,
      message: `Successfully synced ${syncedCount} transactions!`,
    };
  } catch (err: any) {
    console.error('Fatal sync error:', err);
    currentState.syncStatus = 'error';
    currentState.lastError = err.message || 'Sync failed';
    notifyListeners();
    return {
      syncedCount: 0,
      errorCount: 1,
      message: err.message || 'Sync failed',
    };
  }
}

/**
 * Fetch all pending transactions for inspection
 */
export async function getPendingTransactions(): Promise<OfflinePendingTransaction[]> {
  try {
    return await db.pendingTransactions
      .where('sync_status')
      .anyOf(['pending', 'failed', 'syncing'])
      .reverse()
      .toArray();
  } catch {
    return [];
  }
}

/**
 * Initialize auto-sync background worker and event listeners
 */
let autoSyncInterval: any = null;

export function initSyncManager() {
  if (typeof window === 'undefined') return;

  // Window online/offline events
  const handleOnline = () => {
    currentState.isOnline = true;
    notifyListeners();
    syncOfflineData();
  };

  const handleOffline = () => {
    currentState.isOnline = false;
    notifyListeners();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial count check
  refreshPendingCount();

  // Background timer: Check every 30 seconds
  if (!autoSyncInterval) {
    autoSyncInterval = setInterval(() => {
      if (
        navigator.onLine &&
        !currentState.isSimulatedOffline &&
        currentState.pendingCount > 0
      ) {
        syncOfflineData();
      }
    }, 30000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
  };
}
