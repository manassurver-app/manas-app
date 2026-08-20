import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  FileSpreadsheet,
  Phone,
  MapPin,
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Calendar,
  X,
} from 'lucide-react';
import { Account, Profile, Transaction } from '../types';
import { toNepaliNumerals, formatCurrencyNPR } from '../utils/nepaliCalendar';
import { supabaseCloseAccount, supabaseReopenAccount, supabaseUpdateAccount } from '../lib/supabase';

interface AccountListProps {
  accounts: Account[];
  transactions: Transaction[];
  profiles: Profile[];
  activeProfile: Profile;
  onOpenCreateModal: () => void;
  onOpenBulkImportModal: () => void;
  onOpenTransactionModal: (account: Account) => void;
  onRefresh: () => void;
  lang: 'ne' | 'en';
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  transactions,
  profiles,
  activeProfile,
  onOpenCreateModal,
  onOpenBulkImportModal,
  onOpenTransactionModal,
  onRefresh,
  lang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');

  // Modals for editing and closing
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [closingAccount, setClosingAccount] = useState<Account | null>(null);
  const [closureReason, setClosureReason] = useState('सदस्यको स्वेच्छिक अनुरोधमा खाता बन्द');
  const [passbookAccount, setPassbookAccount] = useState<Account | null>(null);

  // RLS Filter: If agent, only show assigned accounts
  const visibleAccounts =
    activeProfile.role === 'admin'
      ? accounts
      : accounts.filter((a) => a.assigned_agent_id === activeProfile.id);

  const filteredAccounts = visibleAccounts.filter((acc) => {
    // Search query
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.nepali_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.account_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.contact_number.includes(searchQuery) ||
      acc.address.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === 'all' ? true : acc.status === statusFilter;

    // Agent filter (Admin only)
    const matchesAgent =
      selectedAgentFilter === 'all'
        ? true
        : acc.assigned_agent_id === selectedAgentFilter;

    return matchesSearch && matchesStatus && matchesAgent;
  });

