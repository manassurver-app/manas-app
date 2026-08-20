import React, { useState, useEffect } from 'react';
import {
  Zap,
  Coins,
  Users,
  BarChart3,
  Database,
  UserCheck,
  UserCog,
  FileSpreadsheet,
  FileText,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { RapidPosting } from './components/RapidPosting';
import { DailyCollectionSheet } from './components/DailyCollectionSheet';
import { AccountList } from './components/AccountList';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminUserManagement } from './components/AdminUserManagement';
import { MonthlyExportPanel } from './components/MonthlyExportPanel';
import { BalanceSheetView } from './components/BalanceSheetView';
import { AccountCreateModal } from './components/AccountCreateModal';
import { ExcelBulkImporter } from './components/ExcelBulkImporter';
import { SupabaseSchemaModal } from './components/SupabaseSchemaModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { ReceiptModal } from './components/ReceiptModal';
import { LoginPage } from './components/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/useAuth';
import { Account, Profile, Transaction, UserRole } from './types';
import {
  getStoredProfiles,
  saveProfiles,
  getActiveProfile,
  setActiveUserId,
  getStoredAccounts,
  getStoredTransactions,
  recordTransaction,
} from './utils/storage';
import {
  initSyncManager,
  subscribeSyncState,
  syncOfflineData,
  getSyncState,
  setSimulatedOnline,
  SyncState,
} from './lib/syncManager';

