import React from 'react';
import { ShieldCheck, UserCheck, Wifi, WifiOff, RefreshCw, Database, FileSpreadsheet, Building2 } from 'lucide-react';
import { Profile } from '../types';
import { getCurrentNepaliDate, toNepaliNumerals, formatBSToNepaliDate } from '../utils/nepaliCalendar';

interface HeaderProps {
  activeProfile: Profile;
  profiles: Profile[];
  onSelectProfile: (profile: Profile) => void;
  isOnline: boolean;
  onToggleOnlineMode: () => void;
  pendingSyncCount: number;
  onSync: () => void;
  onOpenSqlModal: () => void;
  lang: 'ne' | 'en';
  onToggleLang: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeProfile,
  profiles,
  onSelectProfile,
  isOnline,
  onToggleOnlineMode,
  pendingSyncCount,
  onSync,
  onOpenSqlModal,
  lang,
  onToggleLang,
}) => {
  const nepaliDate = getCurrentNepaliDate();

  return (
    <header className="bg-gradient-to-r from-emerald-900 via-green-800 to-emerald-950 text-white shadow-lg border-b border-emerald-700/50 sticky top-0 z-40">
      {/* Top organization bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Logo & Cooperative Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold text-xl shadow-md border-2 border-amber-300 shrink-0">
              <Building2 className="w-6 h-6 text-emerald-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-tight">
                  मानस कृषि सहकारी संस्था लि.
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full">
                  Tikapur-1, Kailali
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 font-medium">
                {lang === 'ne'
                  ? 'बजार प्रतिनिधि दैनिक बचत तथा ऋण संकलन प्रणाली'
                  : 'Manas Krishi Sahakari Limited - Field Collection & Micro-Savings'}
              </p>
            </div>
          </div>

          {/* Controls: Online/Offline Toggle, Profile Switcher, Supabase SQL Modal */}
          <div className="flex items-center flex-wrap gap-2 justify-between md:justify-end">
            {/* Online / Offline Simulator Toggle */}
            <button
              id="network-status-toggle"
              onClick={onToggleOnlineMode}
              title={isOnline ? 'Active Online Connection (Tap to test Offline Mode)' : 'Working Offline in Field (Tap to go Online)'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isOnline
                  ? 'bg-emerald-800/80 text-emerald-100 border-emerald-500/50 hover:bg-emerald-700'
                  : 'bg-amber-600/90 text-amber-100 border-amber-400 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="hidden sm:inline">अनलाइन</span>
                  <span className="sm:hidden">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-200" />
                  <span>अफलाइन (गाउँ/फिल्ड)</span>
                </>
              )}
            </button>

            {/* Sync Queue Button if items exist */}
            {pendingSyncCount > 0 && (
              <button
                id="sync-now-header-btn"
                onClick={onSync}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-emerald-950 shadow-md hover:bg-amber-300 transition-colors animate-bounce"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === 'ne' ? `${toNepaliNumerals(pendingSyncCount)} सिङ्क` : `${pendingSyncCount} Sync`}</span>
              </button>
            )}

            {/* Supabase Schema / RLS Modal Button */}
            <button
              id="supabase-sql-btn"
              onClick={onOpenSqlModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800/70 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 transition-colors"
              title="Supabase Schema & RLS Policies"
            >
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden md:inline">Supabase RLS & SQL</span>
              <span className="md:hidden">SQL</span>
            </button>

            {/* Language switch */}
            <button
              id="lang-toggle-btn"
              onClick={onToggleLang}
              className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-950/70 border border-emerald-700 text-emerald-200 hover:text-white"
            >
              {lang === 'ne' ? 'EN' : 'नेपाली'}
            </button>

            {/* Active User Switcher (Simulating field agents and admin login) */}
            <div className="flex items-center bg-emerald-950/90 rounded-lg p-1 border border-emerald-700/80">
              <span className="text-[11px] text-emerald-300 px-1.5 font-medium flex items-center gap-1">
                {activeProfile.role === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </span>
              <select
                id="active-profile-select"
                value={activeProfile.id}
                onChange={(e) => {
                  const target = profiles.find((p) => p.id === e.target.value);
                  if (target) onSelectProfile(target);
                }}
                className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer pr-1"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} className="bg-emerald-950 text-white py-1">
                    {p.role === 'admin' ? '⭐ ' : '👤 '} {p.full_name} ({p.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Nepali BS Date strip */}
        <div className="mt-2 pt-2 border-t border-emerald-700/40 flex flex-wrap items-center justify-between text-xs text-emerald-100">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-950/80 px-2 py-0.5 rounded text-amber-300 font-bold border border-emerald-800">
              आजको मिति: {formatBSToNepaliDate(nepaliDate.formattedBS)}
            </span>
            <span className="text-emerald-300 text-[11px] hidden sm:inline">
              (B.S. {nepaliDate.formattedBS} | {nepaliDate.monthYearString})
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-emerald-200">
            <span>क्षेत्र: <strong className="text-white">{activeProfile.assigned_area || 'टिकापुर-१'}</strong></span>
            <span>भूमिका: <strong className="text-amber-300 uppercase">{activeProfile.role}</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
};
