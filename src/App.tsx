import React, { useState, useEffect } from 'react';
import {
  Coins,
  Users,
  BarChart3,
  Database,
  PlusCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Header } from './components/Header';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { DailyCollectionSheet } from './components/DailyCollectionSheet';
import { MemberAccounts } from './components/MemberAccounts';
import { AdminDashboard } from './components/AdminDashboard';
import { SupabaseSchemaModal } from './components/SupabaseSchemaModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { ReceiptModal } from './components/ReceiptModal';
import { AgentManagementModal } from './components/AgentManagementModal';
import { Account, Profile, Transaction } from './types';
import {
  getStoredProfiles,
  saveProfiles,
  getActiveProfile,
  setActiveUserId,
  getStoredAccounts,
  saveStoredAccounts,
  getStoredTransactions,
  recordTransaction,
  recordNewAccount,
  getStoredSyncQueue,
  syncPendingQueue,
} from './utils/storage';

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>(getStoredProfiles);
  const [activeProfile, setActiveProfile] = useState<Profile>(getActiveProfile);
  const [accounts, setAccounts] = useState<Account[]>(getStoredAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getStoredSyncQueue().length);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lang, setLang] = useState<'ne' | 'en'>('ne');
  const [activeTab, setActiveTab] = useState<'collection' | 'accounts' | 'admin'>('collection');

  // Modals state
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isAgentsModalOpen, setIsAgentsModalOpen] = useState(false);
  const [detailedModalAccount, setDetailedModalAccount] = useState<Account | null>(null);
  const [receiptState, setReceiptState] = useState<{ transaction: Transaction; account: Account } | null>(null);

  // Sync state refresh
  const refreshState = () => {
    setProfiles(getStoredProfiles());
    setAccounts(getStoredAccounts());
    setTransactions(getStoredTransactions());
    setPendingSyncCount(getStoredSyncQueue().length);
  };

  const handleSelectProfile = (profile: Profile) => {
    setActiveUserId(profile.id);
    setActiveProfile(profile);
  };

  const handleToggleOnlineMode = () => {
    setIsOnline((prev) => !prev);
  };

  const handleSyncNow = () => {
    const result = syncPendingQueue();
    refreshState();
    alert(
      lang === 'ne'
        ? `${result.syncedCount} वटा अफलाइन कारोबारहरू मुख्य सर्भरमा सफलतापूर्वक सिङ्क भयो!`
        : `Successfully synced ${result.syncedCount} offline transactions!`
    );
  };

  // Quick 1-tap deposit handler
  const handleQuickDeposit = (
    account: Account,
    amount: number,
    nepaliDateBS: string,
    day: number,
    monthYear: string
  ) => {
    const res = recordTransaction(
      {
        account_id: account.id,
        agent_id: activeProfile.id,
        type: 'deposit',
        amount,
        nepali_date: nepaliDateBS,
        day_number: day,
        month_year: monthYear,
        remarks: 'दैनिक बचत संकलन',
      },
      isOnline
    );

    refreshState();
    // Prompt receipt preview
    setReceiptState({
      transaction: res.transaction,
      account: { ...account, current_balance: res.newBalance },
    });
  };

  // Custom deposit/withdrawal submit handler
  const handleCustomTransactionSubmit = (
    data: Omit<Transaction, 'id' | 'created_at' | 'sync_status'>
  ) => {
    const targetAccount = accounts.find((a) => a.id === data.account_id);
    if (!targetAccount) return;

    const res = recordTransaction(data, isOnline);
    refreshState();
    setDetailedModalAccount(null);

    setReceiptState({
      transaction: res.transaction,
      account: { ...targetAccount, current_balance: res.newBalance },
    });
  };

  // Add new account
  const handleAddAccount = (
    accountData: Omit<Account, 'id' | 'created_at' | 'current_balance'>
  ) => {
    recordNewAccount(accountData, isOnline);
    refreshState();
  };

  // Batch import accounts from Excel
  const handleBatchImportAccounts = (importedAccounts: Partial<Account>[]) => {
    const currentList = getStoredAccounts();
    const newItems: Account[] = importedAccounts.map((item, idx) => ({
      id: 'acc-' + Date.now() + '-' + idx,
      account_no: item.account_no || `MKS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: item.name || 'सदस्य',
      nepali_name: item.nepali_name,
      address: item.address || 'Tikapur-1, Kailali',
      contact_number: item.contact_number || '9800000000',
      assigned_agent_id: item.assigned_agent_id || activeProfile.id,
      opening_balance: Number(item.opening_balance || 0),
      current_balance: Number(item.opening_balance || 0),
      status: 'active',
      created_at: new Date().toISOString(),
    }));

    saveStoredAccounts([...newItems, ...currentList]);
    refreshState();
  };

  const handleAddAgent = (newAgentData: Omit<Profile, 'id' | 'created_at'>) => {
    const current = getStoredProfiles();
    const newProfile: Profile = {
      ...newAgentData,
      id: 'agent-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const updated = [...current, newProfile];
    saveProfiles(updated);
    refreshState();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-emerald-200">
      {/* Top Header */}
      <Header
        activeProfile={activeProfile}
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        isOnline={isOnline}
        onToggleOnlineMode={handleToggleOnlineMode}
        pendingSyncCount={pendingSyncCount}
        onSync={handleSyncNow}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ne' ? 'en' : 'ne')}
      />

      {/* Offline Status & Sync Alert */}
      <OfflineSyncBanner
        isOnline={isOnline}
        pendingCount={pendingSyncCount}
        onSyncNow={handleSyncNow}
        lang={lang}
      />

      {/* Navigation Sub-header / Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-14 sm:top-14 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between">
          <nav className="flex space-x-1 sm:space-x-4 py-2">
            <button
              id="tab-daily-collection"
              onClick={() => setActiveTab('collection')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'collection'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>{lang === 'ne' ? 'दैनिक बचत संकलन' : 'Daily Collection'}</span>
            </button>

            <button
              id="tab-member-accounts"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'ne' ? 'सदस्य बचत खाता' : 'Member Accounts'}</span>
            </button>

            {activeProfile.role === 'admin' && (
              <button
                id="tab-admin-analytics"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{lang === 'ne' ? 'व्यवस्थापक अनुगमन' : 'Admin Hub'}</span>
              </button>
            )}
          </nav>

          {/* Quick Right Shortcuts */}
          <div className="flex items-center gap-2">
            {activeProfile.role === 'admin' && (
              <button
                id="manage-agents-btn"
                onClick={() => setIsAgentsModalOpen(true)}
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-emerald-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'ne' ? 'प्रतिनिधि सूची' : 'Agents'}</span>
              </button>
            )}

            <button
              id="view-rls-schema-btn"
              onClick={() => setIsSqlModalOpen(true)}
              className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Supabase Schema & RLS</span>
              <span className="sm:hidden">SQL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 pb-12">
        {activeTab === 'collection' && (
          <DailyCollectionSheet
            accounts={accounts}
            transactions={transactions}
            agent={activeProfile}
            onQuickDeposit={handleQuickDeposit}
            onOpenDetailedModal={(acc) => setDetailedModalAccount(acc)}
            onViewReceipt={(tx, acc) => setReceiptState({ transaction: tx, account: acc })}
            lang={lang}
          />
        )}

        {activeTab === 'accounts' && (
          <MemberAccounts
            accounts={accounts}
            transactions={transactions}
            profiles={profiles}
            activeProfile={activeProfile}
            onAddAccount={handleAddAccount}
            onBatchImportAccounts={handleBatchImportAccounts}
            lang={lang}
          />
        )}

        {activeTab === 'admin' && activeProfile.role === 'admin' && (
          <AdminDashboard
            accounts={accounts}
            transactions={transactions}
            profiles={profiles}
            lang={lang}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © २०८३ मानस कृषि सहकारी संस्था लिमिटेड, टिकापुर-१, कैलाली (सुदूरपश्चिम प्रदेश)
          </span>
          <span className="text-[11px] text-slate-400">
            Field Offline PWA • Supabase PostgreSQL RLS • Excel SheetJS Integrated
          </span>
        </div>
      </footer>

      {/* Supabase Schema & RLS Modal */}
      <SupabaseSchemaModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* Detailed Transaction Modal (Deposit / Withdrawal) */}
      {detailedModalAccount && (
        <NewTransactionModal
          account={detailedModalAccount}
          agent={activeProfile}
          isOpen={Boolean(detailedModalAccount)}
          onClose={() => setDetailedModalAccount(null)}
          onSubmit={handleCustomTransactionSubmit}
          lang={lang}
        />
      )}

      {/* Thermal Receipt & SMS Modal */}
      {receiptState && (
        <ReceiptModal
          transaction={receiptState.transaction}
          account={receiptState.account}
          agent={activeProfile}
          onClose={() => setReceiptState(null)}
          lang={lang}
        />
      )}

      {/* Agent Management Modal */}
      <AgentManagementModal
        isOpen={isAgentsModalOpen}
        onClose={() => setIsAgentsModalOpen(false)}
        profiles={profiles}
        accounts={accounts}
        onAddAgent={handleAddAgent}
        lang={lang}
      />
    </div>
  );
}
