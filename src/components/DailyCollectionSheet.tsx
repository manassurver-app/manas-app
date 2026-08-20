import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  ArrowDownRight,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Sparkles,
  Filter,
  User,
  Phone,
  MapPin,
  Send,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Account, Profile, Transaction } from '../types';
import {
  getCurrentNepaliDate,
  NEPALI_MONTHS,
  toNepaliNumerals,
  formatCurrencyNPR,
  formatBSToNepaliDate,
} from '../utils/nepaliCalendar';
import { exportDailyCollectionSheetToExcel, exportMonthlyCollectionMatrixToExcel } from '../utils/excel';
import { transformToMonthlyMatrix, exportMatrixToExcel } from '../utils/excelExportUtils';

interface DailyCollectionSheetProps {
  accounts: Account[];
  transactions: Transaction[];
  agent: Profile;
  onQuickDeposit: (account: Account, amount: number, nepaliDateBS: string, day: number, monthYear: string) => void;
  onOpenDetailedModal: (account: Account) => void;
  onViewReceipt: (tx: Transaction, account: Account) => void;
  lang: 'ne' | 'en';
}

export const DailyCollectionSheet: React.FC<DailyCollectionSheetProps> = ({
  accounts,
  transactions,
  agent,
  onQuickDeposit,
  onOpenDetailedModal,
  onViewReceipt,
  lang,
}) => {
  const currentDateInfo = getCurrentNepaliDate();
  const [selectedYear, setSelectedYear] = useState<number>(currentDateInfo.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDateInfo.month);
  const [selectedDay, setSelectedDay] = useState<number>(currentDateInfo.day);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'collected' | 'pending'>('all');
  const [quickAmount, setQuickAmount] = useState<number>(100);

  const monthObj = NEPALI_MONTHS[selectedMonth - 1] || NEPALI_MONTHS[3];
  const formattedNepaliDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const monthYearStr = `${monthObj.en} ${selectedYear}`;

  // Filter accounts strictly by assigned agent (if role is agent) or show all (if admin)
  const accessibleAccounts = useMemo(() => {
    if (agent.role === 'admin') {
      return accounts;
    }
    return accounts.filter((acc) => acc.assigned_agent_id === agent.id);
  }, [accounts, agent]);

  // Today's transactions map for the selected BS date
  const dailyTxMap = useMemo(() => {
    const map = new Map<string, Transaction>();
    transactions.forEach((tx) => {
      if (tx.nepali_date === formattedNepaliDate) {
        map.set(tx.account_id, tx);
      }
    });
    return map;
  }, [transactions, formattedNepaliDate]);

  // Filtered accounts list based on search and tab
  const filteredAccounts = useMemo(() => {
    return accessibleAccounts.filter((acc) => {
      const matchesSearch =
        acc.account_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.contact_number.includes(searchTerm) ||
        acc.address.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const hasCollected = dailyTxMap.has(acc.id);
      if (filterTab === 'collected') return hasCollected;
      if (filterTab === 'pending') return !hasCollected;
      return true;
    });
  }, [accessibleAccounts, searchTerm, filterTab, dailyTxMap]);

  // Metrics for the selected date
  const metrics = useMemo(() => {
    let totalDeposit = 0;
    let totalWithdrawal = 0;
    let collectedCount = 0;

    accessibleAccounts.forEach((acc) => {
      const tx = dailyTxMap.get(acc.id);
      if (tx) {
        if (tx.type === 'deposit') {
          totalDeposit += Number(tx.amount);
          collectedCount += 1;
        } else {
          totalWithdrawal += Number(tx.amount);
        }
      }
    });

    return {
      totalDeposit,
      totalWithdrawal,
      netCollection: totalDeposit - totalWithdrawal,
      collectedCount,
      totalCount: accessibleAccounts.length,
      pendingCount: Math.max(0, accessibleAccounts.length - collectedCount),
    };
  }, [accessibleAccounts, dailyTxMap]);

  const handleQuickCollectClick = (account: Account, amount: number) => {
    onQuickDeposit(account, amount, formattedNepaliDate, selectedDay, monthYearStr);
    try {
      confetti({
        particleCount: 28,
        spread: 55,
        origin: { y: 0.8 },
        colors: ['#16a34a', '#eab308', '#059669'],
      });
    } catch {
      // ignore
    }
  };

  const handleExportDailyExcel = () => {
    exportDailyCollectionSheetToExcel(accessibleAccounts, transactions, agent, formattedNepaliDate, monthYearStr);
  };

  const handleExportMonthlyMatrixExcel = () => {
    const result = transformToMonthlyMatrix(
      accessibleAccounts,
      transactions,
      agent,
      selectedMonth,
      selectedYear
    );
    exportMatrixToExcel(result);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Top Banner / Date & Collector Matrix Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                {lang === 'ne' ? 'दैनिक बचत संकलन सिट' : 'Daily Collection Ledger'}
              </span>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {formattedNepaliDate} ({formatBSToNepaliDate(formattedNepaliDate)})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {monthObj.ne} {toNepaliNumerals(selectedYear)} • गते {toNepaliNumerals(selectedDay)}
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              {lang === 'ne'
                ? `बजार प्रतिनिधि: ${agent.full_name} (${agent.assigned_area || 'टिकापुर-१'})`
                : `Assigned Collector: ${agent.full_name}`}
            </p>
          </div>

          {/* Month & Year quick selectors + Excel Export */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="collection-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 outline-none hover:bg-slate-200"
            >
              <option value={2081}>२०८१ (2081 BS)</option>
              <option value={2082}>२०८२ (2082 BS)</option>
              <option value={2083}>२०८३ (2083 BS)</option>
              <option value={2084}>२०८४ (2084 BS)</option>
            </select>

            <select
              id="collection-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none hover:bg-slate-200"
            >
              {NEPALI_MONTHS.map((m) => (
                <option key={m.index} value={m.index}>
                  {m.ne} ({m.en})
                </option>
              ))}
            </select>

            {/* Excel Exports */}
            <button
              id="export-daily-excel-btn"
              onClick={handleExportDailyExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              title="Export formatted Excel sheet for this day"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{lang === 'ne' ? 'दैनिक Excel सिट' : 'Daily Excel'}</span>
            </button>

            <button
              id="export-monthly-excel-btn"
              onClick={handleExportMonthlyMatrixExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              title="Export 1-32 days matrix for entire month"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === 'ne' ? 'मासिक म्याट्रिक्स' : 'Monthly Matrix'}</span>
            </button>
          </div>
        </div>

        {/* Days of Month Horizontal Selector (1 to 32) */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              {lang === 'ne' ? 'गते छनोट गर्नुहोस् (Select Day 1-32):' : 'Select Day of Nepali Month:'}
            </span>
            <button
              onClick={() => setSelectedDay(currentDateInfo.day)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
            >
              {lang === 'ne' ? 'आजको गतेमा जानुहोस्' : 'Go to Today'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
            {Array.from({ length: monthObj.days }, (_, i) => i + 1).map((d) => {
              const isSelected = d === selectedDay;
              const isToday = d === currentDateInfo.day && selectedMonth === currentDateInfo.month && selectedYear === currentDateInfo.year;

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`min-w-[42px] py-1.5 px-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-900 text-white shadow-md scale-105 border-2 border-amber-400'
                      : isToday
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span className="text-[10px] opacity-75">{d}</span>
                  <span className="text-xs">{toNepaliNumerals(d)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-900 to-green-800 text-white p-3.5 rounded-2xl shadow-xs border border-emerald-700">
          <span className="text-[11px] text-emerald-200 font-semibold block">
            {lang === 'ne' ? 'आजको कुल संकलन' : "Today's Collection"}
          </span>
          <p className="text-xl sm:text-2xl font-black mt-0.5 tracking-tight font-mono">
            {formatCurrencyNPR(metrics.totalDeposit)}
          </p>
          <span className="text-[10px] text-emerald-200/80 mt-1 block">
            {metrics.collectedCount} सदस्यबाट जम्मा
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold block">
            {lang === 'ne' ? 'संकलन सम्पन्न खाता' : 'Collected Accounts'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5 tracking-tight font-mono">
            {toNepaliNumerals(metrics.collectedCount)} / {toNepaliNumerals(metrics.totalCount)}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${metrics.totalCount > 0 ? (metrics.collectedCount / metrics.totalCount) * 100 : 0}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold block">
            {lang === 'ne' ? 'बाँकी खाताहरू' : 'Pending Members'}
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5 tracking-tight font-mono">
            {toNepaliNumerals(metrics.pendingCount)}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {lang === 'ne' ? 'आज संकलन गर्न बाँकी' : 'Waiting for field visit'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
          <span className="text-[11px] text-slate-500 font-semibold block">
            {lang === 'ne' ? 'रकम भुक्तानी' : "Today's Withdrawals"}
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5 tracking-tight font-mono">
            {formatCurrencyNPR(metrics.totalWithdrawal)}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {lang === 'ne' ? 'सदस्यलाई दिएको रकम' : 'Field payouts'}
          </span>
        </div>
      </div>

      {/* Search, Filter & Quick Amount Presets */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-accounts-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'ne' ? 'खाता नं., सदस्यको नाम, ठेगाना वा फोन नं. खोज्नुहोस्...' : 'Search by A/C No, Name, Phone...'}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'ne' ? `सबै (${toNepaliNumerals(accessibleAccounts.length)})` : `All (${accessibleAccounts.length})`}
            </button>
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              {lang === 'ne' ? `बाँकी (${toNepaliNumerals(metrics.pendingCount)})` : `Pending (${metrics.pendingCount})`}
            </button>
            <button
              onClick={() => setFilterTab('collected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterTab === 'collected'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              {lang === 'ne' ? `जम्मा भएको (${toNepaliNumerals(metrics.collectedCount)})` : `Collected (${metrics.collectedCount})`}
            </button>
          </div>
        </div>

        {/* Quick Deposit Preset Amount Selector for fast field collection */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-600 font-bold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            {lang === 'ne' ? 'द्रुत जम्मा दर (1-Tap Fast Collect):' : 'Fast Collect Default:'}
          </span>
          {[50, 100, 200, 300, 500, 1000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setQuickAmount(amt)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                quickAmount === amt
                  ? 'bg-amber-400 text-emerald-950 border-amber-500 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              रु. {amt}
            </button>
          ))}
        </div>
      </div>

      {/* Member Cards / Collection List */}
      <div className="space-y-2.5">
        {filteredAccounts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {lang === 'ne' ? 'कुनै सदस्य खाता भेटिएन।' : 'No member accounts found.'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'ne' ? 'खोज शब्द बदल्नुहोस् वा नयाँ खाता थप्नुहोस्।' : 'Try another search query or add a new account.'}
            </p>
          </div>
        ) : (
          filteredAccounts.map((account) => {
            const todayTx = dailyTxMap.get(account.id);
            const isCollected = Boolean(todayTx);

            return (
              <div
                key={account.id}
                id={`account-card-${account.account_no}`}
                className={`bg-white rounded-2xl p-4 border transition-all hover:shadow-md ${
                  isCollected
                    ? 'border-emerald-300/80 bg-emerald-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Member Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                        isCollected
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isCollected ? <CheckCircle2 className="w-5 h-5" /> : account.account_no.slice(-3)}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-xs px-2 py-0.5 bg-slate-100 rounded text-emerald-950 border border-slate-200">
                          {account.account_no}
                        </span>
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                          {account.name}
                        </h4>
                        {isCollected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            {lang === 'ne' ? 'आज जम्मा भयो' : 'Collected'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {account.address}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {account.contact_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Balances & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        {lang === 'ne' ? 'कुल मौज्दात (Balance)' : 'Current Balance'}
                      </span>
                      <p className="font-black text-sm sm:text-base text-slate-900 font-mono">
                        {formatCurrencyNPR(account.current_balance)}
                      </p>
                      {todayTx && (
                        <span className="text-[11px] font-bold text-emerald-700 block">
                          +{formatCurrencyNPR(todayTx.amount)} (गते {toNepaliNumerals(todayTx.day_number)})
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Quick Deposit button */}
                      <button
                        id={`quick-deposit-btn-${account.account_no}`}
                        onClick={() => handleQuickCollectClick(account, quickAmount)}
                        className="flex items-center gap-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-all"
                        title={`Quick deposit Rs. ${quickAmount} for today`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+रू {quickAmount}</span>
                      </button>

                      {/* Open Custom Amount / Detailed Modal */}
                      <button
                        id={`open-custom-deposit-${account.account_no}`}
                        onClick={() => onOpenDetailedModal(account)}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
                        title="Custom amount or withdrawal"
                      >
                        {lang === 'ne' ? 'अन्य रकम' : 'Custom'}
                      </button>

                      {/* View Receipt if already collected */}
                      {todayTx && (
                        <button
                          id={`view-receipt-${account.account_no}`}
                          onClick={() => onViewReceipt(todayTx, account)}
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl transition-colors"
                          title="View & print thermal receipt / SMS"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
