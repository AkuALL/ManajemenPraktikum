import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useIdentity } from '@/features/identity';

import { getPracticumAdapter, isFirebaseConfigured } from './adapter';
import type {
  AddMemberInput,
  ClassMember,
  CreateClassInput,
  CreateSessionInput,
  PracticumClass,
  PracticumSession,
  StudentCandidate,
  UpdateClassInput,
  UpdateSessionInput,
} from './types';

type SnapshotState<T> = {
  key: string;
  items: T[];
  error: string | null;
  fromCache: boolean;
  resolved: boolean;
};

interface PracticumContextType {
  classes: PracticumClass[];
  sessions: PracticumSession[];
  loadingClasses: boolean;
  loadingSessions: boolean;
  classesError: string | null;
  sessionsError: string | null;
  classesFromCache: boolean;
  sessionsFromCache: boolean;
  error: string | null;
  isFirebaseActive: boolean;
  clearError: () => void;
  retryClasses: () => void;
  retrySessions: () => void;
  retryData: () => void;
  createClass: (input: CreateClassInput) => Promise<PracticumClass>;
  updateClass: (classId: string, input: UpdateClassInput) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  getRegisteredStudents: () => Promise<StudentCandidate[]>;
  getClassMembers: (classId: string) => Promise<ClassMember[]>;
  addMember: (classId: string, input: AddMemberInput) => Promise<ClassMember>;
  removeMember: (classId: string, memberId: string) => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<PracticumSession>;
  updateSession: (sessionId: string, input: UpdateSessionInput) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  openSession: (sessionId: string) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
}

export type PracticumSubscriptionOptions = {
  classes?: boolean;
  sessions?: boolean;
};

interface PracticumContextInternal extends PracticumContextType {
  registerConsumer: (needClasses: boolean, needSessions: boolean) => () => void;
}

const PracticumContext = createContext<PracticumContextInternal | undefined>(undefined);
const EMPTY_ITEMS: never[] = [];

