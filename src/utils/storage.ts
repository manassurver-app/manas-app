import { Profile, Account, Transaction, SyncQueueItem } from '../types';
import { getCurrentNepaliDate } from './nepaliCalendar';

const STORAGE_KEYS = {
  PROFILES: 'manas_profiles_v1',
  ACCOUNTS: 'manas_accounts_v1',
  TRANSACTIONS: 'manas_transactions_v1',
  SYNC_QUEUE: 'manas_sync_queue_v1',
  ACTIVE_USER_ID: 'manas_active_user_id_v1',
  LANGUAGE: 'manas_lang_v1',
  CUSTOM_SUPABASE_CONFIG: 'manas_supabase_config_v1',
};

export const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'प्रशासक (Admin) - टिकापुर',
    role: 'admin',
    email: 'admin@manassahakari.com',
    phone_number: '9858420001',
    assigned_area: 'Tikapur-1 Central Office',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    full_name: 'प्रकाश चौधरी (Prakash Chaudhary)',
    role: 'agent',
    email: 'prakash@manassahakari.com',
    phone_number: '9848412345',
    assigned_area: 'Tikapur-1 Main Bazaar & Block A',
    created_at: '2026-02-10T00:00:00Z',
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    full_name: 'सुनिता रावत (Sunita Rawat)',
    role: 'agent',
    email: 'sunita@manassahakari.com',
    phone_number: '9868498765',
    assigned_area: 'Tikapur-1 Hatbazar & Block C',
    created_at: '2026-02-15T00:00:00Z',
  },
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-001',
    account_no: 'MKS-1001',
    name: 'राम बहादुर थापा (Ram Bahadur Thapa)',
    nepali_name: 'राम बहादुर थापा',
    address: 'टिकापुर-१, मुख्य बजार',
    contact_number: '9848401122',
    assigned_agent_id: 'b1111111-1111-1111-1111-111111111111',
    opening_balance: 1000,
    current_balance: 6500,
    status: 'active',
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'acc-002',
    account_no: 'MKS-1002',
    name: 'सीता देवी चौधरी (Sita Devi Chaudhary)',
    nepali_name: 'सीता देवी चौधरी',
    address: 'टिकापुर-१, ब्लक ' + 'A',
    contact_number: '9868412389',
    assigned_agent_id: 'b1111111-1111-1111-1111-111111111111',
    opening_balance: 500,
    current_balance: 4200,
    status: 'active',
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'acc-003',
    account_no: 'MKS-1003',
    name: 'दिलीप सिंह रावल (Dilip Singh Rawal)',
    nepali_name: 'दिलीप सिंह रावल',
    address: 'टिकापुर-१, खडक चोक',
    contact_number: '9812345678',
    assigned_agent_id: 'b1111111-1111-1111-1111-111111111111',
    opening_balance: 2000,
    current_balance: 8900,
    status: 'active',
    created_at: '2026-03-05T00:00:00Z',
  },
  {
    id: 'acc-004',
    account_no: 'MKS-1004',
    name: 'निर्मला विक (Nirmala B.K.)',
    nepali_name: 'निर्मला विक',
    address: 'टिकापुर-१, ब्लक B',
    contact_number: '9848555123',
    assigned_agent_id: 'b1111111-1111-1111-1111-111111111111',
    opening_balance: 300,
    current_balance: 2800,
    status: 'active',
    created_at: '2026-03-07T00:00:00Z',
  },
  {
    id: 'acc-005',
    account_no: 'MKS-2001',
    name: 'रमेश प्रसाद जोशी (Ramesh Prasad Joshi)',
    nepali_name: 'रमेश प्रसाद जोशी',
    address: 'टिकापुर-१, हाटबजार लाइन',
    contact_number: '9858422334',
    assigned_agent_id: 'c2222222-2222-2222-2222-222222222222',
    opening_balance: 1500,
    current_balance: 7300,
    status: 'active',
    created_at: '2026-03-10T00:00:00Z',
  },
  {
    id: 'acc-006',
    account_no: 'MKS-2002',
    name: 'गीता श्रेष्ठ (Geeta Shrestha)',
    nepali_name: 'गीता श्रेष्ठ',
    address: 'टिकापुर-१, ब्लक C',
    contact_number: '9868778899',
    assigned_agent_id: 'c2222222-2222-2222-2222-222222222222',
    opening_balance: 800,
    current_balance: 5100,
    status: 'active',
    created_at: '2026-03-12T00:00:00Z',
  },
  {
    id: 'acc-007',
    account_no: 'MKS-2003',
    name: 'कमल बहादुर साउँद (Kamal Bahadur Saud)',
    nepali_name: 'कमल बहादुर साउँद',
    address: 'टिकापुर-१, अस्पताल रोड',
    contact_number: '9848991100',
    assigned_agent_id: 'c2222222-2222-2222-2222-222222222222',
    opening_balance: 1000,
    current_balance: 3900,
    status: 'active',
    created_at: '2026-03-15T00:00:00Z',
  },
];

