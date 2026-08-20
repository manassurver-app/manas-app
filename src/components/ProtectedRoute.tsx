import React, { ReactNode } from 'react';
import { useAuth } from '../context/useAuth';
import { UserRole } from '../types';
import { LoginPage } from './LoginPage';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  fallbackTab?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  fallbackTab,
}) => {
  const { user, role, isAuthenticated, isLoading, lang } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-emerald-300 font-mono">
          {lang === 'ne' ? 'प्रमाणीकरण जाँच गरिँदैछ...' : 'Verifying User Session...'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/40">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
          {lang === 'ne' ? 'अनुमति छैन (Access Restricted)' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          {lang === 'ne'
            ? 'यो खण्ड केवल मानस कृषि सहकारी संस्थाको केन्द्रीय प्रशासक (Admin) का लागि मात्र उपलब्ध छ। तपाईंको भूमिका बजार प्रतिनिधि (Field Agent) भएकोले यस पृष्ठमा पहुँच सुरक्षित गरिएको छ।'
            : 'This section is restricted to Manas Krishi Sahakari Admin. Field Agents are restricted to assigned accounts and daily collection postings.'}
        </p>

        {fallbackTab && (
          <button
            onClick={fallbackTab}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              {lang === 'ne'
                ? 'दैनिक बचत संकलन (Field Collection) मा फर्कनुहोस्'
                : 'Return to Field Collection'}
            </span>
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
