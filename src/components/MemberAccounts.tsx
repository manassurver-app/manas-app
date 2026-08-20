import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  BookOpen,
  ArrowDownRight,
  ArrowUpRight,
  Phone,
  MapPin,
  X,
  CheckCircle,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { Account, Profile, Transaction } from '../types';
import { formatCurrencyNPR, formatBSToNepaliDate, toNepaliNumerals } from '../utils/nepaliCalendar';
import {
  downloadSampleAccountsTemplate,
  parseAccountsFromExcelFile,
} from '../utils/excel';
import * as XLSX from 'xlsx';

interface MemberAccountsProps {
  accounts: Account[];
  transactions: Transaction[];
  profiles: Profile[];
  activeProfile: Profile;
  onAddAccount: (accountData: Omit<Account, 'id' | 'created_at' | 'current_balance'>) => void;
  onBatchImportAccounts: (newAccounts: Partial<Account>[]) => void;
  lang: 'ne' | 'en';
}

export const MemberAccounts: React.FC<MemberAccountsProps> = ({
  accounts,
  transactions,
  profiles,
  activeProfile,
  onAddAccount,
  onBatchImportAccounts,
  lang,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingPassbookAccount, setViewingPassbookAccount] = useState<Account | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New account form state
  const [formData, setFormData] = useState({
    account_no: `MKS-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    nepali_name: '',
    address: 'टिकापुर-१, कैलाली',
    contact_number: '98',
    assigned_agent_id: activeProfile.role === 'agent' ? activeProfile.id : profiles.find(p => p.role === 'agent')?.id || activeProfile.id,
    opening_balance: 500,
    status: 'active' as const,
  });

  // Filter accounts according to user role:
  // Admin sees all accounts; Field Agent sees ONLY assigned accounts (RLS rule)
  const roleFilteredAccounts = useMemo(() => {
    if (activeProfile.role === 'admin') {
      return accounts;
    }
    return accounts.filter((acc) => acc.assigned_agent_id === activeProfile.id);
  }, [accounts, activeProfile]);

  const filteredAccounts = useMemo(() => {
    return roleFilteredAccounts.filter((acc) => {
      const matchesSearch =
        acc.account_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.contact_number.includes(searchTerm) ||
        acc.address.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeProfile.role === 'admin' && selectedAgentFilter !== 'all') {
        return acc.assigned_agent_id === selectedAgentFilter;
      }
      return true;
    });
  }, [roleFilteredAccounts, searchTerm, selectedAgentFilter, activeProfile]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.account_no.trim()) return;

    onAddAccount({
      account_no: formData.account_no.trim(),
      name: formData.name.trim(),
      nepali_name: formData.nepali_name.trim() || undefined,
      address: formData.address.trim(),
      contact_number: formData.contact_number.trim(),
      assigned_agent_id: formData.assigned_agent_id,
      opening_balance: Number(formData.opening_balance || 0),
      status: formData.status,
    });

    setIsAddModalOpen(false);
    setFormData({
      account_no: `MKS-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      nepali_name: '',
      address: 'टिकापुर-१, कैलाली',
      contact_number: '98',
      assigned_agent_id: activeProfile.role === 'agent' ? activeProfile.id : profiles.find(p => p.role === 'agent')?.id || activeProfile.id,
      opening_balance: 500,
      status: 'active',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseAccountsFromExcelFile(file);
      onBatchImportAccounts(parsed);
      alert(lang === 'ne' ? `${toNepaliNumerals(parsed.length)} वटा सदस्य खाताहरू सफलतापूर्वक आयात गरियो!` : `Successfully imported ${parsed.length} accounts!`);
    } catch (err) {
      alert('Error reading Excel file. Please ensure it follows the format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportAllAccountsExcel = () => {
    const rows = [
      ['मानस कृषि सहकारी संस्था लिमिटेड, टिकापुर-१, कैलाली'],
      ['सदस्य बचत खाता सूची (Member Accounts Register)'],
      [],
      ['क्र.सं.', 'खाता नं.', 'सदस्यको नाम', 'ठेगाना', 'सम्पर्क नं.', 'सुरु मौज्दात रु.', 'हालको मौज्दात रु.', 'जिम्मेवार प्रतिनिधि', 'स्थिति'],
    ];

    filteredAccounts.forEach((acc, idx) => {
      const agent = profiles.find((p) => p.id === acc.assigned_agent_id);
      rows.push([
        idx + 1,
        acc.account_no,
        acc.name,
        acc.address,
        acc.contact_number,
        acc.opening_balance,
        acc.current_balance,
        agent?.full_name || 'Unassigned',
        acc.status === 'active' ? 'सक्रिय (Active)' : 'बन्द (Closed)',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Accounts');
    XLSX.writeFile(wb, `Manas_Accounts_List_${Date.now()}.xlsx`);
  };

  // Passbook ledger calculations for the selected account
  const passbookTransactions = useMemo(() => {
    if (!viewingPassbookAccount) return [];
    return transactions
      .filter((t) => t.account_id === viewingPassbookAccount.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [viewingPassbookAccount, transactions]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-900">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {lang === 'ne' ? 'बचतकर्ता सदस्य खाता व्यवस्थापन' : 'Member Savings Accounts'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {activeProfile.role === 'admin'
                  ? 'सम्पूर्ण सहकारी सदस्य खाताहरूको सूची र विवरण (Admin View)'
                  : `तपाईंलाई जिम्मा दिइएका सदस्य खाताहरू (${activeProfile.full_name})`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template */}
          <button
            id="download-excel-template-btn"
            onClick={downloadSampleAccountsTemplate}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
            title="Download Excel template for bulk account creation"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ne' ? 'नमूना Excel डाउनलोड' : 'Sample Excel'}</span>
          </button>

          {/* Import Excel */}
          <button
            id="import-excel-accounts-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-xl text-xs font-bold shadow-xs transition-colors"
            title="Bulk import member accounts from Excel"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{lang === 'ne' ? 'Excel बाट सदस्य थप्नुहोस्' : 'Import Excel'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Export All */}
          <button
            id="export-all-accounts-btn"
            onClick={handleExportAllAccountsExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{lang === 'ne' ? 'खाता सूची Export' : 'Export Excel'}</span>
          </button>

          {/* New Account Button */}
          <button
            id="open-new-account-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'ne' ? '+ नयाँ सदस्य खाता खोल्नुहोस्' : '+ Add Account'}</span>
          </button>
        </div>
      </div>

      {/* Search & Agent Filter */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-member-accounts-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'ne' ? 'सदस्यको नाम, खाता नं. वा फोन नम्बर खोज्नुहोस्...' : 'Search accounts...'}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {activeProfile.role === 'admin' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-bold whitespace-nowrap">प्रतिनिधि अनुसार:</span>
            <select
              id="filter-by-agent-select"
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">सबै प्रतिनिधि (All Agents)</option>
              {profiles
                .filter((p) => p.role === 'agent')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Accounts List Table/Card Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">खाता नं. (A/C No)</th>
                <th className="px-4 py-3">सदस्यको नाम र विवरण</th>
                <th className="px-4 py-3">ठेगाना / सम्पर्क</th>
                <th className="px-4 py-3 text-right">सुरु रकम</th>
                <th className="px-4 py-3 text-right">हालको मौज्दात</th>
                <th className="px-4 py-3">जिम्मेवार प्रतिनिधि</th>
                <th className="px-4 py-3 text-center">पासबुक / विवरण</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    कुनै सदस्य खाता भेटिएन।
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const assignedAgent = profiles.find((p) => p.id === account.assigned_agent_id);

                  return (
                    <tr
                      key={account.id}
                      className="hover:bg-emerald-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-extrabold text-emerald-950">
                        <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                          {account.account_no}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900">{account.name}</div>
                        {account.nepali_name && (
                          <div className="text-xs text-slate-500">{account.nepali_name}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        <div>{account.address}</div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {account.contact_number}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatCurrencyNPR(account.opening_balance)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-900 text-sm">
                        {formatCurrencyNPR(account.current_balance)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {assignedAgent?.full_name?.split(' ')[0] || 'Unknown'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          id={`view-passbook-btn-${account.account_no}`}
                          onClick={() => setViewingPassbookAccount(account)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 mx-auto transition-colors cursor-pointer"
                          title="View member transaction statement & passbook"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                          <span>पासबुक (Ledger)</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
                  +
                </div>
                <div>
                  <h3 className="font-extrabold text-base">नयाँ बचतकर्ता सदस्य खाता खोल्नुहोस्</h3>
                  <p className="text-xs text-emerald-200">मानस कृषि सहकारी संस्था लि., टिकापुर-१</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-emerald-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">खाता नम्बर (A/C No):</label>
                  <input
                    id="new-account-no-input"
                    type="text"
                    required
                    value={formData.account_no}
                    onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">सुरु मौज्दात रु. (Opening):</label>
                  <input
                    id="new-opening-balance-input"
                    type="number"
                    min="0"
                    required
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">सदस्यको पूरा नाम (Full Name):</label>
                <input
                  id="new-account-name-input"
                  type="text"
                  required
                  placeholder="e.g. राम बहादुर चौधरी (Ram Bahadur Chaudhary)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ठेगाना (Address):</label>
                  <input
                    id="new-account-address-input"
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">मोबाइल नं (Mobile):</label>
                  <input
                    id="new-account-contact-input"
                    type="text"
                    required
                    placeholder="98xxxxxxxx"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs sm:text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  जिम्मेवार बजार प्रतिनिधि (Assigned Agent):
                </label>
                <select
                  id="new-account-agent-select"
                  disabled={activeProfile.role === 'agent'}
                  value={formData.assigned_agent_id}
                  onChange={(e) => setFormData({ ...formData, assigned_agent_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900"
                >
                  {profiles
                    .filter((p) => p.role === 'agent')
                    .map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.full_name} ({agent.assigned_area || 'टिकापुर'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-xs sm:text-sm text-slate-700 hover:bg-slate-100"
                >
                  रद्द गर्नुहोस्
                </button>
                <button
                  id="save-new-account-btn"
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all"
                >
                  खाता सुरक्षित गर्नुहोस् (Save Account)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Passbook & Ledger Statement Modal */}
      {viewingPassbookAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg">सदस्य बचत पासबुक (Member Passbook Ledger)</h3>
                  <p className="text-xs text-emerald-200">
                    खाता नं: <strong className="text-amber-300 font-mono">{viewingPassbookAccount.account_no}</strong> • {viewingPassbookAccount.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPassbookAccount(null)}
                className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Summary Banner */}
            <div className="bg-emerald-50/50 p-4 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">ठेगाना / फोन:</span>
                <p className="font-bold text-slate-800">{viewingPassbookAccount.address} • {viewingPassbookAccount.contact_number}</p>
              </div>
              <div className="text-right">
                <span className="text-emerald-800 font-bold uppercase text-[10px]">हालको कुल मौज्दात (Current Balance):</span>
                <p className="font-black text-xl text-emerald-950 font-mono">
                  {formatCurrencyNPR(viewingPassbookAccount.current_balance)}
                </p>
              </div>
            </div>

            {/* Transactions Statement List */}
            <div className="p-4 max-h-96 overflow-y-auto">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                कारोबार विवरण सूची (Statement History)
              </h4>

              {passbookTransactions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  कुनै कारोबार गरिएको छैन।
                </div>
              ) : (
                <div className="space-y-2">
                  {passbookTransactions.map((tx) => {
                    const isDeposit = tx.type === 'deposit';
                    const agent = profiles.find((p) => p.id === tx.agent_id);

                    return (
                      <div
                        key={tx.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                              isDeposit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isDeposit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900">
                              {isDeposit ? 'दैनिक बचत जम्मा' : 'रकम भुक्तानी'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              मिति: {tx.nepali_date} ({tx.month_year} गते {toNepaliNumerals(tx.day_number)})
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-black text-sm font-mono ${
                              isDeposit ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isDeposit ? '+' : '-'}{formatCurrencyNPR(tx.amount)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            संकलक: {agent?.full_name?.split(' ')[0] || 'Agent'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingPassbookAccount(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                बन्द गर्नुहोस् (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
