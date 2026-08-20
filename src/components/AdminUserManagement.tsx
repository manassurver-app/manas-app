import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  UserPlus,
  Lock,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
  Coins,
  Users,
  Search,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { Profile, Account, Transaction } from '../types';
import { toNepaliNumerals, formatCurrencyNPR } from '../utils/nepaliCalendar';
import { supabaseCreateAgent, supabaseUpdateProfile } from '../lib/supabase';

interface AdminUserManagementProps {
  profiles: Profile[];
  accounts: Account[];
  transactions: Transaction[];
  onRefresh: () => void;
  lang: 'ne' | 'en';
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  profiles,
  accounts,
  transactions,
  onRefresh,
  lang,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone_number: '98',
    assigned_area: 'टिकापुर-१, ',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const agents = profiles.filter((p) => p.role === 'agent');
  const admins = profiles.filter((p) => p.role === 'admin');

  const filteredAgents = agents.filter(
    (a) =>
      a.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone_number?.includes(searchQuery) ||
      a.assigned_area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formData.full_name.trim()) {
      setFormError('कृपया प्रतिनिधिको पूरा नाम प्रविष्ट गर्नुहोस्');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('कृपया इमेल ठेगाना प्रविष्ट गर्नुहोस्');
      return;
    }

    const res = await supabaseCreateAgent({
      full_name: formData.full_name,
      email: formData.email,
      password: formData.password || 'Agent@Manas2083#',
      phone_number: formData.phone_number,
      assigned_area: formData.assigned_area,
    });

    if (res.error) {
      setFormError(res.error);
    } else {
      setFormSuccess(
        lang === 'ne'
          ? `बजार प्रतिनिधि "${formData.full_name}" सफलतापूर्वक दर्ता भयो!`
          : `Field Agent "${formData.full_name}" registered successfully!`
      );
      setFormData({
        full_name: '',
        email: '',
        password: '',
        phone_number: '98',
        assigned_area: 'टिकापुर-१, ',
      });
      setIsCreating(false);
      onRefresh();
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    const res = await supabaseUpdateProfile(editingProfile.id, {
      full_name: editingProfile.full_name,
      phone_number: editingProfile.phone_number,
      assigned_area: editingProfile.assigned_area,
      email: editingProfile.email,
    });

    if (res.success) {
      setEditingProfile(null);
      onRefresh();
    } else {
      alert(res.error || 'Failed to update profile');
    }
  };

