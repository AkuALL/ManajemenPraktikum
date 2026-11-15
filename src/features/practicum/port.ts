import {
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
    onError?: (err: Error) => void
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
