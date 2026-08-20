import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  getSyncState,
  subscribeSyncState,
  syncOfflineData,
  getPendingTransactions,
  OfflinePendingTransaction,
  setSimulatedOnline,
  SyncState,
} from '../lib/syncManager';
import { toNepaliNumerals, formatCurrencyNPR } from '../utils/nepaliCalendar';

interface OfflineBannerProps {
  lang: 'ne' | 'en';
  onSyncComplete?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  lang,
  onSyncComplete,
}) => {
  const [syncState, setSyncState] = useState<SyncState>(getSyncState);
  const [pendingList, setPendingList] = useState<OfflinePendingTransaction[]>([]);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((state) => {
      setSyncState(state);
      if (state.pendingCount > 0) {
        getPendingTransactions().then(setPendingList);
      } else {
        setPendingList([]);
      }
    });

    // Initial load
    getPendingTransactions().then(setPendingList);

    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncingLocal(true);
    try {
      const res = await syncOfflineData();
      if (res.syncedCount > 0) {
        setToastMessage(
          lang === 'ne'
            ? `सफलतापूर्वक ${toNepaliNumerals(res.syncedCount)} वटा अफलाइन कारोबारहरू मुख्य सर्भरमा सिङ्क गरियो!`
            : `Successfully synced ${res.syncedCount} offline transactions!`
        );
        setTimeout(() => setToastMessage(null), 4000);
        if (onSyncComplete) onSyncComplete();
      } else if (res.errorCount > 0) {
        setToastMessage(res.message);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } finally {
      setIsSyncingLocal(false);
    }
  };

  const isOffline = !syncState.isOnline || syncState.isSimulatedOffline;
  const isSyncing = syncState.syncStatus === 'syncing' || isSyncingLocal;

  return (
    <div className="w-full">
      {/* Toast Notification if any */}
      {toastMessage && (
        <div className="bg-emerald-900 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 border-b border-emerald-700 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Status Bar */}
      <div
        id="offline-sync-status-bar"
        className={`border-b px-3.5 py-2.5 transition-all text-xs font-medium shadow-2xs ${
          isSyncing
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : isOffline
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : syncState.pendingCount > 0
            ? 'bg-amber-50/90 border-amber-200 text-amber-900'
            : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Indicator Info */}
          <div className="flex items-center gap-2.5">
            {/* Status Pill Badge */}
            {isSyncing ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>
                  {lang === 'ne'
                    ? `🔵 सर्भरमा सिङ्क हुँदैछ (${toNepaliNumerals(syncState.pendingCount)} बाँकी)...`
                    : `🔵 Syncing ${syncState.pendingCount} items to Supabase...`}
                </span>
              </span>
            ) : isOffline ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {lang === 'ne'
                    ? `🟡 अफलाइन मोड (${toNepaliNumerals(syncState.pendingCount)} कारोबार स्थानीय IndexedDB मा सुरक्षित)`
                    : `🟡 Offline Mode (${syncState.pendingCount} entries saved locally)`}
                </span>
              </span>
            ) : syncState.pendingCount > 0 ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  {lang === 'ne'
                    ? `🟡 इन्टरनेट उपलब्ध (${toNepaliNumerals(syncState.pendingCount)} कारोबार सिङ्क हुन बाँकी)`
                    : `🟡 Online (${syncState.pendingCount} pending upload)`}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <Wifi className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {lang === 'ne' ? '🟢 अनलाइन (सम्पूर्ण डाटा सुरक्षित र सिङ्क छ)' : '🟢 Online (Synced)'}
                </span>
              </span>
            )}

            {/* Explanatory micro text */}
            <span className="hidden md:inline-block text-[11px] text-slate-600">
              {isOffline
                ? lang === 'ne'
                  ? 'इन्टरनेट नहुँदा पनि फिल्डमा बचत जम्मा र फिर्ता कारोबार पूर्ण रूपमा चल्छ।'
                  : 'Door-to-door collections remain fully functional offline.'
                : lang === 'ne'
                ? 'प्रत्येक ३० सेकेन्डमा स्वतः क्लाउड सर्भरसँग सिङ्क हुन्छ।'
                : 'Auto-syncs with Supabase cloud database every 30 seconds.'}
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* View Pending Queue Button */}
            {syncState.pendingCount > 0 && (
              <button
                id="btn-toggle-pending-queue"
                onClick={() => setIsQueueDrawerOpen(!isQueueDrawerOpen)}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {lang === 'ne'
                    ? `बाँकी लगत (${toNepaliNumerals(syncState.pendingCount)})`
                    : `Queue (${syncState.pendingCount})`}
                </span>
                {isQueueDrawerOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Sync Now Button */}
            {syncState.pendingCount > 0 && (
              <button
                id="btn-sync-now-banner"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-400 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing
                    ? lang === 'ne'
                      ? 'सिङ्क हुँदैछ...'
                      : 'Syncing...'
                    : lang === 'ne'
                    ? 'अहिले सिङ्क गर्नुहोस्'
                    : 'Sync Now'}
                </span>
              </button>
            )}

            {/* Field Simulator Toggle (Offline Mode Toggle) */}
            <button
              id="btn-toggle-offline-simulation"
              onClick={() => setSimulatedOnline(syncState.isSimulatedOffline)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                syncState.isSimulatedOffline
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="Toggle Field Offline Mode for Testing"
            >
              {syncState.isSimulatedOffline
                ? lang === 'ne'
                  ? 'फिल्ड मोड बन्द'
                  : 'Disable Sim'
                : lang === 'ne'
                ? 'अफलाइन परीक्षण'
                : 'Simulate Offline'}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Pending Queue Drawer */}
      {isQueueDrawerOpen && syncState.pendingCount > 0 && (
        <div className="bg-amber-50/95 border-b border-amber-200 p-4 animate-in slide-in-from-top-1">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-black text-xs">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs text-amber-950">
                    {lang === 'ne'
                      ? 'स्थानीय IndexedDB मा सुरक्षित बाँकी कारोबार सूची (Unsynced Transactions)'
                      : 'IndexedDB Pending Transactions Queue'}
                  </h4>
                  <p className="text-[10px] text-amber-800">
                    इन्टरनेट जडान हुनासाथ यी सबै भौचरहरू स्वतः Supabase क्लाउडमा सुरक्षित हुनेछन्।
                  </p>
                </div>
              </div>

              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{lang === 'ne' ? 'सबै सिङ्क गर्नुहोस्' : 'Force Sync All'}</span>
              </button>
            </div>

            {/* List of pending transactions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
              {pendingList.map((tx) => (
                <div
                  key={tx.offline_id || tx.id}
                  className="bg-white p-3 rounded-2xl border border-amber-200/80 shadow-2xs flex flex-col justify-between text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg text-[10px]">
                      {tx.account_no}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        tx.type === 'deposit'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {tx.type === 'deposit' ? 'जम्मा (+)' : 'फिर्ता (-)'}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-slate-800 truncate">{tx.account_name}</div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500 font-mono">{tx.nepali_date} BS</span>
                      <span className="font-mono font-black text-emerald-950">
                        {formatCurrencyNPR(tx.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[9px] text-amber-700 flex items-center gap-1 pt-1 border-t border-slate-100">
                    <Clock className="w-3 h-3" />
                    <span>ID: {tx.offline_id?.slice(0, 16)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