  const handleToggleStatus = async (profile: Profile) => {
    const newStatus = profile.is_active === false ? true : false;
    const confirmMsg =
      profile.is_active === false
        ? `के तपाईं ${profile.full_name} लाई पुनः सक्रिय (Activate) गर्न चाहनुहुन्छ?`
        : `के तपाईं ${profile.full_name} लाई निष्क्रिय (Deactivate) गर्न चाहनुहुन्छ? उसले लगइन गर्न र संकलन गर्न सक्ने छैन।`;

    if (!window.confirm(confirmMsg)) return;

    await supabaseUpdateProfile(profile.id, { is_active: newStatus });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / RLS Security Notice */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 rounded-3xl p-5 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">
                  {lang === 'ne'
                    ? 'बजार प्रतिनिधि तथा प्रयोगकर्ता व्यवस्थापन'
                    : 'Field Agent & User Management Console'}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                  Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                {lang === 'ne'
                  ? 'Supabase Auth & Row Level Security (RLS) द्वारा सुरक्षित • बजार प्रतिनिधि खाता सिर्जना, परिमार्जन तथा सक्रियता नियन्त्रण'
                  : 'Protected by Supabase Auth & RLS • Create, assign, edit and toggle field agent access'}
              </p>
            </div>
          </div>

          <button
            id="btn-add-new-agent"
            onClick={() => {
              setIsCreating(!isCreating);
              setFormError(null);
              setFormSuccess(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isCreating ? 'फारम बन्द गर्नुहोस्' : '+ नयाँ बजार प्रतिनिधि थप्नुहोस्'}</span>
          </button>
        </div>
      </div>

      {/* Success / Error Notification */}
      {formSuccess && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Agent Creation Form */}
      {isCreating && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-800" />
              <h3 className="font-extrabold text-base text-slate-900">
                {lang === 'ne'
                  ? 'नयाँ बजार प्रतिनिधि (Field Agent) दर्ता फारम'
                  : 'Register New Bajar Pratinidhi'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">Role: Field Collector</span>
          </div>

          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreateAgent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  प्रतिनिधिको पूरा नाम (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. दीपेन्द्र चौधरी (Dipendra Chaudhary)"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  लगइन इमेल (Agent Email) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="dipendra@manassahakari.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  प्रारम्भिक पासवर्ड (Initial Password) *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Agent@Manas2083#"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  मोबाइल नम्बर (Mobile Contact) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* Assigned Area */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  तोकिएको कार्यक्षेत्र / ब्लक (Assigned Area / Block) *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="टिकापुर-१, ब्लक D, बसपार्क तथा मुख्य बजार क्षेत्र"
                    value={formData.assigned_area}
                    onChange={(e) => setFormData({ ...formData, assigned_area: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* RLS Security Note */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>RLS सुरक्षा नियम:</strong> नयाँ प्रतिनिधिले आफ्नो मोबाइलबाट लगइन गर्दा आफूलाई तोकिएका सदस्यहरूको खाता र संकलन मात्र हेर्न सक्नेछन्। अन्य प्रतिनिधिको विवरण पूर्ण रूपमा सुरक्षित रहनेछ।
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
              >
                सुरक्षित गर्नुहोस् (Save Agent)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agents Search & Metrics Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={
                lang === 'ne'
                  ? 'प्रतिनिधिको नाम, मोबाइल वा क्षेत्रबाट खोज्नुहोस्...'
                  : 'Search agent by name, mobile, area...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>सक्रिय प्रतिनिधि: {toNepaliNumerals(agents.filter((a) => a.is_active !== false).length)}</span>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>जम्मा खाताहरू: {toNepaliNumerals(accounts.length)}</span>
            </span>
          </div>
        </div>

        {/* Agents Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredAgents.map((agent) => {
            const agentAccounts = accounts.filter((a) => a.assigned_agent_id === agent.id);
            const agentActiveAccounts = agentAccounts.filter((a) => a.status === 'active');
            const agentTotalCollections = transactions
              .filter((t) => t.agent_id === agent.id && t.type === 'deposit')
              .reduce((sum, t) => sum + t.amount, 0);

            const isActive = agent.is_active !== false;

            return (
              <div
                key={agent.id}
                className={`bg-white rounded-3xl p-5 border transition-all duration-200 relative flex flex-col justify-between ${
                  isActive
                    ? 'border-slate-200 hover:border-emerald-500 hover:shadow-md'
                    : 'border-rose-200 bg-rose-50/20 opacity-80'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {isActive ? <UserCheck className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                          {agent.full_name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isActive ? 'Active (सक्रिय)' : 'Deactivated (निष्क्रिय)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingProfile(agent)}
                      className="p-2 text-slate-400 hover:text-emerald-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Edit Agent Profile"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 mb-4">
                    {agent.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] truncate text-slate-700">{agent.email}</span>
                      </div>
                    )}
                    {agent.phone_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono font-bold text-slate-800">{agent.phone_number}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-medium text-slate-700">
                        {agent.assigned_area || 'Tikapur-1 Kailali'}
                      </span>
                    </div>
                  </div>

                  {/* Agent Portfolio Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">जिम्मा खाताहरू</span>
                      <span className="font-black text-sm text-emerald-950 font-mono">
                        {toNepaliNumerals(agentAccounts.length)}
                      </span>
                      <span className="text-[10px] text-emerald-700 block">
                        ({toNepaliNumerals(agentActiveAccounts.length)} सक्रिय)
                      </span>
                    </div>

                    <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-100 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">जम्मा संकलन</span>
                      <span className="font-black text-xs sm:text-sm text-amber-950 font-mono">
                        {formatCurrencyNPR(agentTotalCollections)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    ID: {agent.id.slice(0, 10)}...
                  </span>

                  <button
                    onClick={() => handleToggleStatus(agent)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {isActive ? 'निष्क्रिय गर्नुहोस्' : 'पुनः सक्रिय गर्नुहोस्'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Agent Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">
                बजार प्रतिनिधि विवरण परिमार्जन (Edit Agent)
              </h3>
              <button
                onClick={() => setEditingProfile(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAgent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">पूरा नाम (Full Name)</label>
                <input
                  type="text"
                  required
                  value={editingProfile.full_name}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, full_name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">इमेल (Email)</label>
                <input
                  type="email"
                  value={editingProfile.email || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">मोबाइल नं (Mobile)</label>
                <input
                  type="tel"
                  required
                  value={editingProfile.phone_number || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, phone_number: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">कार्यक्षेत्र / ब्लक (Area)</label>
                <input
                  type="text"
                  required
                  value={editingProfile.assigned_area || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, assigned_area: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  रद्द
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  अपडेट सुरक्षित गर्नुहोस्
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
