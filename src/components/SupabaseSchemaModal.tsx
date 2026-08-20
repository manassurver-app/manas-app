import React, { useState } from 'react';
import { Database, ShieldCheck, Copy, Check, X, Key, Code, CheckCircle2, Server } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../utils/supabaseSql';

interface SupabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSchemaModal: React.FC<SupabaseSchemaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'architecture' | 'credentials'>('sql');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-amber-300 flex items-center justify-center font-bold shadow-md border border-emerald-500/40">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">
                  Supabase PostgreSQL Schema & RLS Policies
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  PostgreSQL 15+
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Manas Krishi Sahakari Limited, Tikapur-1, Kailali • Row Level Security
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

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'sql'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Full SQL Migration Script</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>RLS & Security Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('credentials')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'credentials'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Default Admin Seed</span>
            </button>
          </div>

          <button
            id="copy-supabase-sql-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-amber-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Full SQL</span>
              </>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-900 text-slate-100 font-mono text-xs">
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-x-auto text-emerald-400 font-mono text-[11px] leading-relaxed whitespace-pre select-all">
                {SUPABASE_SQL_SCHEMA}
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4 font-sans text-xs text-slate-200">
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-3">
                <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Row Level Security (RLS) Enforcement Overview
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  In accordance with cooperative regulations and privacy rules for <strong>Manas Krishi Sahakari Limited</strong>:
                </p>

                <div className="space-y-2 mt-2">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700">
                    <strong className="text-emerald-400 block font-mono">1. profiles Table</strong>
                    <span className="text-slate-300 text-[11px]">
                      • <strong>SELECT:</strong> Users can view their own profile (<code className="text-amber-300">auth.uid() = id</code>); Admins can view all.<br />
                      • <strong>INSERT/UPDATE:</strong> Restricted to Cooperative Admins.
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700">
                    <strong className="text-emerald-400 block font-mono">2. accounts Table (Bachat Karta)</strong>
                    <span className="text-slate-300 text-[11px]">
                      • <strong>SELECT:</strong> Field agents (Bajar Pratinidhi) can ONLY view accounts where <code className="text-amber-300">assigned_agent_id = auth.uid()</code>. Admin can view all.<br />
                      • <strong>INSERT:</strong> Agents can create accounts assigning themselves (<code className="text-amber-300">assigned_agent_id = auth.uid()</code>). Admin can assign to any agent.<br />
                      • <strong>UPDATE:</strong> Agents can update their assigned members; Admins have full access.
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700">
                    <strong className="text-emerald-400 block font-mono">3. transactions Table (Daily Collections)</strong>
                    <span className="text-slate-300 text-[11px]">
                      • <strong>SELECT:</strong> Agents view ONLY their own recorded collections (<code className="text-amber-300">agent_id = auth.uid()</code>). Admin sees all collections.<br />
                      • <strong>INSERT:</strong> Agents insert collections tagged with their <code className="text-amber-300">agent_id = auth.uid()</code>.<br />
                      • <strong>AUTOMATIC BALANCE TRIGGER:</strong> Postgres PL/pgSQL function automatically increments or decrements <code className="text-amber-300">accounts.current_balance</code> atomically.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <div className="space-y-4 font-sans text-xs text-slate-200">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-3">
                <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Default Admin Seed Configuration
                </h4>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Default Admin Email:</span>
                    <strong className="text-amber-300">admin@manassahakari.com</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Default Password:</span>
                    <strong className="text-emerald-400">Admin@Manas2083#</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">User Role:</span>
                    <strong className="text-white uppercase">admin</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Cooperative Headquarter:</span>
                    <span className="text-slate-300">Tikapur-1, Kailali, Nepal</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Run the SQL script from Tab 1 in your Supabase SQL Editor. It creates all tables, triggers, indexes, and RLS security policies automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            PostgreSQL 15+ compatible with Supabase Auth & RLS
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition-colors"
          >
            बन्द गर्नुहोस् (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
