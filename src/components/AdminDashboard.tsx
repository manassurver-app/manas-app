import React, { useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ShieldCheck,
  Building2,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  CheckCircle2,
  Award,
  Layers,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Account, Profile, Transaction } from '../types';
import { formatCurrencyNPR, getCurrentNepaliDate, toNepaliNumerals, formatBSToNepaliDate } from '../utils/nepaliCalendar';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  profiles: Profile[];
  lang: 'ne' | 'en';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  accounts,
  transactions,
  profiles,
  lang,
}) => {
  const nepaliDate = getCurrentNepaliDate();

  // Summary Metrics
  const summary = useMemo(() => {
    const totalSavingsPool = accounts.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);
    const totalAccounts = accounts.length;

    // Today's stats
    const todayTxs = transactions.filter((tx) => tx.nepali_date === nepaliDate.formattedBS);
    const todayDeposit = todayTxs
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const todayWithdrawal = todayTxs
      .filter((t) => t.type === 'withdrawal')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // This Month's stats
    const monthTxs = transactions.filter((tx) => tx.month_year === nepaliDate.monthYearString);
    const monthDeposit = monthTxs
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      totalSavingsPool,
      totalAccounts,
      todayDeposit,
      todayWithdrawal,
      todayTxCount: todayTxs.length,
      monthDeposit,
    };
  }, [accounts, transactions, nepaliDate]);

  // Agent Performance Breakdown
  const agentStats = useMemo(() => {
    const agents = profiles.filter((p) => p.role === 'agent');

    return agents.map((agent) => {
      const assignedAccounts = accounts.filter((acc) => acc.assigned_agent_id === agent.id);
      const totalAgentSavings = assignedAccounts.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);

      const agentTodayTxs = transactions.filter(
        (tx) => tx.agent_id === agent.id && tx.nepali_date === nepaliDate.formattedBS && tx.type === 'deposit'
      );
      const todayCollection = agentTodayTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const totalCollectionAllTime = transactions
        .filter((tx) => tx.agent_id === agent.id && tx.type === 'deposit')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      return {
        agent,
        assignedAccountsCount: assignedAccounts.length,
        totalAgentSavings,
        todayCollection,
        todayCollectionsCount: agentTodayTxs.length,
        totalCollectionAllTime,
      };
    });
  }, [profiles, accounts, transactions, nepaliDate]);

  const handleExportAdminSummaryExcel = () => {
    const rows = [
      ['मानस कृषि सहकारी संस्था लिमिटेड, टिकापुर-१, कैलाली'],
      ['केन्द्रीय व्यवस्थापक प्रतिवेदन (Admin Executive Collection Report)'],
      [`मिति (Date): ${nepaliDate.formattedBS} (${nepaliDate.monthYearString})`],
      [],
      ['सूचक (KPI Metrics)', 'रकम / संख्या (Value)'],
      ['सहकारी कुल बचत मौज्दात (Total Savings Pool)', summary.totalSavingsPool],
      ['कुल सक्रिय सदस्य खाता संख्या (Total Active Accounts)', summary.totalAccounts],
      ['आजको कुल बचत संकलन (Today Collection)', summary.todayDeposit],
      ['आजको भुक्तानी रकम (Today Withdrawals)', summary.todayWithdrawal],
      ['यस महिनाको संकलन (This Month Total)', summary.monthDeposit],
      [],
      ['बजार प्रतिनिधि अनुसार कार्यसम्पादन विवरण (Agent Performance Breakdown)'],
      ['क्र.सं.', 'प्रतिनिधिको नाम', 'कार्यक्षेत्र', 'जिम्मा खाता संख्या', 'आजको संकलन रु.', 'कुल संकलित बचत रु.'],
    ];

    agentStats.forEach((stat, idx) => {
      rows.push([
        idx + 1,
        stat.agent.full_name,
        stat.agent.assigned_area || 'Tikapur-1',
        stat.assignedAccountsCount,
        stat.todayCollection,
        stat.totalCollectionAllTime,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Executive_Report');
    XLSX.writeFile(wb, `Manas_Admin_Summary_${nepaliDate.formattedBS}.xlsx`);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Executive Welcome & Top Summary */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-green-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-emerald-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-400 text-emerald-950 shadow">
                केन्द्रीय व्यवस्थापन प्यानल (Admin Hub)
              </span>
              <span className="text-xs text-emerald-200">
                {nepaliDate.monthYearString} | मिति: {nepaliDate.formattedBS}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              मानस कृषि सहकारी संस्था लि.
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/90 max-w-xl mt-1">
              टिकापुर-१, कैलाली • बजार प्रतिनिधि कार्यसम्पादन तथा दैनिक बचत संकलन अनुगमन
            </p>
          </div>

          <button
            id="export-admin-excel-btn"
            onClick={handleExportAdminSummaryExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>कार्यकारी Excel प्रतिवेदन</span>
          </button>
        </div>

        {/* Big numbers cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-emerald-800/60">
          <div className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700/50 backdrop-blur-xs">
            <span className="text-xs text-emerald-300 font-semibold block">
              सहकारी कुल बचत मौज्दात (Total Savings Pool)
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1 font-mono text-amber-300">
              {formatCurrencyNPR(summary.totalSavingsPool)}
            </p>
            <span className="text-[11px] text-emerald-200/80 mt-1 block">
              {toNepaliNumerals(summary.totalAccounts)} सक्रिय सदस्य खाताहरू
            </span>
          </div>

          <div className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700/50 backdrop-blur-xs">
            <span className="text-xs text-emerald-300 font-semibold block">
              आजको कुल फिल्ड संकलन (Today's Collections)
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1 font-mono text-white">
              {formatCurrencyNPR(summary.todayDeposit)}
            </p>
            <span className="text-[11px] text-emerald-200/80 mt-1 block">
              {toNepaliNumerals(summary.todayTxCount)} वटा कारोबार सम्पन्न
            </span>
          </div>

          <div className="bg-emerald-900/60 p-4 rounded-2xl border border-emerald-700/50 backdrop-blur-xs">
            <span className="text-xs text-emerald-300 font-semibold block">
              {nepaliDate.monthNameNe} महिनाको कुल संकलन
            </span>
            <p className="text-2xl sm:text-3xl font-black mt-1 font-mono text-emerald-300">
              {formatCurrencyNPR(summary.monthDeposit)}
            </p>
            <span className="text-[11px] text-emerald-200/80 mt-1 block">
              {nepaliDate.monthYearString} अवधि
            </span>
          </div>
        </div>
      </div>

      {/* Field Agents (Bajar Pratinidhi) Performance Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>बजार प्रतिनिधि कार्यसम्पादन (Field Collectors Performance)</span>
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {toNepaliNumerals(agentStats.length)} प्रतिनिधि सक्रिय
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentStats.map((stat, index) => {
            return (
              <div
                key={stat.agent.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-lg border border-emerald-200 shadow-xs">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">
                        {stat.agent.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-700" />
                        {stat.agent.assigned_area}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {stat.assignedAccountsCount} खाता जिम्मा
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">आजको संकलन:</span>
                    <span className="font-black text-sm text-emerald-900 font-mono">
                      {formatCurrencyNPR(stat.todayCollection)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ({stat.todayCollectionsCount} सदस्यबाट जम्मा)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">कुल संकलित मौज्दात:</span>
                    <span className="font-black text-sm text-slate-900 font-mono">
                      {formatCurrencyNPR(stat.totalAgentSavings)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      (जिम्मा खाताहरूको जम्मा)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Field Transactions Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              हालैका फिल्ड कारोबारहरू (Live Audit Ledger)
            </h3>
            <p className="text-xs text-slate-500">
              सम्पूर्ण प्रतिनिधिहरूद्वारा गरिएको कारोबारहरूको विवरण
            </p>
          </div>
          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700">
            कुल: {toNepaliNumerals(transactions.length)} कारोबार
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="px-3 py-2.5">मिति (BS)</th>
                <th className="px-3 py-2.5">खाता नं.</th>
                <th className="px-3 py-2.5">सदस्यको नाम</th>
                <th className="px-3 py-2.5">प्रकार</th>
                <th className="px-3 py-2.5 text-right">रकम रु.</th>
                <th className="px-3 py-2.5">बजार प्रतिनिधि</th>
                <th className="px-3 py-2.5">स्थिति</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 10).map((tx) => {
                const acc = accounts.find((a) => a.id === tx.account_id);
                const agent = profiles.find((p) => p.id === tx.agent_id);
                const isDeposit = tx.type === 'deposit';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-700">
                      {tx.nepali_date} (गते {toNepaliNumerals(tx.day_number)})
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-950">
                      {acc?.account_no || 'Unknown'}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {acc?.name || 'Unknown'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isDeposit ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        {isDeposit ? 'जम्मा' : 'भुक्तानी'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-slate-900">
                      {formatCurrencyNPR(tx.amount)}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {agent?.full_name?.split(' ')[0] || 'Agent'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.sync_status === 'synced' ? 'दर्ता भएको' : 'स्थानीय'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
