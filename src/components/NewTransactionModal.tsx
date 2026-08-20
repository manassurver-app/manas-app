import React, { useState } from 'react';
import { PlusCircle, MinusCircle, CheckCircle, X, Coins, Calendar, User, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Account, Profile, Transaction, TransactionType } from '../types';
import { getCurrentNepaliDate, formatCurrencyNPR, NEPALI_MONTHS, toNepaliNumerals } from '../utils/nepaliCalendar';

interface NewTransactionModalProps {
  account: Account;
  agent: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id' | 'created_at' | 'sync_status'>) => void;
  lang: 'ne' | 'en';
}

const PRESET_AMOUNTS = [50, 100, 200, 300, 500, 1000, 2000];

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  account,
  agent,
  isOpen,
  onClose,
  onSubmit,
  lang,
}) => {
  const nepaliDate = getCurrentNepaliDate();
  const [type, setType] = useState<TransactionType>('deposit');
  const [amount, setAmount] = useState<number | string>(100);
  const [selectedDay, setSelectedDay] = useState<number>(nepaliDate.day);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(nepaliDate.month);
  const [selectedYear, setSelectedYear] = useState<number>(nepaliDate.year);
  const [remarks, setRemarks] = useState<string>('दैनिक बचत संकलन');

  if (!isOpen) return null;

  const currentMonthObj = NEPALI_MONTHS[selectedMonthIndex - 1] || NEPALI_MONTHS[3];
  const formattedNepaliDate = `${selectedYear}-${String(selectedMonthIndex).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const monthYearStr = `${currentMonthObj.en} ${selectedYear}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    if (type === 'withdrawal' && numAmount > account.current_balance) {
      alert(lang === 'ne' ? 'रकम पुगेन! खातामा मौज्दात भन्दा धेरै भुक्तानी गर्न मिल्दैन।' : 'Insufficient balance for withdrawal!');
      return;
    }

    onSubmit({
      account_id: account.id,
      agent_id: agent.id,
      type,
      amount: numAmount,
      nepali_date: formattedNepaliDate,
      day_number: selectedDay,
      month_year: monthYearStr,
      remarks: remarks.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-green-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shadow">
              {type === 'deposit' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                {type === 'deposit'
                  ? (lang === 'ne' ? 'नयाँ बचत जम्मा (Deposit)' : 'Record Deposit')
                  : (lang === 'ne' ? 'रकम भुक्तानी (Withdrawal)' : 'Record Withdrawal')}
              </h3>
              <p className="text-xs text-emerald-200">
                खाता नं: <strong className="text-amber-300 font-mono">{account.account_no}</strong> | {account.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Card Glance */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-emerald-800 font-medium">खातावाला सदस्य (Member):</span>
              <p className="font-bold text-slate-900 text-sm">{account.name}</p>
              <p className="text-slate-600">{account.address} • {account.contact_number}</p>
            </div>
            <div className="text-right">
              <span className="text-emerald-800 font-medium">हालको मौज्दात:</span>
              <p className="font-black text-emerald-900 text-base font-mono">
                {formatCurrencyNPR(account.current_balance)}
              </p>
            </div>
          </div>

          {/* Type Toggle: Deposit vs Withdrawal */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('deposit')}
              className={`py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                type === 'deposit'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'ne' ? 'बचत जम्मा (Deposit)' : 'Deposit'}</span>
            </button>
            <button
              type="button"
              onClick={() => setType('withdrawal')}
              className={`py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                type === 'withdrawal'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MinusCircle className="w-4 h-4" />
              <span>{lang === 'ne' ? 'रकम भुक्तानी (Withdrawal)' : 'Withdrawal'}</span>
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'ne' ? 'रकम (Amount in Rs.):' : 'Amount (NPR)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                रु.
              </span>
              <input
                id="transaction-amount-input"
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="रकम प्रविष्ट गर्नुहोस् (e.g. 200)"
                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-emerald-600 rounded-xl font-bold text-lg text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-700"
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    Number(amount) === amt
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  +{formatCurrencyNPR(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Nepali BS Date & Day selector */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">साल (Year)</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-800 outline-none"
              >
                <option value={2081}>२०८१ (2081)</option>
                <option value={2082}>२०८२ (2082)</option>
                <option value={2083}>२०८३ (2083)</option>
                <option value={2084}>२०८४ (2084)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">महिना (Month)</label>
              <select
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-800 outline-none"
              >
                {NEPALI_MONTHS.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.ne} ({m.en})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">गते (Day 1-32)</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-bold text-slate-800 outline-none"
              >
                {Array.from({ length: currentMonthObj.days }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {toNepaliNumerals(d)} ({d})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {lang === 'ne' ? 'कैफियत / टिप्पणी (Remarks):' : 'Remarks / Note:'}
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. दैनिक बचत संकलन / हाटबजार"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {lang === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
            </button>
            <button
              id="confirm-transaction-btn"
              type="submit"
              className={`flex-1 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 ${
                type === 'deposit'
                  ? 'bg-emerald-800 hover:bg-emerald-900'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {type === 'deposit'
                  ? (lang === 'ne' ? 'जम्मा सुरक्षित गर्नुहोस् (Record)' : 'Confirm Deposit')
                  : (lang === 'ne' ? 'भुक्तानी सम्पन्न गर्नुहोस्' : 'Confirm Withdrawal')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