  const totalPool = visibleAccounts
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + a.current_balance, 0);

  // Close Account Handler
  const handleConfirmClose = () => {
    if (!closingAccount) return;
    const res = supabaseCloseAccount(closingAccount.id, closureReason, activeProfile);
    if (res.success) {
      setClosingAccount(null);
      setClosureReason('सदस्यको स्वेच्छिक अनुरोधमा खाता बन्द');
      onRefresh();
    } else {
      alert(res.error || 'Failed to close account');
    }
  };

  // Reopen Account Handler
  const handleReopen = (acc: Account) => {
    if (!window.confirm(`के तपाईं ${acc.name} (${acc.account_no}) को खाता पुनः सक्रिय गर्न चाहनुहुन्छ?`))
      return;
    const res = supabaseReopenAccount(acc.id, activeProfile);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error || 'Failed to reopen account');
    }
  };

  // Update Account Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    const res = supabaseUpdateAccount(
      editingAccount.id,
      {
        name: editingAccount.name,
        nepali_name: editingAccount.nepali_name,
        address: editingAccount.address,
        contact_number: editingAccount.contact_number,
        assigned_agent_id: editingAccount.assigned_agent_id,
      },
      activeProfile
    );

    if (res.success) {
      setEditingAccount(null);
      onRefresh();
    } else {
      alert(res.error || 'Failed to update');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Statistics Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-950 flex items-center justify-center font-black">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {lang === 'ne' ? 'सदस्य बचत खाता व्यवस्थापन' : 'Member Savings Accounts'}
                </h2>
                <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  {toNepaliNumerals(visibleAccounts.length)} खाताहरू
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {activeProfile.role === 'admin'
                  ? 'सम्पूर्ण बजार प्रतिनिधिको सदस्य खाताहरूको विवरण, खाता खोल्ने तथा बन्द गर्ने सुबिधा'
                  : `तपाईंलाई तोकिएका (${activeProfile.full_name}) सदस्य बचत खाताहरू`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {activeProfile.role === 'admin' && (
              <button
                id="btn-excel-bulk-import"
                onClick={onOpenBulkImportModal}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>एक्सेल बल्क आयात (Excel Import)</span>
              </button>
            )}

            <button
              id="btn-open-new-account"
              onClick={onOpenCreateModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ नयाँ खाता खोल्नुहोस्</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={
                lang === 'ne'
                  ? 'सदस्यको नाम, खाता नं (MKS-XXXX), मोबाइल वा ठेगानाबाट खोज्नुहोस्...'
                  : 'Search by member name, account number, mobile or address...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tabs */}
            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                सबै ({toNepaliNumerals(visibleAccounts.length)})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                सक्रिय ({toNepaliNumerals(visibleAccounts.filter((a) => a.status === 'active').length)})
              </button>
              <button
                onClick={() => setStatusFilter('closed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'closed' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                बन्द ({toNepaliNumerals(visibleAccounts.filter((a) => a.status === 'closed').length)})
              </button>
            </div>

            {/* Agent Filter (Admin only) */}
            {activeProfile.role === 'admin' && (
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white"
              >
                <option value="all">सबै बजार प्रतिनिधिहरू</option>
                {profiles
                  .filter((p) => p.role === 'agent')
                  .map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.full_name}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Accounts Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => {
          const assignedAgent = profiles.find((p) => p.id === acc.assigned_agent_id);
          const isActive = acc.status === 'active';

          return (
            <div
              key={acc.id}
              className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                isActive
                  ? 'border-slate-200 hover:border-emerald-500 hover:shadow-md'
                  : 'border-rose-200 bg-rose-50/20 opacity-80'
              }`}
            >
              <div>
                {/* Account Card Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-100 px-2.5 py-1 rounded-xl">
                        {acc.account_no}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isActive ? 'Active (सक्रिय)' : 'Closed (बन्द)'}
                      </span>
                    </div>

                    <h3 className="font-black text-base text-slate-900 mt-1.5 leading-tight">
                      {acc.name}
                    </h3>
                    {acc.nepali_name && (
                      <p className="text-xs text-slate-500 font-medium">{acc.nepali_name}</p>
                    )}
                  </div>

                  {/* Actions Dropdown / Quick buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingAccount(acc)}
                      className="p-1.5 text-slate-400 hover:text-emerald-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Edit Member Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {activeProfile.role === 'admin' && (
                      <>
                        {isActive ? (
                          <button
                            onClick={() => setClosingAccount(acc)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Close Account (खाता बन्द)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReopen(acc)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                            title="Re-open Account (पुनः खोल्नुहोस्)"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Member Contact & Location Info */}
                <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{acc.address}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono font-bold text-slate-800">{acc.contact_number}</span>
                    </div>
                    <a
                      href={`tel:${acc.contact_number}`}
                      className="text-[10px] font-bold text-emerald-700 hover:underline"
                    >
                      कल गर्नुहोस्
                    </a>
                  </div>
                </div>

                {/* Balance & Assigned Agent Block */}
                <div className="bg-emerald-950 text-white p-3.5 rounded-2xl space-y-1 mb-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                    हालको बचत मौज्दात (Current Balance)
                  </span>
                  <div className="font-black text-lg font-mono text-amber-300">
                    {formatCurrencyNPR(acc.current_balance)}
                  </div>
                  <div className="text-[10px] text-emerald-200/80 pt-1 border-t border-emerald-800/60 flex items-center justify-between">
                    <span>जिम्मा: {assignedAgent?.full_name || 'अज्ञात'}</span>
                    <span>सुरुवाती: {formatCurrencyNPR(acc.opening_balance)}</span>
                  </div>
                </div>

                {/* If closed, show closure reason */}
                {!isActive && acc.closure_reason && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-xs space-y-0.5 mb-3">
                    <span className="font-bold block text-[10px] uppercase">खाता बन्द गरिएको कारण:</span>
                    <p className="text-[11px]">{acc.closure_reason}</p>
                  </div>
                )}
              </div>

              {/* Bottom Quick Controls */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPassbookAccount(acc)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-800 py-1.5 px-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>पासबुक (Passbook)</span>
                </button>

                {isActive && (
                  <button
                    onClick={() => onOpenTransactionModal(acc)}
                    className="flex items-center gap-1 text-xs font-extrabold text-emerald-900 bg-amber-300 hover:bg-amber-400 px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>संकलन / भुक्तानी</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-dashed border-slate-300">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h4 className="font-bold text-slate-700 text-base">कुनै सदस्य खाता भेटिएन</h4>
          <p className="text-xs text-slate-400 mt-1">
            खोज शब्द परिवर्तन गर्नुहोस् वा माथिबाट नयाँ खाता खोल्नुहोस्।
          </p>
        </div>
      )}

      {/* Member Passbook / Statement Modal */}
      {passbookAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between border-b border-emerald-800 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-lg">{passbookAccount.name}</h3>
                  <span className="bg-amber-400 text-emerald-950 font-mono text-xs font-black px-2 py-0.5 rounded-lg">
                    {passbookAccount.account_no}
                  </span>
                </div>
                <p className="text-xs text-emerald-200">
                  {passbookAccount.address} • सम्पर्क: {passbookAccount.contact_number}
                </p>
              </div>
              <button
                onClick={() => setPassbookAccount(null)}
                className="text-emerald-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Passbook statement summary */}
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-600">हालको कुल बचत मौज्दात:</span>
              <span className="text-base font-black text-emerald-950 font-mono">
                {formatCurrencyNPR(passbookAccount.current_balance)}
              </span>
            </div>

            {/* Ledger Transactions */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                कारोबार भौचर विवरण (Ledger Statement)
              </h4>
              {transactions.filter((t) => t.account_id === passbookAccount.id).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  हालसम्म कुनै दैनिक संकलन रेकर्ड भएको छैन।
                </p>
              ) : (
                transactions
                  .filter((t) => t.account_id === passbookAccount.id)
                  .map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                            tx.type === 'deposit'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.type === 'deposit' ? (
                            <ArrowDownRight className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 font-sans block">
                            {tx.type === 'deposit' ? 'दैनिक बचत जम्मा' : 'बचत रकम भुक्तानी'}
                          </span>
                          <span className="text-[10px] text-slate-500">{tx.nepali_date} BS</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-black text-sm ${
                            tx.type === 'deposit' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {tx.type === 'deposit' ? '+' : '-'} {formatCurrencyNPR(tx.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{tx.remarks || ''}</span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setPassbookAccount(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                बन्द गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">सदस्य विवरण सम्पादन (Edit Member)</h3>
              <button onClick={() => setEditingAccount(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">खाता नम्बर (Account No):</label>
                <input
                  type="text"
                  disabled
                  value={editingAccount.account_no}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">सदस्यको नाम (Name):</label>
                <input
                  type="text"
                  required
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">नेपाली नाम (Nepali Name):</label>
                <input
                  type="text"
                  value={editingAccount.nepali_name || ''}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, nepali_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ठेगाना (Address):</label>
                <input
                  type="text"
                  required
                  value={editingAccount.address}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, address: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">सम्पर्क नं (Contact):</label>
                <input
                  type="tel"
                  required
                  value={editingAccount.contact_number}
                  onChange={(e) =>
                    setEditingAccount({ ...editingAccount, contact_number: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              {activeProfile.role === 'admin' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">जिम्मेवार प्रतिनिधि:</label>
                  <select
                    value={editingAccount.assigned_agent_id}
                    onChange={(e) =>
                      setEditingAccount({
                        ...editingAccount,
                        assigned_agent_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {profiles
                      .filter((p) => p.role === 'agent')
                      .map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          {ag.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-slate-600 font-bold"
                >
                  रद्द
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white font-extrabold rounded-xl"
                >
                  सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Account (Soft Delete / Banda Garne) Modal */}
      {closingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h3 className="font-black text-base">खाता बन्द गर्ने पुष्टिकरण (Close Account)</h3>
                <p className="text-xs text-rose-600">मानस कृषि सहकारी संस्था लि.</p>
              </div>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-xs space-y-2 text-rose-950">
              <p>
                के तपाईं <strong>{closingAccount.name}</strong> ({closingAccount.account_no}) को बचत खाता बन्द गर्न निश्चित हुनुहुन्छ?
              </p>
              <div className="font-mono bg-white p-2.5 rounded-xl border border-rose-200 flex justify-between font-bold">
                <span>हालको मौज्दात:</span>
                <span className="text-rose-800">{formatCurrencyNPR(closingAccount.current_balance)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                खाता बन्द गर्नुको कारण (Reason for Closure):
              </label>
              <textarea
                rows={2}
                required
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClosingAccount(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs rounded-xl shadow-md"
              >
                खाता बन्द गर्नुहोस् (Confirm Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
