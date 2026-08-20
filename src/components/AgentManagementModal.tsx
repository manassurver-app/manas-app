import React, { useState } from 'react';
import { UserCheck, ShieldCheck, Plus, X, Phone, MapPin, Mail, Award, CheckCircle } from 'lucide-react';
import { Profile, Account } from '../types';
import { toNepaliNumerals } from '../utils/nepaliCalendar';

interface AgentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  accounts: Account[];
  onAddAgent: (agent: Omit<Profile, 'id' | 'created_at'>) => void;
  lang: 'ne' | 'en';
}

export const AgentManagementModal: React.FC<AgentManagementModalProps> = ({
  isOpen,
  onClose,
  profiles,
  accounts,
  onAddAgent,
  lang,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '98',
    assigned_area: 'टिकापुर-१',
    role: 'agent' as const,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;

    onAddAgent({
      full_name: formData.full_name.trim(),
      email: formData.email.trim() || undefined,
      phone_number: formData.phone_number.trim() || undefined,
      assigned_area: formData.assigned_area.trim(),
      role: 'agent',
    });

    setIsAdding(false);
    setFormData({
      full_name: '',
      email: '',
      phone_number: '98',
      assigned_area: 'टिकापुर-१',
      role: 'agent',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="bg-emerald-950 text-white p-5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg">बजार प्रतिनिधि व्यवस्थापन (Field Collectors)</h3>
              <p className="text-xs text-emerald-200">मानस कृषि सहकारी संस्था लि., टिकापुर-१</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              सक्रिय बजार प्रतिनिधिहरू ({toNepaliNumerals(profiles.filter(p => p.role === 'agent').length)})
            </h4>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'फारम बन्द' : '+ नयाँ प्रतिनिधि थप्नुहोस्'}</span>
            </button>
          </div>

          {/* Add form */}
          {isAdding && (
            <form onSubmit={handleSubmit} className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <h5 className="text-xs font-black text-emerald-950">नयाँ बजार प्रतिनिधि दर्ता</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">पूरा नाम (Full Name):</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. दीपेन्द्र चौधरी"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">मोबाइल नं (Mobile):</label>
                  <input
                    type="text"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ईमेल (Email):</label>
                  <input
                    type="email"
                    placeholder="agent@manassahakari.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">कार्यक्षेत्र / ब्लक (Area):</label>
                  <input
                    type="text"
                    required
                    placeholder="टिकापुर-१, ब्लक D & बजार"
                    value={formData.assigned_area}
                    onChange={(e) => setFormData({ ...formData, assigned_area: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-bold"
                >
                  रद्द
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          )}

          {/* List of agents */}
          <div className="space-y-2.5">
            {profiles.map((p) => {
              const assignedCount = accounts.filter(a => a.assigned_agent_id === p.id).length;

              return (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        p.role === 'admin'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {p.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-slate-900 text-sm sm:text-base">{p.full_name}</h5>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            p.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {p.role}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-700" />
                          {p.assigned_area || 'Tikapur-1'}
                        </span>
                        {p.phone_number && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {p.phone_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">जिम्मा खाताहरू</span>
                    <span className="font-extrabold text-sm text-emerald-900 font-mono">
                      {toNepaliNumerals(assignedCount)} सदस्य खाताहरू
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
          >
            बन्द गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
};
