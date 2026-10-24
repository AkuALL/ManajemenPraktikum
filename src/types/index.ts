/**
 * Kontrak Data Minimum Sistem Manajemen Praktikum - Sprint 1
 * Dikelola oleh: Galang (Owner kontrak data lintas-domain)
 * Referensi: Jobdesc Programmer Sprint 1 Bagian 3
 */

export type UserRole = 'assistant' | 'student';
export type SessionStatus = 'upcoming' | 'open' | 'closed';

export type LabSession = {
  id: string;
  practicumName: string;
  location: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  attendedAt: string;
};

export type UserIdentity = {
  role: UserRole;
  userId: string;
  displayName: string;
  identifier?: string; // misal NIM / NIP / Kode Asisten
};
export * from './session';
