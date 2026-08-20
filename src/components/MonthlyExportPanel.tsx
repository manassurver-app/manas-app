import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  User,
  Users,
  Building2,
  CheckCircle2,
  Table as TableIcon,
  Sparkles,
  TrendingUp,
  FileCheck,
  Eye,
} from 'lucide-react';
import { Account, Profile, Transaction } from '../types';
import { NEPALI_MONTHS, getCurrentNepaliDate, toNepaliNumerals, formatCurrencyNPR } from '../utils/nepaliCalendar';
import { transformToMonthlyMatrix, exportMatrixToExcel, MatrixExportResult } from '../utils/excelExportUtils';

interface MonthlyExportPanelProps {
  accounts: Account[];
  transactions: Transaction[];
  profiles: Profile[];
  activeProfile: Profile;
  lang: 'ne' | 'en';
}

export const MonthlyExportPanel: React.FC<MonthlyExportPanelProps> = ({
  accounts,
  transactions,
  profiles,
  activeProfile,
  lang,
}) => {
  const currentDate = getCurrentNepaliDate();

  // Filters state
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    activeProfile.role === 'admin' ? (profiles.find((p) => p.role === 'agent')?.id || activeProfile.id) : activeProfile.id
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.month);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.year);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Available agent list
  const agentList = useMemo(() => {
    return profiles.filter((p) => p.status === 'active');
  }, [profiles]);

  const targetAgent = useMemo(() => {
    return profiles.find((p) => p.id === selectedAgentId) || activeProfile;
  }, [profiles, selectedAgentId, activeProfile]);

  // Generate matrix transformation result
  const matrixResult: MatrixExportResult = useMemo(() => {
    return transformToMonthlyMatrix(
      accounts,
      transactions,
      targetAgent,
      selectedMonth,
      selectedYear
    );
  }, [accounts, transactions, targetAgent, selectedMonth, selectedYear]);

  // Handle Download Excel button
  const handleDownload = () => {
    exportMatrixToExcel(matrixResult);
    setDownloadSuccessToast(
      lang === 'ne'
        ? `सफलतापूर्वक "${matrixResult.fileName}" फाइल डाउनलोड गरियो!`
        : `Successfully exported "${matrixResult.fileName}"!`
    );
    setTimeout(() => {
      setDownloadSuccessToast(null), 4000;
    });
  };

  // Month details
  const monthObj = NEPALI_MONTHS[selectedMonth - 1] || NEPALI_MONTHS[3];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="bg-emerald-800 text-white px-4 py-3 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg border border-emerald-600 animate-in fade-in-50">
          <CheckCircle2 className="w-4 h-4 text-amber-300" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* Main Control Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-black shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {lang === 'ne'
                  ? 'मासिक बचत संकलन विवरण एक्स्पोर्ट (Monthly Matrix Export)'
                  : 'Monthly Collection Sheet Export (Excel .xlsx)'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'ne'
                  ? 'भौतिक खाता र कम्प्युटर रेकर्ड मिल्ने १ देखि ३१ गतेसम्मको ढाँचामा Excel फाइल डाउनलोड गर्नुहोस्।'
                  : 'Exports exact 1–31 daily collection matrix matching physical registers (e.g. Bhajan Shrawan 2083.xlsx)'}
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold font-mono">
              {toNepaliNumerals(matrixResult.memberCount)} सदस्य (Rows)
            </span>
            <span className="bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-xl text-xs font-bold font-mono">
              {formatCurrencyNPR(matrixResult.totalDeposit)} कुल जम्मा
            </span>
          </div>
        </div>

        {/* Filters: Agent, Month, Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Agent Selector (Admin can choose any agent; agent sees their own) */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              १. बजार प्रतिनिधि (Bajar Pratinidhi)
            </label>
            {activeProfile.role === 'admin' ? (
              <select
                id="export-agent-select"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 cursor-pointer"
              >
                {agentList.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.role === 'admin' ? '⭐ ' : '👤 '} {ag.full_name} ({ag.assigned_area || 'टिकापुर'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="py-2.5 px-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{activeProfile.full_name}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-normal">
                  मेरो खाता
                </span>
              </div>
            )}
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              २. नेपाली महिना (Nepali Month)
            </label>
            <select
              id="export-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            >
              {NEPALI_MONTHS.map((m) => (
                <option key={m.index} value={m.index}>
                  {m.ne} ({m.en}) - {toNepaliNumerals(m.days)} दिन
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
              ३. नेपाली वर्ष (B.S. Year)
            </label>
            <select
              id="export-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 cursor-pointer"
            >
              {[2080, 2081, 2082, 2083, 2084, 2085].map((yr) => (
                <option key={yr} value={yr}>
                  {toNepaliNumerals(yr)} वि.सं. ({yr} BS)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic File Details & Download Action Bar */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-700" />
              <span>उत्पन्न हुने फाइलको नाम (Output Filename):</span>
            </div>
            <div className="font-mono font-black text-sm text-emerald-950 bg-white px-3 py-1 rounded-xl border border-slate-200 inline-block shadow-2xs">
              {matrixResult.fileName}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Toggle Table Preview */}
            <button
              type="button"
              id="btn-toggle-matrix-preview"
              onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>{isPreviewOpen ? 'प्रिव्यू बन्द गर्नुहोस्' : 'प्रिव्यू हेर्नुहोस् (Preview)'}</span>
            </button>

            {/* Main Download Button */}
            <button
              type="button"
              id="btn-download-excel-matrix"
              onClick={handleDownload}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>डाउनलोड गर्नुहोस् (Download Excel)</span>
            </button>
          </div>
        </div>

        {/* Live Matrix Data Preview Table */}
        {isPreviewOpen && (
          <div className="space-y-3 pt-2 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TableIcon className="w-4 h-4 text-emerald-700" />
                <span>एक्सेल शीट प्रिव्यू: {matrixResult.fileName}</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                स्तम्भ १ देखि ३१ सम्मका दैनिक जम्मा रकमहरू
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-96 shadow-2xs">
              <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                <thead className="bg-emerald-950 text-white sticky top-0 z-10 font-bold">
                  <tr>
                    <th className="p-2 border-r border-emerald-800 text-center w-12">SN</th>
                    <th className="p-2 border-r border-emerald-800 min-w-[160px]">Name</th>
                    <th className="p-2 border-r border-emerald-800 text-center min-w-[100px]">Account No</th>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <th
                        key={d}
                        className={`p-2 border-r border-emerald-800 text-center w-12 font-mono ${
                          d > monthObj.days ? 'bg-emerald-900 text-emerald-400' : ''
                        }`}
                      >
                        {d}
                      </th>
                    ))}
                    <th className="p-2 text-right min-w-[100px] bg-amber-400 text-emerald-950 font-black">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {matrixResult.data.length === 0 ? (
                    <tr>
                      <td colSpan={35} className="p-6 text-center text-slate-400">
                        यस महिनामा कुनै पनि सदस्य वा कारोबार फेला परेन।
                      </td>
                    </tr>
                  ) : (
                    matrixResult.data.map((row) => (
                      <tr key={row.SN} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="p-2 text-center border-r border-slate-100 font-mono text-slate-500">
                          {row.SN}
                        </td>
                        <td className="p-2 font-bold border-r border-slate-100 text-slate-900">
                          {row.Name}
                        </td>
                        <td className="p-2 text-center border-r border-slate-100 font-mono font-bold text-slate-700 bg-slate-50/60">
                          {row['Account No']}
                        </td>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                          const val = Number(row[d]) || 0;
                          return (
                            <td
                              key={d}
                              className={`p-2 text-center border-r border-slate-100 font-mono ${
                                val > 0
                                  ? 'font-bold text-emerald-800 bg-emerald-50/60'
                                  : 'text-slate-300'
                              }`}
                            >
                              {val > 0 ? val : '0'}
                            </td>
                          );
                        })}
                        <td className="p-2 text-right font-mono font-black text-emerald-950 bg-amber-50">
                          {formatCurrencyNPR(row.Total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {matrixResult.data.length > 0 && (
                  <tfoot className="bg-slate-100 font-black text-slate-900 sticky bottom-0 border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={3} className="p-2 text-right uppercase tracking-wider">
                        कुल जम्मा (GRAND TOTAL):
                      </td>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                        let daySum = 0;
                        matrixResult.data.forEach((r) => {
                          daySum += Number(r[d]) || 0;
                        });
                        return (
                          <td key={d} className="p-2 text-center font-mono border-r border-slate-200">
                            {daySum > 0 ? daySum : '0'}
                          </td>
                        );
                      })}
                      <td className="p-2 text-right font-mono text-emerald-950 bg-amber-200">
                        {formatCurrencyNPR(matrixResult.totalDeposit)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
