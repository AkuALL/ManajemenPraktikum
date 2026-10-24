/**
 * Kontrak data minimum Sprint 1 — Sistem Manajemen Praktikum
 * Sesuai SRS & Jobdesc Sprint 1 (Bagian 2 & 3)
 */

export type UserRole = 'assistant' | 'student';

export type SessionStatus = 'upcoming' | 'open' | 'closed';

export interface LabSession {
  id: string;
  practicumName: string;
  courseClass?: string;
  location: string;
  date?: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  assistantName?: string;
  assistantId?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  attendedAt: string;
}

export type SessionActionType = 'open' | 'close';

export interface SessionStatusTransition {
  sessionId: string;
  fromStatus: SessionStatus;
  toStatus: SessionStatus;
  timestamp: string;
}
