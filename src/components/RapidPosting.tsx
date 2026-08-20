import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RotateCcw,
  Printer,
  ChevronRight,
  Coins,
  Wallet,
  Calendar,
  X,
  CreditCard,
  Building2,
  Receipt,
  UserCheck,
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
import { queueOfflineTransaction } from '../lib/syncManager';

interface RapidPostingProps {
  accounts: Account[];
  transactions: Transaction[];
  agent: Profile;
  onRefresh: () => void;
  onViewReceipt: (tx: Transaction, account: Account) => void;
  lang: 'ne' | 'en';
}

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export const RapidPosting: React.FC<RapidPostingProps> = ({
  accounts,
  transactions,
  agent,
  onRefresh,
  onViewReceipt,
  lang,
}) => {
  const currentDateInfo = getCurrentNepaliDate();

  // Date and Session State
  const [selectedYear, setSelectedYear] = useState<number>(currentDateInfo.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDateInfo.month);
  const [selectedDay, setSelectedDay] = useState<number>(currentDateInfo.day);

  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [enteredAmount, setEnteredAmount] = useState<number | ''>(100);
  const [customRemarks, setCustomRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Toast & Recent Feed
  const [lastRecordedTx, setLastRecordedTx] = useState<{
    transaction: Transaction;
    account: Account;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const monthObj = NEPALI_MONTHS[selectedMonth - 1] || NEPALI_MONTHS[3];
  const formattedNepaliDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const monthYearStr = `${monthObj.en} ${selectedYear}`;

  // Filter accessible accounts based on agent assignment (or all for admin)
  const accessibleAccounts = useMemo(() => {
    if (agent.role === 'admin') {
      return accounts.filter((a) => a.status === 'active');
    }
    return accounts.filter(
      (a) => a.assigned_agent_id === agent.id && a.status === 'active'
    );
  }, [accounts, agent]);

  // Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return accessibleAccounts
      .filter((acc) => {
        return (
          acc.account_no.toLowerCase().includes(q) ||
          acc.name.toLowerCase().includes(q) ||
          acc.nepali_name?.toLowerCase().includes(q) ||
          acc.contact_number.includes(q) ||
          acc.address.toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [accessibleAccounts, searchQuery]);

  // Agent's Daily Collection Totals for the Selected Date
  const agentDailyMetrics = useMemo(() => {
    let depositSum = 0;
    let withdrawalSum = 0;
    let count = 0;
    const uniqueAccIds = new Set<string>();

    transactions.forEach((tx) => {
      const matchAgent = agent.role === 'admin' || tx.agent_id === agent.id;
      const matchDate = tx.nepali_date === formattedNepaliDate;

      if (matchAgent && matchDate) {
        if (tx.type === 'deposit') {
          depositSum += Number(tx.amount);
        } else {
          withdrawalSum += Number(tx.amount);
        }
        count++;
        uniqueAccIds.add(tx.account_id);
      }
    });

    return {
      depositSum,
      withdrawalSum,
      netSum: depositSum - withdrawalSum,
      count,
      uniqueMembers: uniqueAccIds.size,
    };
  }, [transactions, agent, formattedNepaliDate]);

  // Recent Collections in this session
  const recentAgentTransactions = useMemo(() => {
    return transactions
      .filter((tx) => (agent.role === 'admin' || tx.agent_id === agent.id))
      .slice(0, 5);
  }, [transactions, agent]);

  // Calculated Project Balance
  const numAmount = typeof enteredAmount === 'number' ? enteredAmount : 0;
  const projectedBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    if (txType === 'deposit') {
      return selectedAccount.current_balance + numAmount;
    } else {
      return selectedAccount.current_balance - numAmount;
    }
  }, [selectedAccount, txType, numAmount]);

  const isWithdrawalExceeding =
    txType === 'withdrawal' &&
    selectedAccount &&
    numAmount > selectedAccount.current_balance;

  // Auto-focus search input on initial load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Handle Account Selection
  const handleSelectAccount = (acc: Account) => {
    setSelectedAccount(acc);
    setSearchQuery('');
    // Auto focus amount input
    setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }, 100);
  };

  // Add preset chip value
  const handlePresetClick = (amountVal: number) => {
    setEnteredAmount(amountVal);
  };

  // Quick Keypad append
  const handleKeypadPress = (digit: string) => {
    if (digit === 'C') {
      setEnteredAmount('');
      return;
    }
    if (digit === '00') {
      const current = typeof enteredAmount === 'number' ? String(enteredAmount) : '';
      if (!current || current === '0') return;
      setEnteredAmount(parseInt(current + '00', 10));
      return;
    }
    const current = typeof enteredAmount === 'number' ? String(enteredAmount) : '';
    const updated = current + digit;
    const parsed = parseInt(updated, 10);
    if (!isNaN(parsed)) {
      setEnteredAmount(parsed);
    }
  };

  // Handle Form Submission (Rapid Post)
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) {
      alert('कृपया पहिले सदस्य खाता छान्नुहोस् (Please select a member)');
      searchInputRef.current?.focus();
      return;
    }

    if (!numAmount || numAmount <= 0) {
      alert('कृपया मान्य रकम प्रविष्ट गर्नुहोस् (Please enter a valid amount)');
      amountInputRef.current?.focus();
      return;
    }

    if (isWithdrawalExceeding) {
      alert('फिर्ता रकम मौज्दात भन्दा बढी हुन सक्दैन (Withdrawal exceeds balance)');
      return;
    }

    setIsSubmitting(true);

    try {
      const remarksText =
        customRemarks.trim() ||
        (txType === 'deposit' ? 'दैनिक बचत संकलन (Field Rapid Entry)' : 'बचत फिर्ता भुक्तानी');

      const result = await queueOfflineTransaction(
        {
          account_id: selectedAccount.id,
          agent_id: agent.id,
          type: txType,
          amount: numAmount,
          nepali_date: formattedNepaliDate,
          day_number: selectedDay,
          month_year: monthYearStr,
          remarks: remarksText,
        },
        selectedAccount,
        agent
      );

      // Trigger celebratory confetti on deposit
      if (txType === 'deposit') {
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#059669', '#10B981', '#34D399', '#FBBF24'],
          });
        } catch {
          // ignore if unavailable
        }
      }

      const updatedAccountRef = {
        ...selectedAccount,
        current_balance: result.newBalance,
      };

      setLastRecordedTx({
        transaction: result.transaction,
        account: updatedAccountRef,
      });

      // Rapid flow: Reset for next account and re-focus search
      setSelectedAccount(null);
      setEnteredAmount(100);
      setCustomRemarks('');
      onRefresh();

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    } catch (err: any) {
      alert('कारोबार सुरक्षित गर्न सकिएन: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* 1. AGENT DAILY METRICS SUMMARY WIDGET */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-3xl p-4 sm:p-6 shadow-md border border-emerald-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {lang === 'ne' ? 'रैपिड फिल्ड बचत संकलन (Quick Entry)' : 'Rapid Field Cash Posting'}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ⚡ Mobile First
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                प्रतिनिधि: <strong>{agent.full_name}</strong> • क्षेत्र: {agent.assigned_area || 'टिकापुर-१'}
              </p>
            </div>
          </div>

          {/* BS Date Indicator */}
          <div className="flex items-center gap-2 bg-emerald-950/80 px-3 py-1.5 rounded-2xl border border-emerald-700/60 text-xs font-mono font-bold">
            <Calendar className="w-4 h-4 text-amber-300" />
            <span className="text-amber-300">{formatBSToNepaliDate(formattedNepaliDate)}</span>
            <span className="text-emerald-300/80 text-[10px]">({formattedNepaliDate} BS)</span>
          </div>
        </div>

        {/* Live Daily Totals 4-Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Deposit Collected */}
          <div className="bg-emerald-900/60 p-3 rounded-2xl border border-emerald-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>आजको कुल सङ्कलन</span>
            </span>
            <div className="text-base sm:text-xl font-black font-mono text-emerald-300 mt-1">
              {formatCurrencyNPR(agentDailyMetrics.depositSum)}
            </div>
          </div>

          {/* Total Withdrawn */}
          <div className="bg-rose-950/40 p-3 rounded-2xl border border-rose-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
              <span>आजको कुल फिर्ता</span>
            </span>
            <div className="text-base sm:text-xl font-black font-mono text-rose-300 mt-1">
              {formatCurrencyNPR(agentDailyMetrics.withdrawalSum)}
            </div>
          </div>

          {/* Net Collection */}
          <div className="bg-amber-950/40 p-3 rounded-2xl border border-amber-700/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>खुद जम्मा (Net Cash)</span>
            </span>
            <div className="text-base sm:text-xl font-black font-mono text-amber-300 mt-1">
              {formatCurrencyNPR(agentDailyMetrics.netSum)}
            </div>
          </div>

          {/* Count & Members */}
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>कारोबार संख्या</span>
            </span>
            <div className="text-sm sm:text-base font-black font-mono text-white mt-1 flex items-baseline justify-between">
              <span>{toNepaliNumerals(agentDailyMetrics.count)} भौचर</span>
              <span className="text-[10px] text-emerald-300 font-normal">
                ({toNepaliNumerals(agentDailyMetrics.uniqueMembers)} सदस्य)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert if just recorded */}
      {lastRecordedTx && (
        <div className="bg-emerald-100 border-2 border-emerald-500 text-emerald-950 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                <span>
                  {lastRecordedTx.account.name} को खातामा{' '}
                  <strong className="font-mono text-emerald-900">
                    {formatCurrencyNPR(lastRecordedTx.transaction.amount)}
                  </strong>{' '}
                  {lastRecordedTx.transaction.type === 'deposit' ? 'जम्मा' : 'फिर्ता'} भयो!
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-mono font-bold">
                  {lastRecordedTx.account.account_no}
                </span>
              </div>
              <p className="text-xs text-emerald-800">
                नयाँ बचत मौज्दात: <strong>{formatCurrencyNPR(lastRecordedTx.account.current_balance)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => onViewReceipt(lastRecordedTx.transaction, lastRecordedTx.account)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>रसिद / SMS हेर्नुहोस्</span>
            </button>
            <button
              onClick={() => setLastRecordedTx(null)}
              className="p-1 text-emerald-800 hover:text-emerald-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. RAPID POSTING INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left / Main Entry Card (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          {/* Step 1: Member Search Bar */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>१. सदस्य खोज्नुहोस् (Search Account No / Name)</span>
              {selectedAccount && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccount(null);
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-emerald-700 hover:underline text-[11px] font-bold cursor-pointer"
                >
                  परिवर्तन गर्नुहोस् (Change)
                </button>
              )}
            </label>

            {!selectedAccount ? (
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  ref={searchInputRef}
                  id="rapid-member-search-input"
                  type="text"
                  placeholder={
                    lang === 'ne'
                      ? 'खाता नं (MKS-1001), सदस्यको नाम वा मोबाइल नम्बर टाइप गर्नुहोस्...'
                      : 'Type Account No, Member Name or Phone...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-emerald-700 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 outline-none transition-all"
                />

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-2xl z-30 divide-y divide-slate-100 overflow-hidden animate-in fade-in-50">
                    {searchResults.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleSelectAccount(acc)}
                        className="w-full p-3 text-left hover:bg-emerald-50/80 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-xs bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-xl">
                            {acc.account_no}
                          </span>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900">{acc.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {acc.address} • {acc.contact_number}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">मौज्दात</span>
                          <span className="font-mono font-black text-xs text-emerald-900">
                            {formatCurrencyNPR(acc.current_balance)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Member Card Banner */
              <div className="bg-emerald-950 text-white rounded-2xl p-4 flex items-center justify-between border border-emerald-800 shadow-xs animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black text-base shadow-sm">
                    {selectedAccount.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-white">{selectedAccount.name}</h3>
                      <span className="bg-emerald-800 text-amber-300 font-mono text-[11px] font-black px-2 py-0.5 rounded-lg border border-emerald-700">
                        {selectedAccount.account_no}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-200/80 mt-0.5">
                      {selectedAccount.address} • {selectedAccount.contact_number}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                    हालको बचत मौज्दात
                  </span>
                  <span className="text-base font-black font-mono text-amber-300">
                    {formatCurrencyNPR(selectedAccount.current_balance)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Transaction Type Toggle & Nepali BS Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Type Toggle */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                २. कारोबारको प्रकार (Type)
              </label>
              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200">
                <button
                  type="button"
                  id="btn-toggle-type-deposit"
                  onClick={() => setTxType('deposit')}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'deposit'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-emerald-300" />
                  <span>जम्मा (Deposit)</span>
                </button>

                <button
                  type="button"
                  id="btn-toggle-type-withdrawal"
                  onClick={() => setTxType('withdrawal')}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    txType === 'withdrawal'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-rose-300" />
                  <span>फिर्ता (Withdraw)</span>
                </button>
              </div>
            </div>

            {/* Day Selector (Defaults to today) */}
            <div>
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                भौचर गते (B.S. Day: {monthObj.ne})
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value, 10))}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700 cursor-pointer"
                >
                  {Array.from({ length: monthObj.days }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {toNepaliNumerals(d)} गते ({d} {monthObj.en})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Preset Amount Chips */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
              ३. सिफारिस रकम (Quick Preset Chips)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handlePresetClick(amt)}
                  className={`py-2 px-1 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer ${
                    enteredAmount === amt
                      ? txType === 'deposit'
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                        : 'bg-rose-700 text-white border-rose-800 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Amount Entry Field */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
              ४. कारोबार रकम प्रविष्ट गर्नुहोस् (Amount in NPR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400 font-bold text-sm">रू (Rs.)</span>
              <input
                ref={amountInputRef}
                id="rapid-amount-input"
                type="number"
                min="10"
                step="10"
                required
                placeholder="रकम प्रविष्ट गर्नुहोस्..."
                value={enteredAmount}
                onChange={(e) =>
                  setEnteredAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="w-full pl-20 pr-4 py-3 bg-slate-50 border-2 border-slate-300 focus:border-emerald-700 focus:bg-white rounded-2xl text-xl font-mono font-black text-slate-900 outline-none"
              />
            </div>
          </div>

          {/* Live Balance Preview Calculation */}
          {selectedAccount && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1.5 transition-all ${
                isWithdrawalExceeding
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>हालको मौज्दात (Current):</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrencyNPR(selectedAccount.current_balance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>
                  {txType === 'deposit' ? 'जम्मा थप रकम (+):' : 'फिर्ता घट्ने रकम (-):'}
                </span>
                <span
                  className={`font-mono font-black ${
                    txType === 'deposit' ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {txType === 'deposit' ? '+' : '-'} {formatCurrencyNPR(numAmount)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-sm">
                <span className="text-slate-900">नयाँ मौज्दात (Projected Balance):</span>
                <span
                  className={`font-mono text-base ${
                    isWithdrawalExceeding
                      ? 'text-rose-700 animate-pulse'
                      : 'text-emerald-950'
                  }`}
                >
                  {formatCurrencyNPR(projectedBalance)}
                </span>
              </div>

              {isWithdrawalExceeding && (
                <p className="text-[11px] text-rose-700 font-bold pt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>फिर्ता रकम सदस्यको बचत मौज्दात भन्दा बढी छ!</span>
                </p>
              )}
            </div>
          )}

          {/* Remarks Field (Optional) */}
          <div>
            <input
              type="text"
              placeholder="कैफियत (Remarks e.g. पसल संकलन, बजार लाइन...) [वैकल्पिक]"
              value={customRemarks}
              onChange={(e) => setCustomRemarks(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          {/* Action Submit Button */}
          <button
            type="button"
            id="btn-submit-rapid-transaction"
            onClick={handleSubmitTransaction}
            disabled={!selectedAccount || !numAmount || numAmount <= 0 || isWithdrawalExceeding || isSubmitting}
            className={`w-full py-3.5 px-5 rounded-2xl text-white font-extrabold text-sm sm:text-base shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${
              txType === 'deposit'
                ? 'bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300'
                : 'bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300'
            }`}
          >
            <Zap className="w-5 h-5 text-amber-300" />
            <span>
              {isSubmitting
                ? 'सुरक्षित हुँदैछ...'
                : txType === 'deposit'
                ? `रू ${numAmount ? toNepaliNumerals(numAmount) : '०'} जम्मा सुरक्षित गर्नुहोस् (Save & Next)`
                : `रू ${numAmount ? toNepaliNumerals(numAmount) : '०'} भुक्तानी सुरक्षित गर्नुहोस्`}
            </span>
          </button>
        </div>

        {/* Right Column: Numeric Keypad & Recent Transactions Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* On-screen Keypad for Rapid Phone/Touch usage */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                मोबाइल द्रुत किप्याड (Touch Keypad)
              </span>
              <button
                type="button"
                onClick={() => handleKeypadPress('C')}
                className="text-xs font-extrabold text-rose-600 hover:underline cursor-pointer"
              >
                हटाउनुहोस् (Clear)
              </button>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'C'].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleKeypadPress(btn)}
                  className={`py-3.5 rounded-2xl font-mono font-black text-base transition-all active:scale-90 cursor-pointer shadow-2xs border ${
                    btn === 'C'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-800 border-slate-200'
                  }`}
                >
                  {btn === 'C' ? '⌫' : btn}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Collections in this Session */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>भर्खरै गरिएका संकलन (Recent Feed)</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-400">अन्तिम ५ कारोबार</span>
            </div>

            <div className="space-y-2">
              {recentAgentTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  अहिलेसम्म कुनै कारोबार प्रविष्ट गरिएको छैन।
                </p>
              ) : (
                recentAgentTransactions.map((tx) => {
                  const targetAcc = accounts.find((a) => a.id === tx.account_id);
                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[10px] ${
                            tx.type === 'deposit'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.type === 'deposit' ? '+' : '-'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 truncate max-w-[120px]">
                            {targetAcc?.name || 'सदस्य'}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">
                            {targetAcc?.account_no} • {tx.nepali_date} BS
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-black ${
                            tx.type === 'deposit' ? 'text-emerald-800' : 'text-rose-800'
                          }`}
                        >
                          {formatCurrencyNPR(tx.amount)}
                        </span>
                        {targetAcc && (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(tx, targetAcc)}
                            className="p-1 text-slate-400 hover:text-emerald-800 rounded-lg"
                            title="रसिद हेर्नुहोस्"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
