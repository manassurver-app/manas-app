import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  X,
  FileCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Account, Profile } from '../types';
import { supabaseBulkInsertAccounts } from '../lib/supabase';
import { toNepaliNumerals, formatCurrencyNPR } from '../utils/nepaliCalendar';

interface ExcelBulkImporterProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  existingAccounts: Account[];
  onImportComplete: () => void;
  lang: 'ne' | 'en';
}

interface ParsedRow {
  account_no: string;
  name: string;
  nepali_name?: string;
  address: string;
  contact_number: string;
  opening_balance: number;
  assigned_agent_id?: string;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export const ExcelBulkImporter: React.FC<ExcelBulkImporterProps> = ({
  isOpen,
  onClose,
  profiles,
  existingAccounts,
  onImportComplete,
  lang,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState<string>(() => {
    const firstAgent = profiles.find((p) => p.role === 'agent');
    return firstAgent?.id || profiles[0]?.id || '';
  });
  const [importResult, setImportResult] = useState<{
    inserted: number;
    duplicates: number;
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate and Download standard Excel Template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      ['Account No', 'Name', 'Nepali Name', 'Address', 'Contact Number', 'Opening Balance'],
      ['MKS-3001', 'Hari Prasad Sharma', 'हरि प्रसाद शर्मा', 'Tikapur-1, Block A', '9848412300', 1000],
      ['MKS-3002', 'Bimala Devi Chaudhary', 'बिमला देवी चौधरी', 'Tikapur-1, Main Bazaar', '9868499887', 500],
      ['MKS-3003', 'Ganesh Bahadur Saud', 'गणेश बहादुर साउँद', 'Tikapur-1, Hatbazar', '9812344556', 2000],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateHeaders);

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 15 }, // Account No
      { wch: 25 }, // Name
      { wch: 25 }, // Nepali Name
      { wch: 25 }, // Address
      { wch: 18 }, // Contact Number
      { wch: 16 }, // Opening Balance
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Member_Accounts_Template');

    XLSX.writeFile(workbook, 'Manas_Sahakari_Bulk_Accounts_Template.xlsx');
  };

