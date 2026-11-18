import type {
  AddMemberInput,
  ClassMember,
  CreateClassInput,
  CreateSessionInput,
  PracticumClass,
  PracticumSession,
  UpdateClassInput,
  UpdateSessionInput,
} from './types';

/**
 * Port interface untuk domain Manajemen Praktikum (Hexagonal Architecture)
 * Mengizinkan implementasi fleksibel dengan Mock Adapter maupun Firebase Firestore.
 */
export interface PracticumPort {
  // === KELAS ===
  getClasses(assistantId?: string): Promise<PracticumClass[]>;
  subscribeClasses(
    assistantId: string | undefined,
    onData: (classes: PracticumClass[]) => void,
    onError?: (err: Error) => void,
    studentId?: string
  ): () => void;
  createClass(input: CreateClassInput, assistantId: string): Promise<PracticumClass>;
  updateClass(classId: string, input: UpdateClassInput): Promise<void>;
  deleteClass(classId: string): Promise<void>;

  // === ANGGOTA KELAS ===
  getClassMembers(classId: string): Promise<ClassMember[]>;
  subscribeClassMembers(
    classId: string,
    onData: (members: ClassMember[]) => void,
    onError?: (err: Error) => void
  ): () => void;
  addMember(classId: string, input: AddMemberInput): Promise<ClassMember>;
  removeMember(classId: string, memberId: string): Promise<void>;

  // === SESI PRAKTIKUM & JADWAL ===
  getSessions(classId?: string): Promise<PracticumSession[]>;
  subscribeSessions(
    classId: string | undefined,
    studentId: string | undefined,
    role: 'assistant' | 'student',
    onData: (sessions: PracticumSession[]) => void,
    onError?: (err: Error) => void
  ): () => void;
  getSession(sessionId: string): Promise<PracticumSession | null>;
  subscribeSession(
    sessionId: string,
    onData: (session: PracticumSession | null) => void,
    onError?: (err: Error) => void
  ): () => void;
  createSession(input: CreateSessionInput, assistantId: string): Promise<PracticumSession>;
  updateSession(sessionId: string, input: UpdateSessionInput): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;

  // === LIFECYCLE SESI (BUKA & TUTUP) ===
  openSession(sessionId: string, assistantId: string): Promise<void>;
  closeSession(sessionId: string, assistantId: string): Promise<void>;
}

const ISO_DATE_HINT = /^\d{4}-\d{2}-\d{2}[T ]/;

/** Memformat ISO timestamp sesi menjadi jam lokal ringkas; string jam biasa dikembalikan apa adanya. */
export function formatSessionTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !ISO_DATE_HINT.test(trimmed)) return value;
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Mengambil label tanggal sesi dari field date eksplisit atau fallback dari ISO startsAt. */
export function formatSessionDate(dateStr?: string, startsAt?: string): string {
  const explicit = dateStr?.trim();
  if (explicit) return explicit;
  if (startsAt && ISO_DATE_HINT.test(startsAt.trim())) {
    const parsed = Date.parse(startsAt);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return 'Belum ditentukan';
}
