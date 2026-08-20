import React, { useState } from 'react';
import { Printer, MessageSquare, Check, Copy, X, Share2, ArrowRight } from 'lucide-react';
import { Transaction, Account, Profile } from '../types';
import { formatCurrencyNPR, formatBSToNepaliDate, toNepaliNumerals } from '../utils/nepaliCalendar';

interface ReceiptModalProps {
  transaction: Transaction;
  account: Account;
  agent: Profile;
  onClose: () => void;
  lang: 'ne' | 'en';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  account,
  agent,
  onClose,
  lang,
}) => {
  const [copiedSms, setCopiedSms] = useState(false);

  const smsText = `मानस कृषि सहकारी, टिकापुर: खाता नं. ${account.account_no} (${account.nepali_name || account.name}) मा मिति ${transaction.nepali_date} मा रु. ${transaction.amount} ${transaction.type === 'deposit' ? 'जम्मा' : 'भुक्तानी'} भयो। नयाँ मौज्दात: रु. ${account.current_balance}। संकलनकर्ता: ${agent.full_name}। धन्यवाद!`;

  const handleCopySMS = () => {
    navigator.clipboard.writeText(smsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-amber-300 font-bold">
              ✓
            </div>
            <div>
              <h3 className="font-bold text-base">
                {lang === 'ne' ? 'कारोबार रसिद (Collection Receipt)' : 'Transaction Receipt'}
              </h3>
              <p className="text-xs text-emerald-200">
                {transaction.sync_status === 'synced' ? 'सर्भरमा दर्ता भएको' : 'स्थानीय मेमोरीमा सुरक्षित'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Area */}
        <div className="p-6 bg-slate-50">
          <div
            id="thermal-receipt-print-area"
            className="bg-white p-5 rounded-xl border border-slate-300 shadow-xs font-mono text-xs text-slate-800 space-y-3"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3">
              <h2 className="font-bold text-sm text-emerald-950 font-sans">
                मानस कृषि सहकारी संस्था लि.
              </h2>
              <p className="text-[11px] text-slate-600 font-sans">
                टिकापुर-१, कैलाली (सुदूरपश्चिम प्रदेश)
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                फोन: ०९१-५६०१११ | दर्ता नं: ९८५/०६८/०६९
              </p>
              <div className="mt-1.5 inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold uppercase tracking-wider text-slate-700">
                {transaction.type === 'deposit' ? 'दैनिक बचत संकलन भौचर' : 'रकम भुक्तानी भौचर'}
              </div>
            </div>

            {/* Meta details */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">रसिद नं (Receipt No):</span>
                <span className="font-semibold">{transaction.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">मिति (Nepali BS):</span>
                <span className="font-semibold">{transaction.nepali_date} ({formatBSToNepaliDate(transaction.nepali_date)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">समय (Time):</span>
                <span>{new Date(transaction.created_at).toLocaleTimeString('ne-NP', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-2"></div>

            {/* Member & Account Details */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">खाता नं (A/C No):</span>
                <span className="font-bold text-emerald-800">{account.account_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">सदस्यको नाम (Name):</span>
                <span className="font-semibold">{account.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ठेगाना (Address):</span>
                <span>{account.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">सम्पर्क (Contact):</span>
                <span>{account.contact_number}</span>
              </div>
            </div>

            <div className="border-t border-b border-slate-400 py-2 my-2 bg-emerald-50/50 px-2 rounded">
              <div className="flex justify-between text-sm font-bold text-emerald-950 font-sans">
                <span>{transaction.type === 'deposit' ? 'जम्मा रकम (Collected):' : 'भुक्तानी रकम (Withdrawn):'}</span>
                <span>{formatCurrencyNPR(transaction.amount)}</span>
              </div>
            </div>

            {/* Balances */}
            <div className="space-y-1 text-[11px] pt-1">
              <div className="flex justify-between text-slate-600">
                <span>नयाँ कुल मौज्दात (New Balance):</span>
                <span className="font-bold text-slate-900">{formatCurrencyNPR(account.current_balance)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>महिना (Month):</span>
                <span>{transaction.month_year} (गते {toNepaliNumerals(transaction.day_number)})</span>
              </div>
              {transaction.remarks && (
                <div className="flex justify-between text-slate-500 italic">
                  <span>कैफियत (Remarks):</span>
                  <span>{transaction.remarks}</span>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="border-t border-dashed border-slate-300 pt-6 mt-4 flex justify-between text-[10px] text-center">
              <div>
                <div className="border-b border-slate-400 w-24 mb-1"></div>
                <span>सदस्यको दस्तखत</span>
              </div>
              <div>
                <div className="border-b border-slate-400 w-24 mb-1 font-sans font-medium text-[9px] text-slate-700">
                  {agent.full_name.split(' ')[0]}
                </div>
                <span>बजार प्रतिनिधि</span>
              </div>
            </div>

            <p className="text-[9px] text-center text-slate-400 pt-1 font-sans">
              मानस कृषि सहकारी संस्था लिमिटेड, टिकापुर - धन्यवाद!
            </p>
          </div>

          {/* SMS Draft Quick Preview & Copy */}
          <div className="mt-4 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                सदस्यलाई पठाउने SMS सन्देश (SMS Draft):
              </span>
              <button
                onClick={handleCopySMS}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
              >
                {copiedSms ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>कपी भयो!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy SMS</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-sans leading-relaxed">
              {smsText}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            id="print-thermal-receipt-btn"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ne' ? 'थर्मल रसिद प्रिन्ट (Print 80mm)' : 'Print Thermal Receipt'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
          >
            {lang === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
