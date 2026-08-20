import React, { useMemo, useState } from 'react';
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
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  UserCheck,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { Account, Profile, Transaction } from '../types';
import {
  formatCurrencyNPR,
  getCurrentNepaliDate,
  toNepaliNumerals,
  formatBSToNepaliDate,
  NEPALI_MONTHS,
} from '../utils/nepaliCalendar';
import { transformToMonthlyMatrix, exportMatrixToExcel } from '../utils/excelExportUtils';
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
  const [selectedChartMonth, setSelectedChartMonth] = useState<number>(nepaliDate.month);
  const [selectedChartYear, setSelectedChartYear] = useState<number>(nepaliDate.year);

  const monthObj = NEPALI_MONTHS[selectedChartMonth - 1] || NEPALI_MONTHS[3];
  const chartMonthYearStr = `${monthObj.en} ${selectedChartYear}`;

  // Summary Metrics
  const summary = useMemo(() => {
    const totalSavingsPool = accounts.reduce(
      (sum, acc) => sum + Number(acc.balance || 0),
      0
    );
    const activeAccountsCount = accounts.filter((a) => a.status === 'active').length;
    const activeAgentsCount = profiles.filter((p) => p.role === 'agent' && p.status === 'active').length;

    // Today's stats
    const todayDateStr = nepaliDate.formattedBS;
    const todayTxs = transactions.filter((tx) => tx.nepali_date === todayDateStr);
    const todayDeposit = todayTxs
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const todayWithdrawal = todayTxs
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Selected Month's stats
    const monthTxs = transactions.filter((tx) => {
      const txMonth = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[1], 10) : 0;
      const txYear = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[0], 10) : 0;
      return (
        tx.month_year === chartMonthYearStr ||
        (txMonth === selectedChartMonth && txYear === selectedChartYear)
      );
    });

    const monthDeposit = monthTxs
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const monthWithdrawal = monthTxs
      .filter((t) => t.type === 'withdraw')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      totalSavingsPool,
      activeAccountsCount,
      activeAgentsCount,
      todayDeposit,
      todayWithdrawal,
      todayTxCount: todayTxs.length,
      monthDeposit,
      monthWithdrawal,
      monthTxCount: monthTxs.length,
    };
  }, [accounts, transactions, profiles, nepaliDate, chartMonthYearStr, selectedChartMonth, selectedChartYear]);

  // Agent Performance Breakdown
  const agentStats = useMemo(() => {
    const agents = profiles.filter((p) => p.role === 'agent' || p.role === 'admin');

    return agents.map((agent) => {
      const assignedAccounts = accounts.filter(
        (acc) => acc.assigned_agent_id === agent.id && acc.status === 'active'
      );
      const totalAgentSavings = assignedAccounts.reduce(
        (sum, acc) => sum + Number(acc.balance || 0),
        0
      );

      const todayDateStr = nepaliDate.formattedBS;
      const agentTodayTxs = transactions.filter(
        (tx) => tx.agent_id === agent.id && tx.nepali_date === todayDateStr && tx.type === 'deposit'
      );
      const todayCollection = agentTodayTxs.reduce(
        (sum, tx) => sum + Number(tx.amount || 0),
        0
      );

      const agentMonthTxs = transactions.filter((tx) => {
        const txMonth = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[1], 10) : 0;
        const txYear = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[0], 10) : 0;
        const matchMonth =
          tx.month_year === chartMonthYearStr ||
          (txMonth === selectedChartMonth && txYear === selectedChartYear);
        return tx.agent_id === agent.id && matchMonth && tx.type === 'deposit';
      });

      const monthCollection = agentMonthTxs.reduce(
        (sum, tx) => sum + Number(tx.amount || 0),
        0
      );

      return {
        agent,
        assignedAccountsCount: assignedAccounts.length,
        totalAgentSavings,
        todayCollection,
        todayCollectionsCount: agentTodayTxs.length,
        monthCollection,
        monthTxCount: agentMonthTxs.length,
      };
    });
  }, [profiles, accounts, transactions, nepaliDate, chartMonthYearStr, selectedChartMonth, selectedChartYear]);

  // 1. Daily Collection Trend Data for Days 1 to 31 of the selected Nepali month
  const dailyTrendChartData = useMemo(() => {
    const daysInMonth = monthObj.days || 31;
    const daysArr: { day: string; dayNum: number; deposit: number; withdraw: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayTxs = transactions.filter((tx) => {
        const txMonth = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[1], 10) : 0;
        const txYear = tx.nepali_date ? parseInt(tx.nepali_date.split('-')[0], 10) : 0;
        const matchMonth =
          tx.month_year === chartMonthYearStr ||
          (txMonth === selectedChartMonth && txYear === selectedChartYear);
        return matchMonth && tx.day_number === d;
      });

      const dayDeposit = dayTxs
        .filter((t) => t.type === 'deposit')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const dayWithdraw = dayTxs
        .filter((t) => t.type === 'withdraw')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      daysArr.push({
        day: `${d} गते`,
        dayNum: d,
        deposit: dayDeposit,
        withdraw: dayWithdraw,
      });
    }

    return daysArr;
  }, [transactions, monthObj, chartMonthYearStr, selectedChartMonth, selectedChartYear]);

  // 2. Agent Comparison Chart Data
  const agentComparisonChartData = useMemo(() => {
    return agentStats.map((st) => ({
      name: st.agent.full_name.split(' ')[0],
      fullName: st.agent.full_name,
      monthDeposit: st.monthCollection,
      totalSavings: st.totalAgentSavings,
      accounts: st.assignedAccountsCount,
    }));
  }, [agentStats]);

  const handleExportAdminSummaryExcel = () => {
    const rows = [
      ['मानस कृषि सहकारी संस्था लिमिटेड, टिकापुर-१, कैलाली'],
      ['केन्द्रीय व्यवस्थापक प्रतिवेदन (Admin Executive Collection Report)'],
      [`मिति (Date): ${nepaliDate.formattedBS} (${chartMonthYearStr})`],
      [],
      ['सूचक (KPI Metrics)', 'रकम / संख्या (Value)'],
      ['सहकारी कुल बचत मौज्दात (Total Savings Pool)', summary.totalSavingsPool],
      ['सक्रिय सदस्य खाता संख्या (Total Active Accounts)', summary.activeAccountsCount],
      ['सक्रिय बजार प्रतिनिधि संख्या (Active Agents)', summary.activeAgentsCount],
      ['आजको कुल बचत संकलन (Today Collection)', summary.todayDeposit],
      ['आजको भुक्तानी रकम (Today Withdrawals)', summary.todayWithdrawal],
      [`${monthObj.ne} महिनाको संकलन (Month Total)`, summary.monthDeposit],
      [],
      ['बजार प्रतिनिधि अनुसार कार्यसम्पादन विवरण (Agent Performance Breakdown)'],
      ['क्र.सं.', 'प्रतिनिधिको नाम', 'कार्यक्षेत्र', 'जिम्मा खाता संख्या', 'आजको संकलन रु.', 'महिनाको संकलन रु.', 'कुल मौज्दात रु.'],
    ];

    agentStats.forEach((stat, idx) => {
      rows.push([
        idx + 1,
        stat.agent.full_name,
        stat.agent.assigned_area || 'टिकापुर',
        stat.assignedAccountsCount,
        stat.todayCollection,
        stat.monthCollection,
        stat.totalAgentSavings,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Executive_Report');
    XLSX.writeFile(wb, `Manas_Admin_Summary_${nepaliDate.formattedBS}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Welcome & Top Summary */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-900 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-96 h-96 bg-emerald-800/30 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-emerald-950 shadow-xs">
                केन्द्रीय व्यवस्थापन प्यानल (Executive Admin Hub)
              </span>
              <span className="text-xs text-emerald-300 font-mono">
                {nepaliDate.formattedBS} वि.सं.
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              मानस कृषि सहकारी संस्था लि.
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/90 max-w-xl mt-1">
              टिकापुर-१, कैलाली • बजार प्रतिनिधि कार्यसम्पादन, दैनिक संकलन तथा वित्तीय विश्लेषण
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Month Filter for Analytics */}
            <select
              value={selectedChartMonth}
              onChange={(e) => setSelectedChartMonth(parseInt(e.target.value, 10))}
              className="py-2 px-3 bg-emerald-900 border border-emerald-700 text-white rounded-2xl text-xs font-bold focus:ring-2 focus:ring-amber-400 cursor-pointer"
            >
              {NEPALI_MONTHS.map((m) => (
                <option key={m.index} value={m.index}>
                  {m.ne} ({m.en})
                </option>
              ))}
            </select>

            <button
              id="export-admin-excel-btn"
              onClick={handleExportAdminSummaryExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>कार्यकारी Excel प्रतिवेदन</span>
            </button>
          </div>
        </div>

        {/* 4 Big KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-emerald-800/60 relative z-10">
          {/* KPI 1: Total Savings Collected Today */}
          <div className="bg-emerald-900/50 p-4 rounded-2xl border border-emerald-700/60 backdrop-blur-xs">
            <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-1">
              <span>आजको कुल संकलन (Today)</span>
              <ArrowDownRight className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-2xl font-black font-mono text-white">
              {formatCurrencyNPR(summary.todayDeposit)}
            </p>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">
              {toNepaliNumerals(summary.todayTxCount)} वटा कारोबार सम्पन्न
            </span>
          </div>

          {/* KPI 2: Total Savings Collected This Month */}
          <div className="bg-emerald-900/50 p-4 rounded-2xl border border-emerald-700/60 backdrop-blur-xs">
            <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-1">
              <span>{monthObj.ne} महिनाको संकलन (Month)</span>
              <TrendingUp className="w-4 h-4 text-emerald-300" />
            </div>
            <p className="text-2xl font-black font-mono text-amber-300">
              {formatCurrencyNPR(summary.monthDeposit)}
            </p>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">
              {chartMonthYearStr} अवधि
            </span>
          </div>

          {/* KPI 3: Total Active Accounts */}
          <div className="bg-emerald-900/50 p-4 rounded-2xl border border-emerald-700/60 backdrop-blur-xs">
            <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-1">
              <span>सक्रिय सदस्य खाताहरू</span>
              <Users className="w-4 h-4 text-amber-300" />
            </div>
            <p className="text-2xl font-black font-mono text-white">
              {toNepaliNumerals(summary.activeAccountsCount)} जना
            </p>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">
              कुल बचत: {formatCurrencyNPR(summary.totalSavingsPool)}
            </span>
          </div>

          {/* KPI 4: Active Agents */}
          <div className="bg-emerald-900/50 p-4 rounded-2xl border border-emerald-700/60 backdrop-blur-xs">
            <div className="flex items-center justify-between text-emerald-300 text-xs font-bold mb-1">
              <span>सक्रिय बजार प्रतिनिधिहरू</span>
              <UserCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <p className="text-2xl font-black font-mono text-white">
              {toNepaliNumerals(summary.activeAgentsCount)} जना
            </p>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">
              फिल्ड संकलनमा क्रियाशील
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics / Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Daily Collection Trend over Nepali Month */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  दैनिक संकलन प्रवृत्ति ({monthObj.ne} १ देखि ३१ गते)
                </h3>
                <p className="text-xs text-slate-500">
                  प्रति दिन संकलित बचत रकम (रु.)
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              {monthObj.en}
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDeposit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#065f46" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#065f46" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="dayNum"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={2}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `रु.${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [`${formatCurrencyNPR(Number(value))}`, 'संकलन']}
                  labelFormatter={(label) => `${label} गते`}
                  contentStyle={{
                    backgroundColor: '#022c22',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: 'none',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="deposit"
                  stroke="#047857"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorDeposit)"
                  name="जम्मा संकलन"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Agent Collection Comparison */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  बजार प्रतिनिधि संकलन तुलना (Agent Comparison)
                </h3>
                <p className="text-xs text-slate-500">
                  {monthObj.ne} महिनाको संकलित बचत रकम
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-600">
              {toNepaliNumerals(agentComparisonChartData.length)} प्रतिनिधिहरू
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={agentComparisonChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fontWeight: 'bold', fill: '#334155' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `रु.${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [`${formatCurrencyNPR(Number(value))}`, 'महिनाको संकलन']}
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || ''}
                  contentStyle={{
                    backgroundColor: '#022c22',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    border: 'none',
                  }}
                />
                <Bar
                  dataKey="monthDeposit"
                  fill="#059669"
                  radius={[8, 8, 0, 0]}
                  name="महिनाको संकलन"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Field Agents (Bajar Pratinidhi) Performance Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>बजार प्रतिनिधि कार्यसम्पादन (Field Collectors Performance)</span>
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {toNepaliNumerals(agentStats.length)} प्रतिनिधि सक्रिय
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentStats.map((stat, index) => {
            return (
              <div
                key={stat.agent.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-950 flex items-center justify-center font-black text-sm border border-emerald-200 shadow-xs">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                        {stat.agent.full_name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-700" />
                        {stat.agent.assigned_area || 'टिकापुर बजार'}
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-200">
                    {toNepaliNumerals(stat.assignedAccountsCount)} खाता
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block text-[11px]">आजको संकलन:</span>
                    <span className="font-black text-sm text-emerald-900 font-mono">
                      {formatCurrencyNPR(stat.todayCollection)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ({toNepaliNumerals(stat.todayCollectionsCount)} पटक)
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block text-[11px]">महिनाको संकलन:</span>
                    <span className="font-black text-sm text-slate-900 font-mono">
                      {formatCurrencyNPR(stat.monthCollection)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ({toNepaliNumerals(stat.monthTxCount)} कारोबार)
                    </span>
                  </div>
                </div>

                {/* 1-Click Monthly Matrix Download */}
                <button
                  type="button"
                  onClick={() => {
                    const res = transformToMonthlyMatrix(
                      accounts,
                      transactions,
                      stat.agent,
                      selectedChartMonth,
                      selectedChartYear
                    );
                    exportMatrixToExcel(res);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{monthObj.ne} को Excel म्याट्रिक्स डाउनलोड</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Audit Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              हालैका फिल्ड कारोबारहरू (Live Audit Ledger)
            </h3>
            <p className="text-xs text-slate-500">
              सम्पूर्ण प्रतिनिधिहरूद्वारा गरिएको कारोबारहरूको प्रत्यक्ष विवरण
            </p>
          </div>
          <span className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700 border border-slate-200">
            कुल {toNepaliNumerals(transactions.length)} कारोबार
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-3">मिति (BS)</th>
                <th className="p-3">खाता नं.</th>
                <th className="p-3">सदस्यको नाम</th>
                <th className="p-3">प्रकार</th>
                <th className="p-3 text-right">रकम रु.</th>
                <th className="p-3">बजार प्रतिनिधि</th>
                <th className="p-3">स्थिति</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 10).map((tx) => {
                const acc = accounts.find((a) => a.id === tx.account_id);
                const agent = profiles.find((p) => p.id === tx.agent_id);
                const isDeposit = tx.type === 'deposit';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono text-slate-700">
                      {tx.nepali_date} (गते {toNepaliNumerals(tx.day_number)})
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-950">
                      {acc?.account_no || 'N/A'}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {acc?.name || 'N/A'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isDeposit
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-rose-100 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {isDeposit ? 'जम्मा' : 'भुक्तानी'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-black text-slate-900">
                      {formatCurrencyNPR(tx.amount)}
                    </td>
                    <td className="p-3 text-slate-600 font-medium">
                      {agent?.full_name || 'Agent'}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
