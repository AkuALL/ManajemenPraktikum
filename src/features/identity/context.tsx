import React, { ReactNode, useCallback, useMemo } from 'react';

import { useAuth } from '@/features/auth';
import type { UserIdentity } from '@/types';

import type { IdentityContextType } from './types';

// Bridge legacy Sprint 1 useIdentity() consumers to real Sprint 2 AuthContext.
export function IdentityProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useIdentity(): IdentityContextType {
  const { user, logout } = useAuth();

  const activeIdentity = useMemo<UserIdentity | null>(
    () =>
      user
        ? {
            role: user.role,
            userId: user.uid,
            displayName: user.displayName,
            identifier: user.identifier,
          }
        : null,
    [user],
  );

  const clearIdentity = useCallback(() => {
    void logout();
  }, [logout]);

  const noop = useCallback(() => undefined, []);

  return useMemo<IdentityContextType>(
    () => ({
      activeIdentity,
      selectIdentity: noop,
      clearIdentity,
      isSelectingIdentity: false,
      openIdentitySelector: noop,
      closeIdentitySelector: noop,
    }),
    [activeIdentity, clearIdentity, noop],
  );
}
