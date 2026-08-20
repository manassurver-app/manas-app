export type UserRole = 'admin' | 'agent';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  email?: string;
  phone_number?: string;
  assigned_area?: string; // e.g. "Tikapur-1 Ward B & Bazaar"
  created_at: string;
}

export type AccountStatus = 'active' | 'closed';

export interface Account {
  id: string;
  account_no: string;
  name: string;
  nepali_name?: string;
  address: string;
  contact_number: string;
  assigned_agent_id: string;
  opening_balance: number;
  current_balance: number;
  status: AccountStatus;
  created_at: string;
  member_photo_url?: string;
}

export type TransactionType = 'deposit' | 'withdrawal';

export interface Transaction {
  id: string;
  account_id: string;
  agent_id: string;
  type: TransactionType;
  amount: number;
  nepali_date: string; // Format: YYYY-MM-DD in BS, e.g. "2083-04-15"
  day_number: number;  // 1 to 32
  month_year: string;  // e.g. "Shrawan 2083" / "श्रावण २०८३"
  remarks?: string;
  created_at: string;
  sync_status?: 'synced' | 'pending' | 'failed';
  offline_id?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'insert_transaction' | 'update_account' | 'insert_account';
  payload: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  error_message?: string;
}

export interface NepaliMonthInfo {
  monthIndex: number; // 0 = Baisakh, 1 = Jestha ... 11 = Chaitra
  englishName: string;
  nepaliName: string;
  daysCount: number;
}

export interface DailyCollectionSummary {
  totalDeposit: number;
  totalWithdrawal: number;
  netCollection: number;
  transactionCount: number;
  uniqueAccountsCount: number;
}
