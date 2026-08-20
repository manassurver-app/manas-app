import React, { useState } from 'react';
import {
  UserPlus,
  Coins,
  X,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Account, Profile } from '../types';
import { toNepaliNumerals, formatCurrencyNPR } from '../utils/nepaliCalendar';
import { supabaseCreateAccount } from '../lib/supabase';

interface AccountCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  activeProfile: Profile;
  onAccountCreated: (newAccount: Account) => void;
  lang: 'ne' | 'en';
}

export const AccountCreateModal: React.FC<AccountCreateModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  onAccountCreated,
  lang,
}) => {
  const [accountNo, setAccountNo] = useState(() => `MKS-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState('');
  const [nepaliName, setNepaliName] = useState('');
  const [address, setAddress] = useState('टिकापुर-१, ');
  const [contactNumber, setContactNumber] = useState('98');
  const [openingBalance, setOpeningBalance] = useState('500');
  const [assignedAgentId, setAssignedAgentId] = useState(() =>
    activeProfile.role === 'agent'
      ? activeProfile.id
      : profiles.find((p) => p.role === 'agent')?.id || activeProfile.id
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successAcc, setSuccessAcc] = useState<Account | null>(null);

  if (!isOpen) return null;

  const handleGenerateAccountNo = () => {
    setAccountNo(`MKS-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('कृपया सदस्यको नाम प्रविष्ट गर्नुहोस् (Member name required)');
      return;
    }

    if (!accountNo.trim()) {
      setErrorMsg('कृपया खाता नम्बर प्रविष्ट गर्नुहोस् (Account number required)');
      return;
    }

    if (contactNumber.length < 10) {
      setErrorMsg('कृपया कम्तिमा १० अंकको मोबाइल नम्बर प्रविष्ट गर्नुहोस् (Valid phone number required)');
      return;
    }

    const openBal = parseFloat(openingBalance) || 0;
    if (openBal < 0) {
      setErrorMsg('प्रारम्भिक मौज्दात ० वा सोभन्दा बढी हुनुपर्छ (Opening balance must be >= 0)');
      return;
    }

    const res = supabaseCreateAccount(
      {
        account_no: accountNo.trim().toUpperCase(),
        name: name.trim(),
        nepali_name: nepaliName.trim() || undefined,
        address: address.trim(),
        contact_number: contactNumber.trim(),
        assigned_agent_id: activeProfile.role === 'agent' ? activeProfile.id : assignedAgentId,
        opening_balance: openBal,
        status: 'active',
      },
      activeProfile
    );

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessAcc(res.account);
      onAccountCreated(res.account);
    }
  };

  const handleResetAndClose = () => {
    setSuccessAcc(null);
    setErrorMsg(null);
    setName('');
    setNepaliName('');
    setAddress('टिकापुर-१, ');
    setContactNumber('98');
    setOpeningBalance('500');
    handleGenerateAccountNo();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg">
                {lang === 'ne' ? 'नयाँ सदस्य बचत खाता खोल्ने फारम' : 'Open New Member Savings Account'}
              </h3>
              <p className="text-xs text-emerald-200">मानस कृषि सहकारी संस्था लि., टिकापुर-१, कैलाली</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-emerald-300 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        {successAcc ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-black text-slate-900">
                {lang === 'ne' ? 'नयाँ खाता सफलतापूर्वक खोलियो!' : 'Account Created Successfully!'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                सदस्य खाता प्रणालीमा सुरक्षित रूपमा दर्ता भइसकेको छ।
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">खाता नम्बर (Account No):</span>
                <strong className="text-emerald-800 text-sm">{successAcc.account_no}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">सदस्यको नाम (Member Name):</span>
                <strong className="text-slate-900">{successAcc.name}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">ठेगाना (Address):</span>
                <span className="text-slate-800">{successAcc.address}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">सम्पर्क नं (Contact):</span>
                <span className="text-slate-800 font-bold">{successAcc.contact_number}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">सुरुवाती मौज्दात (Opening Bal):</span>
                <strong className="text-emerald-800 text-sm">
                  {formatCurrencyNPR(successAcc.opening_balance)}
                </strong>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleResetAndClose}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                सम्पन्न (Done)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Account Number & Auto-Gen */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-extrabold text-slate-700">
                  खाता नम्बर (Account Number) *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAccountNo}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>स्वतः उत्पन्न (Auto-Gen)</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black text-emerald-950 uppercase focus:bg-white focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            {/* Member Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  सदस्यको नाम (Member Name in English/Nepali) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sita Devi Chaudhary"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  नेपालीमा नाम (Devanagari Name - Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. सीता देवी चौधरी"
                  value={nepaliName}
                  onChange={(e) => setNepaliName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            {/* Address & Contact Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  ठेगाना (Address) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="टिकापुर-१, ब्लक A"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  सम्पर्क मोबाइल नं (Mobile Number) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* Opening Balance */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                सुरुवाती मौज्दात (Opening Balance NPR) *
              </label>
              <div className="relative">
                <Coins className="w-4 h-4 text-amber-600 absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div className="flex gap-2 mt-1.5">
                {[100, 500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setOpeningBalance(amt.toString())}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-700 font-mono transition-colors"
                  >
                    Rs.{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned Agent Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                जिम्मेवार बजार प्रतिनिधि (Assigned Bajar Pratinidhi) *
              </label>
              {activeProfile.role === 'admin' ? (
                <select
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-700"
                >
                  {profiles
                    .filter((p) => p.role === 'agent')
                    .map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.full_name} ({ag.assigned_area || 'Tikapur-1'})
                      </option>
                    ))}
                </select>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-950">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-700" />
                    <span>{activeProfile.full_name} (तपाईंको आफ्नै जिम्मा)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Self-Assigned
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>खाता खोल्नुहोस् (Open Account)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