export function PracticumProvider({ children }: { children: ReactNode }) {
  const { activeIdentity } = useIdentity();
  const [classesState, setClassesState] = useState<SnapshotState<PracticumClass> | null>(null);
  const [sessionsState, setSessionsState] = useState<SnapshotState<PracticumSession> | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [classesRetryTick, setClassesRetryTick] = useState(0);
  const [sessionsRetryTick, setSessionsRetryTick] = useState(0);
  const [classConsumers, setClassConsumers] = useState(0);
  const [sessionConsumers, setSessionConsumers] = useState(0);

  const registerConsumer = useCallback((needClasses: boolean, needSessions: boolean) => {
    if (needClasses) setClassConsumers((n) => n + 1);
    if (needSessions) setSessionConsumers((n) => n + 1);
    return () => {
      if (needClasses) setClassConsumers((n) => Math.max(0, n - 1));
      if (needSessions) setSessionConsumers((n) => Math.max(0, n - 1));
    };
  }, []);

  const adapter = useMemo(() => getPracticumAdapter(), []);
  const isFirebaseActive = useMemo(() => isFirebaseConfigured(), []);
  const currentUserId = activeIdentity?.userId ?? '';
  const currentUserRole = activeIdentity?.role;
  const currentStudentNim = activeIdentity?.identifier?.trim() || currentUserId;
  const activeKey =
    activeIdentity && currentUserRole
      ? `${currentUserRole}:${currentUserRole === 'student' ? currentStudentNim : currentUserId}`
      : null;
  const classesKey = activeKey ? `${activeKey}:classes:${classesRetryTick}` : null;
  const sessionsKey = activeKey ? `${activeKey}:sessions:${sessionsRetryTick}` : null;
  const classesNeeded = classConsumers > 0 || sessionConsumers > 0;
  const sessionsNeeded = sessionConsumers > 0;

  useEffect(() => {
    if (!classesKey || !currentUserRole || !classesNeeded) return;

    const assistantId = currentUserRole === 'assistant' ? currentUserId : undefined;
    const studentId = currentUserRole === 'student' ? currentStudentNim : undefined;
    return adapter.subscribeClasses(
      assistantId,
      (items, meta) => {
        setClassesState({ key: classesKey, items, error: null, fromCache: meta.fromCache, resolved: true });
      },
      (listenerError) => {
        setClassesState((previous) => ({
          key: classesKey,
          items: previous?.key === classesKey ? previous.items : [],
          error: listenerError.message,
          fromCache: false,
          resolved: true,
        }));
      },
      studentId,
    );
  }, [adapter, classesKey, classesNeeded, currentStudentNim, currentUserId, currentUserRole]);

  const classSnapshot = classesKey && classesState?.key === classesKey ? classesState : null;
  const classes = classSnapshot?.items ?? EMPTY_ITEMS;
  const classesResolved = Boolean(classSnapshot?.resolved);
  const classesError = classSnapshot?.error ?? null;
  const knownClassIdsKey = useMemo(
    () => Array.from(new Set(classes.map((item) => item.id))).sort().join(','),
    [classes],
  );

  useEffect(() => {
    if (!sessionsKey || !currentUserRole || !sessionsNeeded) return;
    if (!classesResolved || classesError) return;

    const knownClassIds = knownClassIdsKey ? knownClassIdsKey.split(',') : [];
    return adapter.subscribeSessions(
      undefined,
      currentUserRole === 'student' ? currentStudentNim : currentUserId,
      currentUserRole,
      (items, meta) => {
        setSessionsState({ key: sessionsKey, items, error: null, fromCache: meta.fromCache, resolved: true });
      },
      (listenerError) => {
        setSessionsState((previous) => ({
          key: sessionsKey,
          items: previous?.key === sessionsKey ? previous.items : [],
          error: listenerError.message,
          fromCache: false,
          resolved: true,
        }));
      },
      knownClassIds,
    );
  }, [
    adapter,
    classesError,
    classesResolved,
    currentStudentNim,
    currentUserId,
    currentUserRole,
    knownClassIdsKey,
    sessionsKey,
    sessionsNeeded,
  ]);

  const sessionSnapshot = sessionsKey && sessionsState?.key === sessionsKey ? sessionsState : null;
  const rawSessions = sessionSnapshot?.items ?? EMPTY_ITEMS;
  const loadingClasses = Boolean(classesKey) && (!classSnapshot || !classSnapshot.resolved);
  const sessionsError = sessionSnapshot?.error ?? classesError;
  const loadingSessions =
    Boolean(sessionsKey) &&
    !classesError &&
    (!sessionSnapshot || !sessionSnapshot.resolved);
  const error = operationError ?? classesError ?? sessionsError;

  const retryClasses = useCallback(() => setClassesRetryTick((tick) => tick + 1), []);
  const retrySessions = useCallback(() => {
    if (classesError) {
      setClassesRetryTick((tick) => tick + 1);
    }
    setSessionsRetryTick((tick) => tick + 1);
  }, [classesError]);
  const retryData = useCallback(() => {
    setClassesRetryTick((tick) => tick + 1);
    setSessionsRetryTick((tick) => tick + 1);
  }, []);
  const clearError = useCallback(() => setOperationError(null), []);

  const runOperation = useCallback(async <T,>(operation: () => Promise<T>, fallback: string) => {
    try {
      setOperationError(null);
      return await operation();
    } catch (errorValue) {
      setOperationError(errorValue instanceof Error ? errorValue.message : fallback);
      throw errorValue;
    }
  }, []);

  const createClass = useCallback((input: CreateClassInput) => runOperation(() => adapter.createClass(input, currentUserId), 'Gagal membuat kelas.'), [adapter, currentUserId, runOperation]);
  const updateClass = useCallback((classId: string, input: UpdateClassInput) => runOperation(() => adapter.updateClass(classId, input), 'Gagal memperbarui kelas.'), [adapter, runOperation]);
  const deleteClass = useCallback((classId: string) => runOperation(() => adapter.deleteClass(classId), 'Gagal menghapus kelas.'), [adapter, runOperation]);
  const getRegisteredStudents = useCallback(() => runOperation(() => adapter.getRegisteredStudents(), 'Gagal memuat daftar praktikan.'), [adapter, runOperation]);
  const getClassMembers = useCallback((classId: string) => runOperation(() => adapter.getClassMembers(classId), 'Gagal memuat anggota kelas.'), [adapter, runOperation]);
  const addMember = useCallback((classId: string, input: AddMemberInput) => runOperation(() => adapter.addMember(classId, input), 'Gagal menambah anggota.'), [adapter, runOperation]);
  const removeMember = useCallback((classId: string, memberId: string) => runOperation(() => adapter.removeMember(classId, memberId), 'Gagal menghapus anggota.'), [adapter, runOperation]);
  const createSession = useCallback((input: CreateSessionInput) => runOperation(() => adapter.createSession(input, currentUserId), 'Gagal membuat sesi.'), [adapter, currentUserId, runOperation]);
  const updateSession = useCallback((sessionId: string, input: UpdateSessionInput) => runOperation(() => adapter.updateSession(sessionId, input), 'Gagal memperbarui sesi.'), [adapter, runOperation]);
  const deleteSession = useCallback((sessionId: string) => runOperation(() => adapter.deleteSession(sessionId), 'Gagal menghapus sesi.'), [adapter, runOperation]);
  const openSession = useCallback((sessionId: string) => runOperation(() => adapter.openSession(sessionId, currentUserId), 'Gagal membuka sesi.'), [adapter, currentUserId, runOperation]);
  const closeSession = useCallback((sessionId: string) => runOperation(() => adapter.closeSession(sessionId, currentUserId), 'Gagal menutup sesi.'), [adapter, currentUserId, runOperation]);

  const sessions = useMemo(() => rawSessions.map((session) => {
    const practicumClass = classes.find((item) => item.id === session.classId);
    return { ...session, className: session.className ?? practicumClass?.className, courseName: session.courseName ?? practicumClass?.courseName };
  }), [classes, rawSessions]);

  const value = useMemo<PracticumContextInternal>(() => ({
    classes, sessions, loadingClasses, loadingSessions, classesError, sessionsError,
    classesFromCache: classSnapshot?.fromCache ?? false,
    sessionsFromCache: sessionSnapshot?.fromCache ?? false,
    error, isFirebaseActive, clearError, retryClasses, retrySessions, retryData,
    createClass, updateClass, deleteClass, getRegisteredStudents, getClassMembers, addMember, removeMember,
    createSession, updateSession, deleteSession, openSession, closeSession, registerConsumer,
  }), [
    addMember, classes, classesError, classSnapshot?.fromCache, clearError, closeSession,
    createClass, createSession, deleteClass, deleteSession, error, getClassMembers, getRegisteredStudents,
    isFirebaseActive, loadingClasses, loadingSessions, openSession, registerConsumer, removeMember, retryClasses,
    retryData, retrySessions, sessions, sessionsError, sessionSnapshot?.fromCache, updateClass,
    updateSession,
  ]);

  return <PracticumContext.Provider value={value}>{children}</PracticumContext.Provider>;
}

export function usePracticum(options?: PracticumSubscriptionOptions): PracticumContextType {
  const context = useContext(PracticumContext);
  if (!context) throw new Error('usePracticum must be used within a PracticumProvider.');

  const needClasses = options?.classes ?? true;
  const needSessions = options?.sessions ?? true;
  const { registerConsumer } = context;

  useEffect(() => registerConsumer(needClasses, needSessions), [
    needClasses,
    needSessions,
    registerConsumer,
  ]);

  return context;
}
