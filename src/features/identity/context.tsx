import React, { createContext, useCallback, useContext, useState, useMemo, ReactNode } from 'react';
import { UserIdentity } from '@/types';
import { IdentityContextType } from './types';

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [activeIdentity, setActiveIdentity] = useState<UserIdentity | null>(null);
  const [selectorOpen, setSelectorOpen] = useState<boolean>(false);

  const isSelectingIdentity = useMemo(() => {
    // Jika belum ada identitas aktif, selector wajib tampil
    return activeIdentity === null || selectorOpen;
  }, [activeIdentity, selectorOpen]);

  const selectIdentity = useCallback((identity: UserIdentity) => {
    setActiveIdentity(identity);
    setSelectorOpen(false);
  }, []);

  const clearIdentity = useCallback(() => {
    setActiveIdentity(null);
    setSelectorOpen(true);
  }, []);

  const openIdentitySelector = useCallback(() => {
    setSelectorOpen(true);
  }, []);

  const closeIdentitySelector = useCallback(() => {
    // Hanya bisa ditutup jika sudah ada identitas aktif
    if (activeIdentity !== null) {
      setSelectorOpen(false);
    }
  }, [activeIdentity]);

  const value = useMemo(
    () => ({
      activeIdentity,
      selectIdentity,
      clearIdentity,
      isSelectingIdentity,
      openIdentitySelector,
      closeIdentitySelector,
    }),
    [
      activeIdentity,
      clearIdentity,
      closeIdentitySelector,
      isSelectingIdentity,
      openIdentitySelector,
      selectIdentity,
    ]
  );

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): IdentityContextType {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
}