function SahakariApp() {
  const { user, profile, role, isAuthenticated, isLoading, logout, switchProfile, lang, setLang } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>(getStoredProfiles);
  const [activeProfile, setActiveProfile] = useState<Profile>(() => profile || getActiveProfile());
  const [accounts, setAccounts] = useState<Account[]>(getStoredAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions);
  const [syncState, setSyncState] = useState<SyncState>(getSyncState);
  const [activeTab, setActiveTab] = useState<
    'rapid' | 'collection' | 'accounts' | 'export' | 'reports' | 'agents' | 'admin'
  >('rapid');

  // Modals state
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [detailedModalAccount, setDetailedModalAccount] = useState<Account | null>(null);
  const [receiptState, setReceiptState] = useState<{
    transaction: Transaction;
    account: Account;
  } | null>(null);

  // Sync profile whenever auth user changes
  useEffect(() => {
    if (profile) {
      setActiveProfile(profile);
      // Auto-route on initial role switch
      if (profile.role === 'admin' && activeTab === 'rapid') {
        // keep rapid or set admin
      } else if (profile.role === 'agent' && (activeTab === 'admin' || activeTab === 'agents')) {
        setActiveTab('rapid');
      }
    }
  }, [profile]);

  // Initialize Dexie auto-sync background worker on mount
  useEffect(() => {
    const cleanupWorker = initSyncManager();
    const unsubscribeSync = subscribeSyncState((state) => {
      setSyncState(state);
    });

    return () => {
      cleanupWorker?.();
      unsubscribeSync?.();
    };
  }, []);

  // Sync state refresh
  const refreshState = () => {
    const updatedProfiles = getStoredProfiles();
    const updatedAccounts = getStoredAccounts();
    const updatedTransactions = getStoredTransactions();

    setProfiles(updatedProfiles);
    setAccounts(updatedAccounts);
    setTransactions(updatedTransactions);

    // Keep active profile reference up-to-date
    const currentActive = updatedProfiles.find((p) => p.id === activeProfile.id);
    if (currentActive) {
      setActiveProfile(currentActive);
    }
  };

  const handleSelectProfile = (p: Profile) => {
    setActiveUserId(p.id);
    setActiveProfile(p);
    switchProfile(p);
    // If agent switches and was on admin tabs, switch back to rapid posting
    if (p.role === 'agent' && (activeTab === 'admin' || activeTab === 'agents')) {
      setActiveTab('rapid');
    }
  };

  const handleToggleOnlineMode = () => {
    setSimulatedOnline(syncState.isSimulatedOffline);
  };

  const handleSyncNow = async () => {
    await syncOfflineData();
    refreshState();
  };

  // Quick 1-tap deposit handler from Matrix / Daily Sheet
  const handleQuickDeposit = (
    account: Account,
    amount: number,
    nepaliDateBS: string,
    day: number,
    monthYear: string
  ) => {
    const isActuallyOnline = syncState.isOnline && !syncState.isSimulatedOffline;
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
      isActuallyOnline
    );

    refreshState();
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

    const isActuallyOnline = syncState.isOnline && !syncState.isSimulatedOffline;
    const res = recordTransaction(data, isActuallyOnline);
    refreshState();
    setDetailedModalAccount(null);

    setReceiptState({
      transaction: res.transaction,
      account: { ...targetAccount, current_balance: res.newBalance },
    });
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4 shadow-lg" />
        <h2 className="text-lg font-bold tracking-tight text-white mb-1">
          मानस कृषि सहकारी संस्था लि.
        </h2>
        <p className="text-xs text-emerald-300 font-mono">
          {lang === 'ne' ? 'प्रणाली लोड हुँदैछ...' : 'Loading Portal...'}
        </p>
      </div>
    );
  }

  // Unauthenticated -> Show Login Page
  if (!isAuthenticated || !user) {
    return (
      <LoginPage
        isOnline={syncState.isOnline && !syncState.isSimulatedOffline}
        onSuccessRedirect={(userRole: UserRole) => {
          refreshState();
          setActiveTab(userRole === 'admin' ? 'admin' : 'rapid');
        }}
      />
    );
  }

  const isAdmin = activeProfile.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-emerald-200">
      {/* Top Header with Live Agent Collection Summary Widget & Logout */}
      <Header
        activeProfile={activeProfile}
        profiles={profiles}
        transactions={transactions}
        onSelectProfile={handleSelectProfile}
        isOnline={syncState.isOnline && !syncState.isSimulatedOffline}
        onToggleOnlineMode={handleToggleOnlineMode}
        pendingSyncCount={syncState.pendingCount}
        onSync={handleSyncNow}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'ne' ? 'en' : 'ne')}
        onLogout={logout}
      />

      {/* Network Status & IndexedDB Sync Queue Monitor */}
      <OfflineBanner lang={lang} onSyncComplete={refreshState} />

      {/* Navigation Sub-header / Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between">
          <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto">
            {/* Primary Mobile Rapid Posting Tab */}
            <button
              id="tab-rapid-posting"
              onClick={() => setActiveTab('rapid')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rapid'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ne' ? '⚡ द्रुत संकलन (Rapid Entry)' : '⚡ Rapid Cash Posting'}</span>
            </button>

            <button
              id="tab-daily-collection"
              onClick={() => setActiveTab('collection')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'collection'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>{lang === 'ne' ? 'दैनिक बचत खाता पाना (Sheet)' : 'Daily Sheet Matrix'}</span>
            </button>

            <button
              id="tab-member-accounts"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'accounts'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{lang === 'ne' ? 'सदस्य बचत खाताहरू' : 'Member Accounts'}</span>
            </button>

            <button
              id="tab-monthly-export"
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'export'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ne' ? 'मासिक Excel म्याट्रिक्स' : 'Monthly Matrix Export'}</span>
            </button>

            <button
              id="tab-balance-sheet"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ne' ? 'वासलात तथा वित्तीय प्रतिवेदन' : 'Balance Sheet & Reports'}</span>
            </button>

            {isAdmin && (
              <>
                <button
                  id="tab-admin-agents"
                  onClick={() => setActiveTab('agents')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'agents'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  <span>{lang === 'ne' ? 'बजार प्रतिनिधि व्यवस्थापन' : 'Field Agents'}</span>
                </button>

                <button
                  id="tab-admin-analytics"
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>{lang === 'ne' ? 'केन्द्रीय व्यवस्थापन' : 'Admin Hub'}</span>
                </button>
              </>
            )}
          </nav>

          {/* Quick Right Shortcuts */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                id="header-excel-import-btn"
                onClick={() => setIsBulkImportOpen(true)}
                className="hidden md:flex items-center gap-1.5 text-xs font-black text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>एक्सेल बल्क आयात</span>
              </button>
            )}

            <button
              id="header-open-new-acc-btn"
              onClick={() => setIsCreateAccountOpen(true)}
              className="flex items-center gap-1.5 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 px-3 py-1.5 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">नयाँ खाता</span>
              <span className="sm:hidden">+ खाता</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content View with Role Protection */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6 space-y-6">
        {activeTab === 'rapid' && (
          <RapidPosting
            accounts={accounts}
            transactions={transactions}
            agent={activeProfile}
            onRefresh={refreshState}
            onViewReceipt={(tx, acc) =>
              setReceiptState({ transaction: tx, account: acc })
            }
            lang={lang}
          />
        )}

        {activeTab === 'collection' && (
          <DailyCollectionSheet
            accounts={accounts}
            transactions={transactions}
            agent={activeProfile}
            onQuickDeposit={handleQuickDeposit}
            onOpenDetailedModal={(acc) => setDetailedModalAccount(acc)}
            onViewReceipt={(tx, acc) =>
              setReceiptState({ transaction: tx, account: acc })
            }
            lang={lang}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountList
            accounts={accounts}
            transactions={transactions}
            profiles={profiles}
            activeProfile={activeProfile}
            onOpenCreateModal={() => setIsCreateAccountOpen(true)}
            onOpenBulkImportModal={() => setIsBulkImportOpen(true)}
            onOpenTransactionModal={(acc) => setDetailedModalAccount(acc)}
            onRefresh={refreshState}
            lang={lang}
          />
        )}

        {activeTab === 'export' && (
          <MonthlyExportPanel
            accounts={accounts}
            transactions={transactions}
            profiles={profiles}
            activeProfile={activeProfile}
            lang={lang}
          />
        )}

        {activeTab === 'reports' && (
          <BalanceSheetView
            accounts={accounts}
            transactions={transactions}
            profiles={profiles}
            activeProfile={activeProfile}
            lang={lang}
          />
        )}

        {activeTab === 'agents' && (
          <ProtectedRoute allowedRoles={['admin']} fallbackTab={() => setActiveTab('rapid')}>
            <AdminUserManagement
              profiles={profiles}
              accounts={accounts}
              transactions={transactions}
              onRefresh={refreshState}
              activeProfile={activeProfile}
              lang={lang}
            />
          </ProtectedRoute>
        )}

        {activeTab === 'admin' && (
          <ProtectedRoute allowedRoles={['admin']} fallbackTab={() => setActiveTab('rapid')}>
            <AdminDashboard
              accounts={accounts}
              transactions={transactions}
              profiles={profiles}
              lang={lang}
            />
          </ProtectedRoute>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © २०८३ मानस कृषि सहकारी संस्था लिमिटेड, टिकापुर-१, कैलाली (सुदूरपश्चिम प्रदेश)
          </span>
          <span className="text-[11px] text-slate-400">
            Field Offline Dexie IndexedDB • Supabase Auth & RLS Policy • Excel SheetJS Engine
          </span>
        </div>
      </footer>

      {/* Account Create Modal */}
      <AccountCreateModal
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
        profiles={profiles}
        activeProfile={activeProfile}
        existingAccounts={accounts}
        onAccountCreated={() => {
          refreshState();
        }}
        lang={lang}
      />

      {/* Excel Bulk Importer Modal */}
      <ExcelBulkImporter
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        profiles={profiles}
        existingAccounts={accounts}
        onImportComplete={() => {
          refreshState();
        }}
        lang={lang}
      />

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
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SahakariApp />
    </AuthProvider>
  );
}

