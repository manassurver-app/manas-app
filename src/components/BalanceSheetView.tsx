import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Calendar,
  Building2,
  Users,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Download,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Award,
  Layers,
  Search,
} from 'lucide-react';
import { Account, Profile, Transaction } from '../types';
import {
  NEPALI_MONTHS,
  getCurrentNepaliDate,
  toNepaliNumerals,
  formatCurrencyNPR,
  formatBSToNepaliDate,
} from '../utils/nepaliCalendar';
import * as XLSX from 'xlsx';

interface BalanceSheetViewProps {
  accounts: Account[];
  transactions: Transaction[];
  profiles: Profile[];
  activeProfile: Profile;
  lang: 'ne' | 'en';
}

export const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({
  accounts,
  transactions,
  profiles,
  activeProfile,
  lang,
}) => {
  const nepaliDate = getCurrentNepaliDate();

  // Mode: 'aggregate' (System-wide) or 'agent' (Agent-specific)
  const [viewMode, setViewMode] = useState<'aggregate' | 'agent'>('aggregate');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    activeProfile.role === 'admin' ? 'all' : activeProfile.id
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(nepaliDate.month);
  const [selectedYear, setSelectedYear] = useState<number>(nepaliDate.year);
  const [filterDateStr, setFilterDateStr] = useState<string>(''); // specific date filter e.g. 2083-04-15
  const [searchAccountQuery, setSearchAccountQuery] = useState<string>('');

  const monthObj = NEPALI_MONTHS[selectedMonth - 1] || NEPALI_MONTHS[3];
  const monthYearStr = `${monthObj.en} ${selectedYear}`;

  const agents = useMemo(() => {
    return profiles.filter((p) => p.status === 'active');
  }, [profiles]);

  // Filter transactions based on selection
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Agent filter
      if (viewMode === 'agent' && selectedAgentId !== 'all') {
        if (tx.agent_id !== selectedAgentId) return false;
      }

      // Date or Month filter
      if (filterDateStr) {
        return tx.nepali_date === filterDateStr;
      }

      // Match month and year
      const txMonth = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[1], 10) : 0;
      const txYear = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[0], 10) : 0;

      return (
        tx.month_year === monthYearStr ||
        (txMonth === selectedMonth && txYear === selectedYear)
      );
    });
  }, [transactions, viewMode, selectedAgentId, filterDateStr, monthYearStr, selectedMonth, selectedYear]);

  // Filter accounts based on selection
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (viewMode === 'agent' && selectedAgentId !== 'all') {
        if (acc.assigned_agent_id !== selectedAgentId) return false;
      }
      if (searchAccountQuery) {
        const q = searchAccountQuery.toLowerCase();
        return (
          acc.name.toLowerCase().includes(q) ||
          acc.account_no.toLowerCase().includes(q) ||
          acc.phone.includes(q)
        );
      }
      return true;
    });
  }, [accounts, viewMode, selectedAgentId, searchAccountQuery]);

  // System-wide calculations
  const totalBalanceAllAccounts = useMemo(() => {
    return filteredAccounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  }, [filteredAccounts]);

  const totalPeriodDeposits = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalPeriodWithdrawals = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const netPeriodCashFlow = totalPeriodDeposits - totalPeriodWithdrawals;

  // Agent Wise Breakdown
  const agentWiseBreakdown = useMemo(() => {
    return agents.map((agent) => {
      const agentAccs = accounts.filter((a) => a.assigned_agent_id === agent.id && a.status === 'active');
      const agentTxs = transactions.filter((t) => {
        const txMonth = t.nepali_date ? parseInt(t.nepali_date.split('-')[1], 10) : 0;
        const txYear = t.nepali_date ? parseInt(t.nepali_date.split('-')[0], 10) : 0;
        const matchMonth =
          t.month_year === monthYearStr || (txMonth === selectedMonth && txYear === selectedYear);
        return t.agent_id === agent.id && matchMonth;
      });

      const deposits = agentTxs
        .filter((t) => t.type === 'deposit')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

      const withdrawals = agentTxs
        .filter((t) => t.type === 'withdraw')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

      const totalAccBalance = agentAccs.reduce((s, a) => s + (Number(a.balance) || 0), 0);

      // Today's deposit
      const todayDateStr = nepaliDate.formattedBS;
      const todayDeposits = transactions
        .filter((t) => t.agent_id === agent.id && t.type === 'deposit' && t.nepali_date === todayDateStr)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);

      return {
        agent,
        accountCount: agentAccs.length,
        totalBalance: totalAccBalance,
        depositsMonth: deposits,
        withdrawalsMonth: withdrawals,
        netMonth: deposits - withdrawals,
        todayDeposits,
        txCount: agentTxs.length,
      };
    });
  }, [agents, accounts, transactions, monthYearStr, selectedMonth, selectedYear, nepaliDate.formattedBS]);

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Export Summary to Excel
  const handleExportSummaryExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summarySheetData = [
      ['मानस कृषि सहकारी संस्था लि. (Manas Krishi Sahakari Ltd.)'],
      ['टिकापुर-१, कैलाली, नेपाल | दर्ता नं: ४०३/०६८/०६९'],
      ['आर्थिक वासलात तथा संकलन विवरण (Financial Balance Sheet & Collection Report)'],
      [`अवधि: ${monthObj.ne} ${selectedYear} (${monthYearStr})`],
      [''],
      ['क्र.सं.', 'विवरण (Particulars)', 'रकम (NPR) / गणना'],
      ['१', 'कुल सदस्य बचत मौज्दात (Total Member Savings Balance)', totalBalanceAllAccounts],
      ['२', 'यस महिनाको कुल संकलन / जम्मा (Period Total Deposits)', totalPeriodDeposits],
      ['३', 'यस महिनाको कुल भुक्तानी / फिर्ता (Period Total Withdrawals)', totalPeriodWithdrawals],
      ['४', 'खुद संकलन प्रवाह (Net Cash Collection Flow)', netPeriodCashFlow],
      ['५', 'सक्रिय बचत खाता संख्या (Active Savings Accounts)', filteredAccounts.length],
      ['६', 'कुल कारोबार संख्या (Total Transactions)', filteredTransactions.length],
      [''],
      ['बजार प्रतिनिधि अनुसार विवरण (Agent-wise Performance):'],
      ['क्र.सं.', 'बजार प्रतिनिधिको नाम', 'सक्रिय खाता', 'आजको संकलन', 'महिनाको संकलन', 'महिनाको फिर्ता', 'खुद संकलन', 'कुल मौज्दात'],
      ...agentWiseBreakdown.map((row, idx) => [
        idx + 1,
        row.agent.full_name,
        row.accountCount,
        row.todayDeposits,
        row.depositsMonth,
        row.withdrawalsMonth,
        row.netMonth,
        row.totalBalance,
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(summarySheetData);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 32 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Balance Sheet');
    XLSX.writeFile(workbook, `Manas_Coop_Balance_Sheet_${monthObj.en}_${selectedYear}.xlsx`);
  };

  const currentSelectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-6">
      {/* Action and Filter Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-black shadow-md">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {lang === 'ne'
                  ? 'वित्तीय प्रतिवेदन तथा वासलात (Balance Sheet & Financial Reports)'
                  : 'Financial Reporting & Balance Sheet'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'ne'
                  ? 'संस्थाको कुल बचत, निक्षेप संकलन, फिर्ता भुक्तानी र प्रतिनिधि अनुसार हिसाब-किताब'
                  : 'Aggregate cooperative balance sheet, daily deposits, withdrawals, and agent-wise vaults'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-print-balance-sheet"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-extrabold transition-colors cursor-pointer border border-slate-300 shadow-2xs"
            >
              <Printer className="w-4 h-4 text-emerald-800" />
              <span>प्रिन्ट / PDF सेभ</span>
            </button>

            <button
              type="button"
              id="btn-export-balance-sheet-excel"
              onClick={handleExportSummaryExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-extrabold transition-colors cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Excel Export</span>
            </button>
          </div>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              प्रतिवेदन ढाँचा (Report Mode)
            </label>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setViewMode('aggregate');
                  setSelectedAgentId('all');
                }}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'aggregate'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                कुल एकीकृत (Aggregate)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agent')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  viewMode === 'agent'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                प्रतिनिधि अनुसार (Agent)
              </button>
            </div>
          </div>

          {/* Agent Filter */}
          {viewMode === 'agent' && (
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                बजार प्रतिनिधि छान्नुहोस्
              </label>
              <select
                id="balance-sheet-agent-select"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                <option value="all">सबै प्रतिनिधिहरू (All Agents Summary)</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.full_name} ({ag.assigned_area || 'टिकापुर'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              महिना (Nepali Month)
            </label>
            <select
              id="balance-sheet-month-select"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(parseInt(e.target.value, 10));
                setFilterDateStr('');
              }}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            >
              {NEPALI_MONTHS.map((m) => (
                <option key={m.index} value={m.index}>
                  {m.ne} ({m.en})
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              वर्ष (Nepali Year BS)
            </label>
            <select
              id="balance-sheet-year-select"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value, 10));
                setFilterDateStr('');
              }}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            >
              {[2080, 2081, 2082, 2083, 2084, 2085].map((yr) => (
                <option key={yr} value={yr}>
                  {toNepaliNumerals(yr)} वि.सं. ({yr} BS)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* High-Level Executive Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Savings Balance */}
        <div className="bg-emerald-950 text-white rounded-3xl p-5 shadow-sm border border-emerald-900 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-24 h-24 bg-emerald-800/40 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-2">
            <span>कुल सदस्य बचत मौज्दात</span>
            <Wallet className="w-5 h-5 text-amber-300" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white mb-1">
            {formatCurrencyNPR(totalBalanceAllAccounts)}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {toNepaliNumerals(filteredAccounts.length)} सक्रिय बचत खाताहरू
          </div>
        </div>

        {/* Card 2: Period Total Deposits */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>यस महिनाको कुल संकलन</span>
            <ArrowDownRight className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-950 mb-1">
            {formatCurrencyNPR(totalPeriodDeposits)}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{toNepaliNumerals(filteredTransactions.filter((t) => t.type === 'deposit').length)} पटक संकलन</span>
          </div>
        </div>

        {/* Card 3: Period Total Withdrawals */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>यस महिनाको कुल भुक्तानी / फिर्ता</span>
            <ArrowUpRight className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-amber-950 mb-1">
            {formatCurrencyNPR(totalPeriodWithdrawals)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {toNepaliNumerals(filteredTransactions.filter((t) => t.type === 'withdraw').length)} पटक फिर्ता
          </div>
        </div>

        {/* Card 4: Net Cash Flow */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>खुद बचत प्रवाह (Net Flow)</span>
            <TrendingUp className="w-5 h-5 text-emerald-700" />
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-900 mb-1">
            {formatCurrencyNPR(netPeriodCashFlow)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {monthObj.ne} {toNepaliNumerals(selectedYear)} को खुद मौज्दात
          </div>
        </div>
      </div>

      {/* Agent-Wise Performance Table & Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              बजार प्रतिनिधि अनुसार वासलात तथा संकलन विवरण
            </h3>
            <p className="text-xs text-slate-500">
              प्रत्येक प्रतिनिधिको सक्रिय खाता संख्या, आजको संकलन र महिनाको कुल हिसाब
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            {toNepaliNumerals(agentWiseBreakdown.length)} प्रतिनिधिहरू
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 text-center w-12">क्र.सं.</th>
                <th className="p-3">प्रतिनिधिको नाम (Agent)</th>
                <th className="p-3 text-center">कार्य क्षेत्र</th>
                <th className="p-3 text-center">सक्रिय खाता</th>
                <th className="p-3 text-right">आजको संकलन</th>
                <th className="p-3 text-right">महिनाको कुल संकलन</th>
                <th className="p-3 text-right">महिनाको फिर्ता</th>
                <th className="p-3 text-right">खुद संकलन</th>
                <th className="p-3 text-right font-mono bg-emerald-50 text-emerald-950 font-black">
                  कुल मौज्दात (Total Balance)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentWiseBreakdown.map((row, index) => (
                <tr key={row.agent.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 text-center font-mono text-slate-500">{index + 1}</td>
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-[11px]">
                      {row.agent.full_name.charAt(0)}
                    </div>
                    <div>
                      <span>{row.agent.full_name}</span>
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {row.agent.phone}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-slate-600 font-medium">
                    {row.agent.assigned_area || 'टिकापुर बजार'}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-slate-800">
                    {toNepaliNumerals(row.accountCount)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-800">
                    {formatCurrencyNPR(row.todayDeposits)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-950">
                    {formatCurrencyNPR(row.depositsMonth)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-800">
                    {formatCurrencyNPR(row.withdrawalsMonth)}
                  </td>
                  <td className="p-3 text-right font-mono font-extrabold text-emerald-900">
                    {formatCurrencyNPR(row.netMonth)}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/50">
                    {formatCurrencyNPR(row.totalBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td colSpan={3} className="p-3 text-right uppercase tracking-wider">
                  कुल जम्मा (GRAND TOTAL):
                </td>
                <td className="p-3 text-center font-mono">
                  {toNepaliNumerals(
                    agentWiseBreakdown.reduce((s, r) => s + r.accountCount, 0)
                  )}
                </td>
                <td className="p-3 text-right font-mono text-emerald-800">
                  {formatCurrencyNPR(
                    agentWiseBreakdown.reduce((s, r) => s + r.todayDeposits, 0)
                  )}
                </td>
                <td className="p-3 text-right font-mono text-emerald-950">
                  {formatCurrencyNPR(
                    agentWiseBreakdown.reduce((s, r) => s + r.depositsMonth, 0)
                  )}
                </td>
                <td className="p-3 text-right font-mono text-amber-800">
                  {formatCurrencyNPR(
                    agentWiseBreakdown.reduce((s, r) => s + r.withdrawalsMonth, 0)
                  )}
                </td>
                <td className="p-3 text-right font-mono text-emerald-900">
                  {formatCurrencyNPR(
                    agentWiseBreakdown.reduce((s, r) => s + r.netMonth, 0)
                  )}
                </td>
                <td className="p-3 text-right font-mono text-emerald-950 bg-amber-200">
                  {formatCurrencyNPR(totalBalanceAllAccounts)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PRINTABLE REPORT CONTAINER (Active when printing or visible on preview) */}
      <div
        id="printable-balance-sheet-area"
        className="hidden print:block bg-white p-8 space-y-6 text-black"
      >
        {/* Printable Header */}
        <div className="text-center border-b-2 border-black pb-4 space-y-1">
          <h1 className="text-xl font-black tracking-wide">
            मानस कृषि सहकारी संस्था लि.
          </h1>
          <p className="text-xs font-semibold">
            Manas Krishi Sahakari Limited | टिकापुर-१, कैलाली
          </p>
          <p className="text-[11px]">दर्ता नं: ४०३/०६८/०६९ | पान नं: ३००७६२४५१</p>
          <div className="mt-2 inline-block px-4 py-1 bg-gray-200 border border-black font-black text-xs uppercase">
            {viewMode === 'agent' && selectedAgentId !== 'all' && currentSelectedAgent
              ? `${currentSelectedAgent.full_name} - मासिक बचत तथा संकलन वासलात`
              : 'संस्थागत एकीकृत मासिक वासलात तथा संकलन विवरण'}
          </div>
          <div className="flex justify-between text-[11px] pt-2 font-mono">
            <span>अवधि: {monthObj.ne} {selectedYear} ({monthYearStr})</span>
            <span>प्रतिवेदन मिति: {nepaliDate.formattedBS} वि.सं.</span>
          </div>
        </div>

        {/* High level figures table */}
        <table className="w-full text-xs border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">विवरण (Particulars)</th>
              <th className="border border-black p-2 text-right">रकम (NPR) / विवरण</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 font-bold">कुल सदस्य बचत मौज्दात (Total Savings Balance)</td>
              <td className="border border-black p-2 text-right font-mono font-black">{formatCurrencyNPR(totalBalanceAllAccounts)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">यस महिनाको कुल निक्षेप संकलन (Total Deposits)</td>
              <td className="border border-black p-2 text-right font-mono">{formatCurrencyNPR(totalPeriodDeposits)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">यस महिनाको कुल फिर्ता भुक्तानी (Total Withdrawals)</td>
              <td className="border border-black p-2 text-right font-mono">{formatCurrencyNPR(totalPeriodWithdrawals)}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-black p-2 font-bold">खुद बचत प्रवाह (Net Cash Inflow)</td>
              <td className="border border-black p-2 text-right font-mono font-black">{formatCurrencyNPR(netPeriodCashFlow)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">सक्रिय बचत खाता संख्या (Active Accounts)</td>
              <td className="border border-black p-2 text-right font-mono">{filteredAccounts.length} जना</td>
            </tr>
          </tbody>
        </table>

        {/* Agent Wise Breakdown Table */}
        <div className="space-y-2 pt-4">
          <h4 className="text-xs font-black uppercase">बजार प्रतिनिधि अनुसार संकलन सारांश:</h4>
          <table className="w-full text-[11px] border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1.5 text-center">क्र.सं.</th>
                <th className="border border-black p-1.5 text-left">प्रतिनिधिको नाम</th>
                <th className="border border-black p-1.5 text-center">सक्रिय खाता</th>
                <th className="border border-black p-1.5 text-right">महिनाको संकलन</th>
                <th className="border border-black p-1.5 text-right">महिनाको फिर्ता</th>
                <th className="border border-black p-1.5 text-right">कुल बचत मौज्दात</th>
              </tr>
            </thead>
            <tbody>
              {agentWiseBreakdown.map((r, i) => (
                <tr key={r.agent.id}>
                  <td className="border border-black p-1.5 text-center font-mono">{i + 1}</td>
                  <td className="border border-black p-1.5 font-bold">{r.agent.full_name}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{r.accountCount}</td>
                  <td className="border border-black p-1.5 text-right font-mono">{formatCurrencyNPR(r.depositsMonth)}</td>
                  <td className="border border-black p-1.5 text-right font-mono">{formatCurrencyNPR(r.withdrawalsMonth)}</td>
                  <td className="border border-black p-1.5 text-right font-mono font-bold">{formatCurrencyNPR(r.totalBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Official Cooperative Signatures */}
        <div className="grid grid-cols-3 gap-8 pt-16 text-center text-xs">
          <div className="border-t border-black pt-2">
            <p className="font-bold">तयार गर्ने (Prepared By)</p>
            <p className="text-[10px] text-gray-600">बजार प्रतिनिधि / कम्प्युटर अपरेटर</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">जाँच गर्ने (Checked By)</p>
            <p className="text-[10px] text-gray-600">लेखापाल / लेखा अधिकृत</p>
          </div>
          <div className="border-t border-black pt-2">
            <p className="font-bold">प्रमाणित गर्ने (Approved By)</p>
            <p className="text-[10px] text-gray-600">कार्यकारी व्यवस्थापक / अध्यक्ष</p>
          </div>
        </div>
      </div>
    </div>
  );
};
