import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/features/auth';
import { classifyLeaveReason } from '@/services/classify-leave-reason';
import type { LeaveRequest, SessionSummary } from '@/types';

import { firestoreLeaveAdapter } from './firestore-adapter';
import {
  isLeaveEligibleStatus,
  LeavePortError,
  type LeavePort,
} from './port';

type LeaveSnapshot = {
  studentId: string;
  requests: LeaveRequest[];
  error: string | null;
  fromCache: boolean;
  resolved: boolean;
};

type SubmitLeaveResult =
  | { ok: true; request: LeaveRequest }
  | { ok: false; message: string };

type LeaveContextValue = {
  requests: LeaveRequest[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  classificationErrors: Record<string, string>;
  submitLeave: (session: SessionSummary, reason: string) => Promise<SubmitLeaveResult>;
  retryClassification: (leaveRequestId: string) => Promise<void>;
  reviewLeave: (
    leaveRequestId: string,
    decision: 'approved' | 'rejected',
    reviewNote?: string,
  ) => Promise<void>;
  retry: () => void;
};

const LeaveContext = createContext<LeaveContextValue | undefined>(undefined);

export function LeaveProvider({
  children,
  port = firestoreLeaveAdapter,
}: {
  children: ReactNode;
  port?: LeavePort;
}) {
  const { status, user } = useAuth();
  const [snapshot, setSnapshot] = useState<LeaveSnapshot | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [classificationErrors, setClassificationErrors] = useState<Record<string, string>>({});

  const studentId = status === 'authenticated' && user?.role === 'student' ? user.uid : null;

  useEffect(() => {
    if (!studentId) return;

    return port.subscribeStudentLeaveRequests(
      studentId,
      (requests, meta) => {
        setSnapshot({
          studentId,
          requests,
          fromCache: meta.fromCache,
          error: null,
          resolved: true,
        });
      },
      (error) => {
        setSnapshot({
          studentId,
          requests: [],
          fromCache: false,
          error: error.message,
          resolved: true,
        });
      },
    );
  }, [port, retryTick, studentId]);

  const requestClassification = useCallback(
    async (leaveRequestId: string) => {
      setClassificationErrors((current) => {
        const { [leaveRequestId]: _discarded, ...rest } = current;
        return rest;
      });

      try {
        await classifyLeaveReason(leaveRequestId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Klasifikasi AI tidak dapat diproses.';
        setClassificationErrors((current) => ({ ...current, [leaveRequestId]: message }));
        await port.markClassificationFailed(leaveRequestId).catch(() => undefined);
      }
    },
    [port],
  );

  const submitLeave = useCallback(
    async (session: SessionSummary, reason: string): Promise<SubmitLeaveResult> => {
      if (!user || user.role !== 'student') {
        return { ok: false, message: 'Hanya Praktikan yang dapat mengajukan izin.' };
      }
      if (!isLeaveEligibleStatus(session.status)) {
        return { ok: false, message: 'Izin hanya dapat diajukan sebelum sesi selesai.' };
      }

      try {
        const request = await port.createLeaveRequest({ session, user, reason });
        void requestClassification(request.id);
        return { ok: true, request };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof LeavePortError || error instanceof Error
              ? error.message
              : 'Pengajuan izin tidak dapat disimpan.',
        };
      }
    },
    [port, requestClassification, user],
  );

  const retryClassification = useCallback(
    async (leaveRequestId: string) => {
      await requestClassification(leaveRequestId);
    },
    [requestClassification],
  );

  const reviewLeave = useCallback(
    async (
      leaveRequestId: string,
      decision: 'approved' | 'rejected',
      reviewNote?: string,
    ) => {
      if (!user || user.role !== 'assistant') {
        throw new LeavePortError('forbidden', 'Hanya Asisten yang dapat memutuskan izin.');
      }
      await port.reviewLeaveRequest(leaveRequestId, user.uid, decision, reviewNote);
    },
    [port, user],
  );

  const retry = useCallback(() => setRetryTick((tick) => tick + 1), []);
  const active = snapshot?.studentId === studentId ? snapshot : null;

  const value = useMemo<LeaveContextValue>(
    () => ({
      requests: active?.requests ?? [],
      loading: Boolean(studentId) && (!active || !active.resolved),
      error: active?.error ?? null,
      fromCache: active?.fromCache ?? false,
      classificationErrors,
      submitLeave,
      retryClassification,
      reviewLeave,
      retry,
    }),
    [active, classificationErrors, retry, retryClassification, reviewLeave, studentId, submitLeave],
  );

  return <LeaveContext.Provider value={value}>{children}</LeaveContext.Provider>;
}

export function useLeave(): LeaveContextValue {
  const context = useContext(LeaveContext);
  if (!context) throw new Error('useLeave must be used within a LeaveProvider.');
  return context;
}

export function useAssistantLeaveRequests(
  classIds: string[],
  port: LeavePort = firestoreLeaveAdapter,
) {
  const { status, user } = useAuth();
  const [snapshot, setSnapshot] = useState<{
    key: string;
    requests: LeaveRequest[];
    error: string | null;
    fromCache: boolean;
    resolved: boolean;
  } | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const classKey = [...new Set(classIds)].sort().join(',');
  const isAssistant = status === 'authenticated' && user?.role === 'assistant';
  const requestKey = `${classKey}:${retryTick}`;

  useEffect(() => {
    if (!isAssistant) return;

    const ids = classKey ? classKey.split(',') : [];
    return port.subscribeAssistantLeaveRequests(
      ids,
      (nextRequests, meta) => {
        setSnapshot({
          key: requestKey,
          requests: nextRequests,
          error: null,
          fromCache: meta.fromCache,
          resolved: true,
        });
      },
      (listenerError) => {
        setSnapshot({
          key: requestKey,
          requests: [],
          error: listenerError.message,
          fromCache: false,
          resolved: true,
        });
      },
    );
  }, [classKey, isAssistant, port, requestKey]);

  const active = isAssistant && snapshot?.key === requestKey ? snapshot : null;

  return {
    requests: active?.requests ?? [],
    loading: isAssistant && (!active || !active.resolved),
    error: active?.error ?? null,
    fromCache: active?.fromCache ?? false,
    retry: () => setRetryTick((tick) => tick + 1),
  };
}
