import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Profile, UserRole } from '../types';
import {
  getStoredProfiles,
  getActiveProfile,
  setActiveUserId,
} from '../utils/storage';
import { supabaseSignIn, isRealSupabaseConfigured, supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile: Profile;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => Promise<void>;
  switchProfile: (profile: Profile) => void;
  lang: 'ne' | 'en';
  setLang: (lang: 'ne' | 'en') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'manas_auth_session_v1';
const REMEMBER_ME_KEY = 'manas_remember_me_v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lang, setLang] = useState<'ne' | 'en'>('ne');

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedSession = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
        const storedProfiles = getStoredProfiles();

        if (storedSession) {
          try {
            const parsedSession: AuthUser = JSON.parse(storedSession);
            // Refresh with latest profile data from storage
            const matchedProfile = storedProfiles.find((p) => p.id === parsedSession.id) || parsedSession.profile;
            if (matchedProfile && matchedProfile.is_active !== false) {
              const refreshedUser: AuthUser = {
                id: matchedProfile.id,
                email: matchedProfile.email || parsedSession.email,
                role: matchedProfile.role,
                profile: matchedProfile,
              };
              setUser(refreshedUser);
              setActiveUserId(matchedProfile.id);
            } else {
              // Inactive or missing
              localStorage.removeItem(AUTH_STORAGE_KEY);
              sessionStorage.removeItem(AUTH_STORAGE_KEY);
            }
          } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
          }
        } else {
          // If no stored session, check if active profile exists
          const currentActive = getActiveProfile();
          if (currentActive) {
            const autoUser: AuthUser = {
              id: currentActive.id,
              email: currentActive.email || `${currentActive.role}@manassahakari.com`,
              role: currentActive.role,
              profile: currentActive,
            };
            setUser(autoUser);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (
    emailOrUsername: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setIsLoading(true);
    try {
      const cleanInput = emailOrUsername.trim();
      const res = await supabaseSignIn(cleanInput, password);

      if (res.error || !res.user) {
        setIsLoading(false);
        return {
          success: false,
          error: res.error || (lang === 'ne' ? 'गलत युजरनेम वा पासवर्ड' : 'Invalid username or password'),
        };
      }

      const authUser: AuthUser = {
        id: res.user.id,
        email: res.user.email,
        role: res.user.role,
        profile: res.user.profile,
      };

      setUser(authUser);
      setActiveUserId(authUser.id);

      const sessionJson = JSON.stringify(authUser);
      if (rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEY, sessionJson);
        localStorage.setItem(REMEMBER_ME_KEY, cleanInput);
      } else {
        sessionStorage.setItem(AUTH_STORAGE_KEY, sessionJson);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }

      setIsLoading(false);
      return { success: true, role: authUser.role };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err.message || (lang === 'ne' ? 'लग-इन गर्दा समस्या आयो' : 'Authentication error occurred'),
      };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isRealSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => {});
      }
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchProfile = (profile: Profile) => {
    const updatedUser: AuthUser = {
      id: profile.id,
      email: profile.email || `${profile.role}@manassahakari.com`,
      role: profile.role,
      profile,
    };
    setUser(updatedUser);
    setActiveUserId(profile.id);
    const sessionJson = JSON.stringify(updatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, sessionJson);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user?.profile || null,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        switchProfile,
        lang,
        setLang,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
