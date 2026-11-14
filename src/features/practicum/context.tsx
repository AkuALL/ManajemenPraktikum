import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  AddMemberInput,
  ClassMember,
  CreateClassInput,
  CreateSessionInput,
  PracticumClass,
  PracticumSession,
  UpdateClassInput,
  UpdateSessionInput,
} from './types';
import { getPracticumAdapter, isFirebaseConfigured } from './adapter';
import { useIdentity } from '@/features/identity';

interface PracticumContextType {
  classes: PracticumClass[];
  sessions: PracticumSession[];
  loadingClasses: boolean;
  loadingSessions: boolean;
  error: string | null;
  isFirebaseActive: boolean;
  clearError: () => void;
  // Classes
  createClass: (input: CreateClassInput) => Promise<PracticumClass>;
  updateClass: (classId: string, input: UpdateClassInput) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  // Members
  getClassMembers: (classId: string) => Promise<ClassMember[]>;
  addMember: (classId: string, input: AddMemberInput) => Promise<ClassMember>;
  removeMember: (classId: string, memberId: string) => Promise<void>;
  // Sessions
  createSession: (input: CreateSessionInput) => Promise<PracticumSession>;
  updateSession: (sessionId: string, input: UpdateSessionInput) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  // Lifecycle
  openSession: (sessionId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
}

const PracticumContext = createContext<PracticumContextType | undefined>(undefined);

export function PracticumProvider({ children }: { children: ReactNode }) {
  const { activeIdentity } = useIdentity();
  const [classes, setClasses] = useState<PracticumClass[]>([]);
  const [sessions, setSessions] = useState<PracticumSession[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const adapter = useMemo(() => getPracticumAdapter(), []);
  const isFirebaseActive = useMemo(() => isFirebaseConfigured(), []);

  const currentUserId = activeIdentity?.userId ?? 'assistant-demo';
  const currentUserRole = activeIdentity?.role ?? 'assistant';

  const clearError = useCallback(() => setError(null), []);

  // Subscribe ke Classes secara real-time
  useEffect(() => {
    const assistantId = currentUserRole === 'assistant' ? currentUserId : undefined;

    const unsubscribe = adapter.subscribeClasses(
      assistantId,
      (data) => {
        setClasses(data);
        setLoadingClasses(false);
      },
      (err) => {
        setError(err.message);
        setLoadingClasses(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [adapter, currentUserId, currentUserRole]);

  // Subscribe ke Sessions secara real-time
  useEffect(() => {
    const studentId = currentUserRole === 'student' ? currentUserId : undefined;

    const unsubscribe = adapter.subscribeSessions(
      undefined,
      studentId,
      currentUserRole,
      (data) => {
        setSessions(data);
        setLoadingSessions(false);
      },
      (err) => {
        setError(err.message);
        setLoadingSessions(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [adapter, currentUserId, currentUserRole]);

  // === CLASS ACTIONS ===

  const createClass = useCallback(
    async (input: CreateClassInput) => {
      try {
        setError(null);
        return await adapter.createClass(input, currentUserId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal membuat kelas');
        throw err;
      }
    },
    [adapter, currentUserId]
  );

  const updateClass = useCallback(
    async (classId: string, input: UpdateClassInput) => {
      try {
        setError(null);
        await adapter.updateClass(classId, input);
      } catch (err: any) {
        setError(err.message ?? 'Gagal memperbarui kelas');
        throw err;
      }
    },
    [adapter]
  );

  const deleteClass = useCallback(
    async (classId: string) => {
      try {
        setError(null);
        await adapter.deleteClass(classId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal menghapus kelas');
        throw err;
      }
    },
    [adapter]
  );

  // === MEMBER ACTIONS ===

  const getClassMembers = useCallback(
    async (classId: string) => {
      try {
        return await adapter.getClassMembers(classId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal mengambil anggota kelas');
        throw err;
      }
    },
    [adapter]
  );

  const addMember = useCallback(
    async (classId: string, input: AddMemberInput) => {
      try {
        setError(null);
        return await adapter.addMember(classId, input);
      } catch (err: any) {
        setError(err.message ?? 'Gagal menambah anggota');
        throw err;
      }
    },
    [adapter]
  );

  const removeMember = useCallback(
    async (classId: string, memberId: string) => {
      try {
        setError(null);
        await adapter.removeMember(classId, memberId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal menghapus anggota');
        throw err;
      }
    },
    [adapter]
  );

  // === SESSION ACTIONS ===

  const createSession = useCallback(
    async (input: CreateSessionInput) => {
      try {
        setError(null);
        return await adapter.createSession(input, currentUserId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal membuat sesi');
        throw err;
      }
    },
    [adapter, currentUserId]
  );

  const updateSession = useCallback(
    async (sessionId: string, input: UpdateSessionInput) => {
      try {
        setError(null);
        await adapter.updateSession(sessionId, input);
      } catch (err: any) {
        setError(err.message ?? 'Gagal memperbarui sesi');
        throw err;
      }
    },
    [adapter]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        setError(null);
        await adapter.deleteSession(sessionId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal menghapus sesi');
        throw err;
      }
    },
    [adapter]
  );

  // === SESSION LIFECYCLE ACTIONS ===

  const openSession = useCallback(
    async (sessionId: string) => {
      try {
        setError(null);
        await adapter.openSession(sessionId, currentUserId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal membuka sesi');
        throw err;
      }
    },
    [adapter, currentUserId]
  );

  const closeSession = useCallback(
    async (sessionId: string) => {
      try {
        setError(null);
        await adapter.closeSession(sessionId, currentUserId);
      } catch (err: any) {
        setError(err.message ?? 'Gagal menutup sesi');
        throw err;
      }
    },
    [adapter, currentUserId]
  );

  const value = useMemo(
    () => ({
      classes,
      sessions,
      loadingClasses,
      loadingSessions,
      error,
      isFirebaseActive,
      clearError,
      createClass,
      updateClass,
      deleteClass,
      getClassMembers,
      addMember,
      removeMember,
      createSession,
      updateSession,
      deleteSession,
      openSession,
      closeSession,
    }),
    [
      classes,
      sessions,
      loadingClasses,
      loadingSessions,
      error,
      isFirebaseActive,
      clearError,
      createClass,
      updateClass,
      deleteClass,
      getClassMembers,
      addMember,
      removeMember,
      createSession,
      updateSession,
      deleteSession,
      openSession,
      closeSession,
    ]
  );

  return <PracticumContext.Provider value={value}>{children}</PracticumContext.Provider>;
}

export function usePracticum(): PracticumContextType {
  const context = useContext(PracticumContext);
  if (!context) {
    throw new Error('usePracticum must be used within a PracticumProvider');
  }
  return context;
}
