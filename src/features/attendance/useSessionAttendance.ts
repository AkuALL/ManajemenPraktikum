import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import type { AttendanceEntry } from '@/types';

import { firestoreAttendanceAdapter } from './firestore-adapter';
import type { AttendancePort } from './port';

type SessionSnapshotState = {
  sessionId: string;
  records: AttendanceEntry[];
  error: string | null;
  fromCache: boolean;
  resolved: boolean;
};

export function useSessionAttendance(
  sessionId: string | null,
  classId?: string | null,
  port: AttendancePort = firestoreAttendanceAdapter,
) {
  const { status, user } = useAuth();
  const [snapshot, setSnapshot] = useState<SessionSnapshotState | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const activeSessionId =
    status === 'authenticated' && user?.role === 'assistant' ? sessionId : null;

  useEffect(() => {
    if (!activeSessionId) return;

    const unsubscribe = port.subscribeSessionAttendance(
      activeSessionId,
      (nextRecords, meta) => {
        setSnapshot({
          sessionId: activeSessionId,
          records: nextRecords,
          fromCache: meta.fromCache,
          error: null,
          resolved: true,
        });
      },
      (err) => {
        setSnapshot({
          sessionId: activeSessionId,
          records: [],
          fromCache: false,
          error: err.message,
          resolved: true,
        });
      },
      classId ? { classId } : undefined,
    );

    return unsubscribe;
  }, [activeSessionId, classId, port, retryTick]);

  const retry = useCallback(() => {
    if (!activeSessionId) return;
    setSnapshot({
      sessionId: activeSessionId,
      records: [],
      fromCache: false,
      error: null,
      resolved: false,
    });
    setRetryTick((tick) => tick + 1);
  }, [activeSessionId]);

  if (!activeSessionId) {
    return {
      records: [] as AttendanceEntry[],
      loading: false,
      error: null as string | null,
      fromCache: false,
      retry,
    };
  }

  const active = snapshot?.sessionId === activeSessionId ? snapshot : null;

  return {
    records: active?.records ?? [],
    loading: !active || !active.resolved,
    error: active?.error ?? null,
    fromCache: active?.fromCache ?? false,
    retry,
  };
}
