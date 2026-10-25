import { UserIdentity, UserRole } from '@/types';

export interface IdentityFixtureItem {
  id: string;
  name: string;
  identifier: string; // NIM atau ID Asisten
  role: UserRole;
  description?: string;
}

export interface IdentityContextType {
  activeIdentity: UserIdentity | null;
  selectIdentity: (identity: UserIdentity) => void;
  clearIdentity: () => void;
  isSelectingIdentity: boolean;
  openIdentitySelector: () => void;
  closeIdentitySelector: () => void;
}
