import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { AuthUser } from '@/types';
import { unregisterDevicePushToken } from '@/features/notifications/token-service';
import { unsubscribeWebPush } from '@/features/notifications/web-push';

import { firebaseAuthAdapter } from './firebase-adapter';
import {
  AuthPortError,
  mapFirebaseAuthError,
  type AuthPort,
  type LoginInput,
  type RegisterInput,
} from './port';

export type AuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'authenticated'
  | 'profile-error';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  retryProfileLoad: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  port?: AuthPort;
};

export function AuthProvider({
  children,
  port = firebaseAuthAdapter,
}: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeUidRef = useRef<string | null>(null);
  const registeringRef = useRef(false);

  const hydrateProfile = useCallback(
    async (uid: string) => {
      setStatus('loading');
      setError(null);

      try {
        const profile = await port.loadProfile(uid);
        if (activeUidRef.current !== uid) return;

        if (!profile) {
          setUser(null);
          setError('Profil akun belum tersedia di Firestore.');
          setStatus('profile-error');
          return;
        }

        setUser(profile);
        setStatus('authenticated');
      } catch (err) {
        if (activeUidRef.current !== uid) return;
        const mapped = mapFirebaseAuthError(err);
        setUser(null);
        setError(mapped.message);
        setStatus('profile-error');
      }
    },
    [port],
  );

  useEffect(() => {
    const unsubscribe = port.subscribeAuthState((uid) => {
      activeUidRef.current = uid;

      if (!uid) {
        setUser(null);
        setError(null);
        setStatus('unauthenticated');
        return;
      }

      // Skip premature profile read while register() is still writing users/{uid}.
      if (registeringRef.current) return;

      void hydrateProfile(uid);
    });

    return unsubscribe;
  }, [hydrateProfile, port]);

  const login = useCallback(
    async (input: LoginInput) => {
      setError(null);
      try {
        const profile = await port.login(input);
        activeUidRef.current = profile.uid;
        setUser(profile);
        setStatus('authenticated');
        return profile;
      } catch (err) {
        const mapped = mapFirebaseAuthError(err);
        if (mapped.code === 'profile-missing') {
          setUser(null);
          setError(mapped.message);
          setStatus('profile-error');
        }
        throw mapped;
      }
    },
    [port],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      setError(null);
      registeringRef.current = true;
      try {
        const profile = await port.register(input);
        activeUidRef.current = profile.uid;
        setUser(profile);
        setStatus('authenticated');
        return profile;
      } catch (err) {
        const mapped = err instanceof AuthPortError ? err : mapFirebaseAuthError(err);
        throw mapped;
      } finally {
        registeringRef.current = false;
      }
    },
    [port],
  );

  const logout = useCallback(async () => {
    if (activeUidRef.current) {
      await Promise.race([
        Promise.all([
          unregisterDevicePushToken(activeUidRef.current),
          unsubscribeWebPush(activeUidRef.current),
        ]),
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
    await port.logout();
    activeUidRef.current = null;
    setUser(null);
    setError(null);
    setStatus('unauthenticated');
  }, [port]);

  const retryProfileLoad = useCallback(async () => {
    const uid = activeUidRef.current;
    if (!uid) {
      setUser(null);
      setError(null);
      setStatus('unauthenticated');
      return;
    }
    await hydrateProfile(uid);
  }, [hydrateProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      error,
      login,
      register,
      logout,
      retryProfileLoad,
    }),
    [error, login, logout, register, retryProfileLoad, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