export function getStoredProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function saveProfiles(profiles: Profile[]) {
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
}

export function getActiveUserId(): string {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) || 'b1111111-1111-1111-1111-111111111111';
}

export function setActiveUserId(id: string) {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, id);
}

export function getActiveProfile(): Profile {
  const profiles = getStoredProfiles();
  const currentId = getActiveUserId();
  const found = profiles.find((p) => p.id === currentId);
  return found || profiles[0];
}

export function getStoredAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ACCOUNTS;
  }
}

export function saveStoredAccounts(accounts: Account[]) {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

export function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      // Seed some initial recent collections for demonstration
      const date = getCurrentNepaliDate();
      const demoTxs: Transaction[] = [
        {
          id: 'tx-001',
          account_id: 'acc-001',
          agent_id: 'b1111111-1111-1111-1111-111111111111',
          type: 'deposit',
          amount: 200,
          nepali_date: date.formattedBS,
          day_number: date.day,
          month_year: date.monthYearString,
          remarks: 'दैनिक बचत संकलन',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          sync_status: 'synced',
        },
        {
          id: 'tx-002',
          account_id: 'acc-002',
          agent_id: 'b1111111-1111-1111-1111-111111111111',
          type: 'deposit',
          amount: 150,
          nepali_date: date.formattedBS,
          day_number: date.day,
          month_year: date.monthYearString,
          remarks: 'दैनिक बचत संकलन',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          sync_status: 'synced',
        },
        {
          id: 'tx-003',
          account_id: 'acc-005',
          agent_id: 'c2222222-2222-2222-2222-222222222222',
          type: 'deposit',
          amount: 500,
          nepali_date: date.formattedBS,
          day_number: date.day,
          month_year: date.monthYearString,
          remarks: 'व्यापारिक दैनिक बचत',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          sync_status: 'synced',
        },
      ];
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(demoTxs));
      return demoTxs;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredTransactions(txs: Transaction[]) {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
}

export function getStoredSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]) {
  localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
}

export function recordTransaction(
  data: Omit<Transaction, 'id' | 'created_at' | 'sync_status'>,
  isOnlineMode: boolean = true
): { transaction: Transaction; newBalance: number } {
  const transactions = getStoredTransactions();
  const accounts = getStoredAccounts();
  const id = 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  const newTx: Transaction = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    sync_status: isOnlineMode ? 'synced' : 'pending',
  };

  // Update account balance
  const accIndex = accounts.findIndex((a) => a.id === data.account_id);
  let updatedBalance = 0;
  if (accIndex !== -1) {
    if (data.type === 'deposit') {
      accounts[accIndex].current_balance += Number(data.amount);
    } else {
      accounts[accIndex].current_balance -= Number(data.amount);
    }
    updatedBalance = accounts[accIndex].current_balance;
    saveStoredAccounts(accounts);
  }

  // Prepend new transaction
  transactions.unshift(newTx);
  saveStoredTransactions(transactions);

  // If offline or pending, add to sync queue
  if (!isOnlineMode) {
    const queue = getStoredSyncQueue();
    queue.push({
      id: 'queue-' + Date.now(),
      type: 'insert_transaction',
      payload: newTx,
      timestamp: Date.now(),
      status: 'pending',
    });
    saveSyncQueue(queue);
  }

  return { transaction: newTx, newBalance: updatedBalance };
}

export function recordNewAccount(
  accountData: Omit<Account, 'id' | 'created_at' | 'current_balance'>,
  isOnlineMode: boolean = true
): Account {
  const accounts = getStoredAccounts();
  const id = 'acc-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  const newAccount: Account = {
    ...accountData,
    id,
    current_balance: Number(accountData.opening_balance || 0),
    created_at: new Date().toISOString(),
  };

  accounts.unshift(newAccount);
  saveStoredAccounts(accounts);

  if (!isOnlineMode) {
    const queue = getStoredSyncQueue();
    queue.push({
      id: 'queue-' + Date.now(),
      type: 'insert_account',
      payload: newAccount,
      timestamp: Date.now(),
      status: 'pending',
    });
    saveSyncQueue(queue);
  }

  return newAccount;
}

export function syncPendingQueue(): { syncedCount: number } {
  const queue = getStoredSyncQueue();
  const pendingCount = queue.length;
  if (pendingCount === 0) return { syncedCount: 0 };

  // Mark all transactions as synced
  const txs = getStoredTransactions();
  const updatedTxs = txs.map((t) => ({ ...t, sync_status: 'synced' as const }));
  saveStoredTransactions(updatedTxs);

  // Empty queue
  localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
  return { syncedCount: pendingCount };
}
