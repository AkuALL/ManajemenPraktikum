import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { LabSession, SessionStatus } from '@/types';

import { SESSION_FIXTURES } from './fixtures';

type ScheduleContextValue = {
  sessions: LabSession[];
  getSessionById: (sessionId: string) => LabSession | undefined;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void;
};

const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<LabSession[]>(SESSION_FIXTURES);

  const getSessionById = useCallback(
    (sessionId: string) => sessions.find((session) => session.id === sessionId),
    [sessions]
  );

  const updateSessionStatus = useCallback((sessionId: string, status: SessionStatus) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId ? { ...session, status } : session
      )
    );
  }, []);

  const value = useMemo(
    () => ({ sessions, getSessionById, updateSessionStatus }),
    [getSessionById, sessions, updateSessionStatus]
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