  // Parse Uploaded Excel File
  const processUploadedFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonData || jsonData.length <= 1) {
          alert('फाइलमा कुनै विवरण भेटिएन वा हेडर मात्र छ (File is empty or contains only headers)');
          setIsProcessing(false);
          return;
        }

        const headers: string[] = (jsonData[0] as string[]).map((h) =>
          h ? h.toString().trim().toLowerCase() : ''
        );

        // Find column indices tolerating various header variations
        const accNoIdx = headers.findIndex((h) =>
          h.includes('account') || h.includes('acc') || h.includes('खाता')
        );
        const nameIdx = headers.findIndex((h) =>
          h.includes('name') || h.includes('सदस्य') || h.includes('नाम')
        );
        const nepaliNameIdx = headers.findIndex(
          (h) => h.includes('nepali') || h.includes('नेपाली')
        );
        const addressIdx = headers.findIndex((h) =>
          h.includes('address') || h.includes('ठेगाना') || h.includes('स्थान')
        );
        const contactIdx = headers.findIndex((h) =>
          h.includes('contact') || h.includes('mobile') || h.includes('phone') || h.includes('सम्पर्क') || h.includes('फोन')
        );
        const balanceIdx = headers.findIndex((h) =>
          h.includes('balance') || h.includes('opening') || h.includes('मौज्दात') || h.includes('रकम')
        );

        const existingAccNos = new Set(
          existingAccounts.map((a) => a.account_no.trim().toLowerCase())
        );
        const seenInFile = new Set<string>();

        const rows: ParsedRow[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || !row[nameIdx !== -1 ? nameIdx : 1]) continue;

          const rawAccNo = (accNoIdx !== -1 && row[accNoIdx] ? String(row[accNoIdx]) : `MKS-${Math.floor(2000 + Math.random() * 8000)}`).trim();
          const rawName = (nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]) : '').trim();
          const rawNepaliName = nepaliNameIdx !== -1 && row[nepaliNameIdx] ? String(row[nepaliNameIdx]).trim() : undefined;
          const rawAddress = (addressIdx !== -1 && row[addressIdx] ? String(row[addressIdx]) : 'Tikapur-1, Kailali').trim();
          const rawContact = (contactIdx !== -1 && row[contactIdx] ? String(row[contactIdx]) : '9800000000').trim();
          const rawBal = balanceIdx !== -1 && row[balanceIdx] ? parseFloat(String(row[balanceIdx])) || 0 : 0;

          const errors: string[] = [];
          let isDuplicate = false;

          if (!rawName) errors.push('नाम छुटेको छ');
          if (!rawAccNo) errors.push('खाता नम्बर छुटेको छ');

          if (existingAccNos.has(rawAccNo.toLowerCase()) || seenInFile.has(rawAccNo.toLowerCase())) {
            isDuplicate = true;
            errors.push('यो खाता नम्बर पहिले नै दर्ता छ (Duplicate Account No)');
          } else {
            seenInFile.add(rawAccNo.toLowerCase());
          }

          rows.push({
            account_no: rawAccNo.toUpperCase(),
            name: rawName,
            nepali_name: rawNepaliName,
            address: rawAddress,
            contact_number: rawContact,
            opening_balance: rawBal,
            isValid: errors.length === 0 && !isDuplicate,
            isDuplicate,
            errors,
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        alert('एक्सेल फाइल पढ्न सकिएन: ' + (err.message || 'Unknown error'));
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  // Perform Final Bulk Insert
  const handleExecuteImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('कुनै पनि मान्य खाता आयात गर्न बाँकी छैन (No valid rows to import)');
      return;
    }

    const accountsToInsert = validRows.map((r) => ({
      account_no: r.account_no,
      name: r.name,
      nepali_name: r.nepali_name,
      address: r.address,
      contact_number: r.contact_number,
      assigned_agent_id: targetAgentId,
      opening_balance: r.opening_balance,
      status: 'active' as const,
    }));

    const result = supabaseBulkInsertAccounts(accountsToInsert, targetAgentId);
    setImportResult({
      inserted: result.insertedCount,
      duplicates: result.duplicatesCount,
      errors: result.errors,
    });

    onImportComplete();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-amber-300 flex items-center justify-center font-black shadow-md border border-emerald-500/40">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">
                  {lang === 'ne'
                    ? 'एक्सेल बल्क खाता आयात मोड्युल'
                    : 'Excel Bulk Account Opening Module'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  SheetJS (.xlsx / .csv)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                मानस कृषि सहकारी संस्था लि., टिकापुर-१, कैलाली • Bulk Member Onboarding
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Instructions & Template Download Bar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-700" />
                <span>एक्सेल ढाँचा निर्देशन (Format Requirements)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                एक्सेल फाइलमा <code className="text-emerald-800 font-bold">Account No</code>,{' '}
                <code className="text-emerald-800 font-bold">Name</code>,{' '}
                <code className="text-emerald-800 font-bold">Address</code>,{' '}
                <code className="text-emerald-800 font-bold">Contact Number</code>,{' '}
                <code className="text-emerald-800 font-bold">Opening Balance</code> स्तम्भहरू समावेश हुनुपर्दछ।
              </p>
            </div>

            <button
              id="btn-download-template"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>ढाँचा डाउनलोड (Download Template)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-800">
                  एक्सेल वा CSV फाइल यहाँ तान्नुहोस् वा क्लिक गर्नुहोस्
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports .xlsx, .xls, .csv files generated by Microsoft Excel, Google Sheets, or LibreOffice
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Bar & Agent Assignment */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-slate-700">
                    फाइल: <strong className="text-slate-900 font-mono">{file?.name}</strong>
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-xl">
                    मान्य: {toNepaliNumerals(validCount)}
                  </span>
                  {invalidCount > 0 && (
                    <span className="bg-rose-100 text-rose-800 text-xs font-black px-2.5 py-1 rounded-xl">
                      त्रुटि/दोहोरिएको: {toNepaliNumerals(invalidCount)}
                    </span>
                  )}
                </div>

                {/* Target Agent Selector */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-extrabold text-slate-700 whitespace-nowrap">
                    तोकिने बजार प्रतिनिधि:
                  </label>
                  <select
                    value={targetAgentId}
                    onChange={(e) => setTargetAgentId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white"
                  >
                    {profiles
                      .filter((p) => p.role === 'agent')
                      .map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.full_name} ({ag.assigned_area || 'टिकापुर'})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Parsed Rows Preview Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">स्थिति</th>
                        <th className="py-2.5 px-3 font-mono">खाता नं (Acc No)</th>
                        <th className="py-2.5 px-3">सदस्यको नाम (Name)</th>
                        <th className="py-2.5 px-3">ठेगाना (Address)</th>
                        <th className="py-2.5 px-3 font-mono">सम्पर्क (Mobile)</th>
                        <th className="py-2.5 px-3 text-right">सुरुवाती रकम</th>
                        <th className="py-2.5 px-3">कैफियत / त्रुटि</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 ${
                            !row.isValid ? 'bg-rose-50/50' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>मान्य</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-rose-700 font-bold text-[11px]">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>अमान्य</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {row.account_no}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {row.name}
                            {row.nepali_name && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {row.nepali_name}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[140px]">
                            {row.address}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {row.contact_number}
                          </td>
                          <td className="py-2 px-3 font-mono font-black text-right text-emerald-900">
                            {formatCurrencyNPR(row.opening_balance)}
                          </td>
                          <td className="py-2 px-3 text-[10px] text-rose-600 font-medium">
                            {row.errors.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Result Feedback */}
              {importResult && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-950 p-4 rounded-2xl space-y-1 animate-in fade-in text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <span className="text-sm font-black">
                      सफलतापूर्वक {toNepaliNumerals(importResult.inserted)} वटा सदस्य खाताहरू आयात गरियो!
                    </span>
                  </div>
                  {importResult.duplicates > 0 && (
                    <p className="text-emerald-800 text-[11px]">
                      {toNepaliNumerals(importResult.duplicates)} वटा दोहोरिएका खाता नम्बरहरू छोडियो।
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {parsedRows.length > 0 && (
              <button
                onClick={() => {
                  setParsedRows([]);
                  setFile(null);
                  setImportResult(null);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>नयाँ फाइल छान्नुहोस्</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              बन्द गर्नुहोस्
            </button>

            {parsedRows.length > 0 && (
              <button
                id="btn-confirm-bulk-import"
                onClick={handleExecuteImport}
                disabled={validCount === 0 || Boolean(importResult)}
                className="px-6 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  {importResult
                    ? 'आयात सम्पन्न भयो'
                    : `${toNepaliNumerals(validCount)} वटा खाताहरू डाटाबेसमा सुरक्षित गर्नुहोस्`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
