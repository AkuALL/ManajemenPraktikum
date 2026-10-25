import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { AttendanceRecord, LabSession, SessionStatus } from '@/types';
import { useIdentity } from '@/features/identity';

import { SESSION_FIXTURES } from './fixtures';

type ScheduleContextValue = {
  sessions: LabSession[];
  attendance: AttendanceRecord[];
  getSessionById: (sessionId: string) => LabSession | undefined;
  getAttendanceForStudent: (studentId: string) => AttendanceRecord[];
  updateSessionStatus: (sessionId: string, status: SessionStatus) => boolean;
  recordAttendance: (sessionId: string) =>
    | { ok: true; record: AttendanceRecord }
    | { ok: false; reason: 'role' | 'session' | 'status' | 'duplicate' };
};

const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { activeIdentity } = useIdentity();
  const [sessions, setSessions] = useState<LabSession[]>(SESSION_FIXTURES);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const attendanceRef = useRef<AttendanceRecord[]>([]);

  const getSessionById = useCallback(
    (sessionId: string) => sessions.find((session) => session.id === sessionId),
    [sessions]
  );

  const updateSessionStatus = useCallback((sessionId: string, status: SessionStatus) => {
    if (activeIdentity?.role !== 'assistant') return false;
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return false;
    if (
      (session.status === 'upcoming' && status !== 'open') ||
      (session.status === 'open' && status !== 'closed') ||
      session.status === 'closed'
    ) return false;

    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId ? { ...session, status } : session
      )
    );
    return true;
  }, [activeIdentity?.role, sessions]);

  const getAttendanceForStudent = useCallback(
    (studentId: string) => attendance.filter((record) => record.studentId === studentId),
    [attendance]
  );

  const recordAttendance = useCallback((sessionId: string) => {
    if (activeIdentity?.role !== 'student') return { ok: false, reason: 'role' } as const;
    const session = sessions.find((item) => item.id === sessionId);
    if (!session) return { ok: false, reason: 'session' } as const;
    if (session.status !== 'open') return { ok: false, reason: 'status' } as const;
    if (attendanceRef.current.some((item) => item.sessionId === sessionId && item.studentId === activeIdentity.userId)) {
      return { ok: false, reason: 'duplicate' } as const;
    }

    const record: AttendanceRecord = {
      id: `${activeIdentity.userId}-${sessionId}`,
      sessionId,
      studentId: activeIdentity.userId,
      studentName: activeIdentity.displayName,
      attendedAt: new Date().toISOString(),
    };
    const nextAttendance = [...attendanceRef.current, record];
    attendanceRef.current = nextAttendance;
    setAttendance(nextAttendance);
    return { ok: true, record } as const;
  }, [activeIdentity, attendance, sessions]);

  const value = useMemo(
    () => ({ sessions, attendance, getSessionById, getAttendanceForStudent, updateSessionStatus, recordAttendance }),
    [attendance, getAttendanceForStudent, getSessionById, recordAttendance, sessions, updateSessionStatus]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const context = useContext(ScheduleContext);

  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider.');
  }

  return context;
}
