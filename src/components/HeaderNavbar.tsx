import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Receipt,
  LogOut,
  ChevronDown,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Profile, Transaction, UserRole } from '../types';
import {
  getCurrentNepaliDate,
  toNepaliNumerals,
  formatBSToNepaliDate,
  formatCurrencyNPR,
} from '../utils/nepaliCalendar';
import { useAuth } from '../context/useAuth';

interface HeaderNavbarProps {
  activeProfile: Profile;
  profiles: Profile[];
  transactions?: Transaction[];
  onSelectProfile: (profile: Profile) => void;
  isOnline: boolean;
  onToggleOnlineMode: () => void;
  pendingSyncCount: number;
  onSync: () => void;
  onOpenSqlModal: () => void;
  lang: 'ne' | 'en';
  onToggleLang: () => void;
  onLogout?: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeProfile,
  profiles,
  transactions = [],
  onSelectProfile,
  isOnline,
  onToggleOnlineMode,
  pendingSyncCount,
  onSync,
  onOpenSqlModal,
  lang,
  onToggleLang,
  onLogout,
}) => {
  const { logout, user } = useAuth();
  const nepaliDate = getCurrentNepaliDate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Compute live agent daily collection totals
  const agentDailyTotals = useMemo(() => {
    let collected = 0;
    let withdrawn = 0;
    let count = 0;

    transactions.forEach((tx) => {
      const matchAgent =
        activeProfile.role === 'admin' || tx.agent_id === activeProfile.id;
      const matchToday = tx.nepali_date === nepaliDate.formattedBS;

      if (matchAgent && matchToday) {
        if (tx.type === 'deposit') {
          collected += Number(tx.amount);
        } else {
          withdrawn += Number(tx.amount);
        }
        count++;
      }
    });

    return {
      collected,
      withdrawn,
      net: collected - withdrawn,
      count,
    };
  }, [transactions, activeProfile, nepaliDate.formattedBS]);

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
    }
  };

  const isAdmin = activeProfile.role === 'admin';

  return (
    <header className="bg-gradient-to-r from-emerald-950 via-green-900 to-emerald-950 text-white shadow-xl border-b border-emerald-700/50 sticky top-0 z-40">
      {/* Main Top Navigation Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Logo & Cooperative Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold text-xl shadow-md border-2 border-amber-300 shrink-0">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-900" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                    मानस कृषि सहकारी संस्था लि.
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full">
                    Tikapur-1, Kailali
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/90 font-medium">
                  {lang === 'ne'
                    ? 'बजार प्रतिनिधि दैनिक बचत तथा ऋण संकलन प्रणाली'
                    : 'Field Collection & Micro-Banking Portal'}
                </p>
              </div>
            </div>

            {/* Mobile Logout / Profile trigger */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                onClick={handleLogoutClick}
                id="mobile-logout-btn"
                className="p-1.5 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-800/80 hover:bg-rose-900 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Toolbar: Network, Sync, Schema, Role Badge & Logout */}
          <div className="flex items-center flex-wrap gap-2 justify-between lg:justify-end">
            {/* Online / Offline Simulator Toggle */}
            <button
              id="network-status-toggle"
              onClick={onToggleOnlineMode}
              title={
                isOnline
                  ? 'Active Online Connection (Tap to simulate Offline Field Mode)'
                  : 'Operating Offline in Field (Tap to go Online)'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isOnline
                  ? 'bg-emerald-800/80 text-emerald-100 border-emerald-500/50 hover:bg-emerald-700'
                  : 'bg-amber-600/90 text-amber-100 border-amber-400 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                  <span>अनलाइन</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-200" />
                  <span>फिल्ड अफलाइन</span>
                </>
              )}
            </button>

            {/* Sync Queue Button if items exist */}
            {pendingSyncCount > 0 && (
              <button
                id="sync-now-header-btn"
                onClick={onSync}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-400 text-emerald-950 shadow-md hover:bg-amber-300 transition-colors animate-bounce cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {lang === 'ne'
                    ? `${toNepaliNumerals(pendingSyncCount)} सिङ्क`
                    : `${pendingSyncCount} Sync`}
                </span>
              </button>
            )}

            {/* Supabase Schema / RLS Modal Button (Admin only or schema reference) */}
            <button
              id="supabase-sql-btn"
              onClick={onOpenSqlModal}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-800/70 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 transition-colors cursor-pointer"
              title="Supabase PostgreSQL Schema & RLS Policies"
            >
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Supabase RLS & SQL</span>
              <span className="sm:hidden">SQL</span>
            </button>

            {/* Language Switch */}
            <button
              id="lang-toggle-btn"
              onClick={onToggleLang}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-950/80 border border-emerald-700 text-emerald-200 hover:text-white cursor-pointer"
            >
              {lang === 'ne' ? 'EN' : 'नेपाली'}
            </button>

            {/* User Profile & Role Card with Logout */}
            <div className="flex items-center bg-emerald-950/95 border border-emerald-700/80 rounded-2xl p-1 gap-2">
              {/* Role Badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black ${
                  isAdmin
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isAdmin ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{lang === 'ne' ? 'प्रशासक (Admin)' : 'Admin'}</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{lang === 'ne' ? 'बजार प्रतिनिधि' : 'Agent'}</span>
                  </>
                )}
              </div>

              {/* User Switcher / Selector */}
              <div className="relative">
                <select
                  id="active-profile-select"
                  value={activeProfile.id}
                  onChange={(e) => {
                    const target = profiles.find((p) => p.id === e.target.value);
                    if (target) onSelectProfile(target);
                  }}
                  className="bg-transparent text-white text-xs font-extrabold outline-none cursor-pointer pr-1 py-1 max-w-[140px] sm:max-w-[200px] truncate"
                  title="Switch Active Operator"
                >
                  {profiles.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      className="bg-emerald-950 text-white py-1.5 font-medium"
                    >
                      {p.role === 'admin' ? '⭐ ' : '👤 '} {p.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Logout Button */}
              <button
                id="navbar-logout-btn"
                onClick={handleLogoutClick}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 transition-colors cursor-pointer"
                title={lang === 'ne' ? 'सुरक्षित लग-आउट' : 'Secure Logout'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'ne' ? 'लग-आउट' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Status Strip: Nepali Date, Assigned Ward/Area & Live Today's Collection Totals */}
        <div className="mt-2.5 pt-2 border-t border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          {/* Date & Assigned Area */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-emerald-950/90 px-2.5 py-0.5 rounded-lg text-amber-300 font-bold border border-emerald-800">
              आज: {formatBSToNepaliDate(nepaliDate.formattedBS)}
            </span>
            <span className="text-emerald-300 text-[11px] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span>कार्यक्षेत्र:</span>
              <strong className="text-white">
                {activeProfile.assigned_area || 'टिकापुर-१'}
              </strong>
            </span>
          </div>

          {/* Quick Summary Pill Widget */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="flex items-center gap-1 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-800/80">
              <ArrowDownRight className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 font-medium">
                {lang === 'ne' ? 'कुल सङ्कलन:' : 'Total Coll:'}
              </span>
              <span className="font-mono font-black text-white">
                {formatCurrencyNPR(agentDailyTotals.collected)}
              </span>
            </div>

            {agentDailyTotals.withdrawn > 0 && (
              <div className="flex items-center gap-1 bg-rose-950/80 px-2.5 py-0.5 rounded-lg border border-rose-900/60">
                <ArrowUpRight className="w-3 h-3 text-rose-400" />
                <span className="text-rose-300 font-medium">
                  {lang === 'ne' ? 'फिर्ता:' : 'Withdrawn:'}
                </span>
                <span className="font-mono font-black text-rose-200">
                  {formatCurrencyNPR(agentDailyTotals.withdrawn)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-900/60">
              <Wallet className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 font-medium">
                {lang === 'ne' ? 'खुद जम्मा:' : 'Net Vault:'}
              </span>
              <span className="font-mono font-black text-amber-200">
                {formatCurrencyNPR(agentDailyTotals.net)}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/80 text-emerald-300">
              <Receipt className="w-3 h-3" />
              <span>{toNepaliNumerals(agentDailyTotals.count)} भौचर</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
