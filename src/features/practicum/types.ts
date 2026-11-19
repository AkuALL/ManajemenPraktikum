/**
 * Kontrak tipe domain Manajemen Praktikum (Sprint 2)
 * Meliputi Kelas, Anggota, Sesi, dan Lifecycle Buka/Tutup Sesi
 * Sesuai SRS_Manajemen_Praktikum_Sprint_2 & firestore.rules
 */

export type UserRole = 'assistant' | 'student';

export type SessionStatus = 'scheduled' | 'open' | 'closed';

export interface PracticumClass {
  id: string;
  courseName: string;
  className: string;
  lab?: string;
  assistantIds: string[];
  memberUids?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface StudentCandidate {
  userId: string;
  authUid?: string;
  displayName: string;
  identifier: string;
}

export interface ClassMember {
  userId: string;
  role: 'student';
  displayName: string;
  identifier: string; // NIM
  joinedAt: string;
}

export interface PracticumSession {
  id: string;
  classId: string;
  className?: string;
  courseName?: string;
  title: string;
  location: string;
  startsAt: string; // Format ISO atau jam "HH:mm" / YYYY-MM-DDTHH:mm
  endsAt: string;
  status: SessionStatus;
  openedBy?: string;
  openedAt?: string;
  closedBy?: string;
  closedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  date?: string;
  assistantName?: string;
}

export interface CreateClassInput {
  courseName: string;
  className: string;
  lab?: string;
  assistantIds?: string[];
}

export interface UpdateClassInput {
  courseName?: string;
  className?: string;
  lab?: string;
  assistantIds?: string[];
}

export interface AddMemberInput {
  userId: string;
  displayName: string;
  identifier: string;
}

export interface CreateSessionInput {
  classId: string;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
  date?: string;
}

export interface UpdateSessionInput {
  title?: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  date?: string;
}
