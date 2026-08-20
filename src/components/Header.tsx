import React from 'react';
import { HeaderNavbar } from './HeaderNavbar';
import { Profile, Transaction } from '../types';

interface HeaderProps {
  activeProfile: Profile;
  profiles: Profile[];
  transactions?: Transaction[];
  onSelectProfile: (profile: Profile) => void;
  isOnline: boolean;
  onToggleOnlineMode: () => void;
  pendingSyncCount: number;
  onSync: () => void;
  onOpenSqlModal: () => void;
  lang: 'ne' | 'en';
  onToggleLang: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = (props) => {
  return <HeaderNavbar {...props} />;
};

export { HeaderNavbar };

