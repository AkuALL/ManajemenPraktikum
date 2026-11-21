import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/features/auth';
import type { AttendanceEntry, LabSession, SessionSummary } from '@/types';

import { firestoreAttendanceAdapter } from './firestore-adapter';
import {
  toSessionSummary,
  type AttendanceLocationInput,
  type AttendancePort,
  type SubmitAttendanceResult,
} from './port';

export type AttendanceContextValue = {
  records: AttendanceEntry[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  retry: () => void;
  submitAttendance: (
    session: LabSession | SessionSummary,
    location?: AttendanceLocationInput,
    qrToken?: string,
  ) => Promise<SubmitAttendanceResult>;
};

type SnapshotState = {
  ownerUid: string;
  records: AttendanceEntry[];
  error: string | null;
  fromCache: boolean;
  resolved: boolean;
};

interface AttendanceContextInternal extends AttendanceContextValue {
  registerConsumer: () => () => void;
}

const AttendanceContext = createContext<AttendanceContextInternal | undefined>(undefined);

type AttendanceProviderProps = {
  children: ReactNode;
  port?: AttendancePort;
};

export function AttendanceProvider({
  children,
  port = firestoreAttendanceAdapter,
}: AttendanceProviderProps) {
  const { status, user } = useAuth();
  const [snapshot, setSnapshot] = useState<SnapshotState | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [consumerCount, setConsumerCount] = useState(0);

  const registerConsumer = useCallback(() => {
    setConsumerCount((count) => count + 1);
    return () => {
      setConsumerCount((count) => Math.max(0, count - 1));
    };
  }, []);

  const studentUid =
    status === 'authenticated' && user?.role === 'student' ? user.uid : null;

  useEffect(() => {
    if (!studentUid || consumerCount === 0) return;

    const unsubscribe = port.subscribeStudentAttendance(
      studentUid,
      (nextRecords, meta) => {
        setSnapshot({
          ownerUid: studentUid,
          records: nextRecords,
          fromCache: meta.fromCache,
          error: null,
          resolved: true,
        });
      },
      (err) => {
        setSnapshot({
          ownerUid: studentUid,
          records: [],
          fromCache: false,
          error: err.message,
          resolved: true,
        });
      },
    );

    return unsubscribe;
  }, [consumerCount, port, retryTick, studentUid]);

  const retry = useCallback(() => {
    if (!studentUid) return;
    setSnapshot({
      ownerUid: studentUid,
      records: [],
      fromCache: false,
      error: null,
      resolved: false,
    });
    setRetryTick((tick) => tick + 1);
  }, [studentUid]);

  const submitAttendance = useCallback(
    async (
      session: LabSession | SessionSummary,
      location?: AttendanceLocationInput,
      qrToken?: string,
    ): Promise<SubmitAttendanceResult> => {
      if (!user) {
        return {
          ok: false,
          reason: 'role',
          message: 'Silakan masuk terlebih dahulu sebelum presensi.',
        };
      }

      return port.submitAttendance({
        session: toSessionSummary(session),
        user,
        location,
        qrToken,
      });
    },
    [port, user],
  );

  const value = useMemo<AttendanceContextInternal>(() => {
    if (!studentUid) {
      return {
        records: [],
        loading: false,
        error: null,
        fromCache: false,
        retry,
        submitAttendance,
        registerConsumer,
      };
    }

    const active = snapshot?.ownerUid === studentUid ? snapshot : null;
    return {
      records: active?.records ?? [],
      loading: !active || !active.resolved,
      error: active?.error ?? null,
      fromCache: active?.fromCache ?? false,
      retry,
      submitAttendance,
      registerConsumer,
    };
  }, [registerConsumer, retry, snapshot, studentUid, submitAttendance]);

  return (
    <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>
  );
}

export function useAttendance(): AttendanceContextValue {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  const { registerConsumer } = context;
  useEffect(() => registerConsumer(), [registerConsumer]);
  return context;
}
