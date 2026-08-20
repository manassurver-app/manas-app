import React from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toNepaliNumerals } from '../utils/nepaliCalendar';

interface OfflineSyncBannerProps {
  isOnline: boolean;
  pendingCount: number;
  onSyncNow: () => void;
  lang: 'ne' | 'en';
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOnline,
  pendingCount,
  onSyncNow,
  lang,
}) => {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      id="offline-sync-banner"
      className={`border-b px-4 py-2.5 transition-all text-xs sm:text-sm font-medium ${
        !isOnline
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <span className="p-1 rounded bg-amber-200 text-amber-900">
              <WifiOff className="w-4 h-4" />
            </span>
          ) : (
            <span className="p-1 rounded bg-emerald-200 text-emerald-900">
              <AlertCircle className="w-4 h-4" />
            </span>
          )}

          <div>
            {!isOnline ? (
              <span>
                {lang === 'ne' ? (
                  <>
                    <strong>फिल्ड अफलाइन मोड सक्रिय छ:</strong> इन्टरनेट बिना नै बचत संकलन र भौचर जारी भइरहेको छ।
                    {pendingCount > 0 && ` (${toNepaliNumerals(pendingCount)} कारोबार स्थानीय मेमोरीमा सुरक्षित)`}
                  </>
                ) : (
                  <>
                    <strong>Field Offline Mode Active:</strong> Collections work seamlessly without internet.
                    {pendingCount > 0 && ` (${pendingCount} transactions queued in IndexedDB/Local storage)`}
                  </>
                )}
              </span>
            ) : (
              <span>
                {lang === 'ne' ? (
                  <>
                    <strong>इन्टरनेट जोडिएको छ:</strong> {toNepaliNumerals(pendingCount)} कारोबार मुख्य सर्भरमा सिङ्क हुन बाँकी छ।
                  </>
                ) : (
                  <>
                    <strong>Online Connection Restored:</strong> {pendingCount} offline transaction(s) pending sync to Supabase.
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {pendingCount > 0 && (
          <button
            id="sync-pending-queue-btn"
            onClick={onSyncNow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'ne' ? 'अहिले सिङ्क गर्नुहोस् (Sync Now)' : 'Sync to Database'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
