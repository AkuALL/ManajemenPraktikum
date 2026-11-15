import type {
  AttendanceEntry,
  AuthUser,
  LabSession,
  SessionSummary,
} from '@/types';

export type AttendanceErrorCode =
  | 'role'
  | 'status'
  | 'duplicate'
  | 'forbidden'
  | 'network'
  | 'unknown';

export class AttendancePortError extends Error {
  readonly code: AttendanceErrorCode;

  constructor(code: AttendanceErrorCode, message: string) {
    super(message);
    this.name = 'AttendancePortError';
    this.code = code;
  }
}

export type AttendanceListenerMeta = {
  fromCache: boolean;
};

export type SubmitAttendanceResult =
  | { ok: true; record: AttendanceEntry }
  | { ok: false; reason: 'duplicate'; record?: AttendanceEntry; message: string }
  | { ok: false; reason: 'role' | 'status' | 'forbidden' | 'network' | 'unknown'; message: string };

export interface AttendancePort {
  submitAttendance(input: {
    session: SessionSummary;
    user: AuthUser;
  }): Promise<SubmitAttendanceResult>;
  subscribeStudentAttendance(
    studentId: string,
    onData: (records: AttendanceEntry[], meta: AttendanceListenerMeta) => void,
    onError: (error: AttendancePortError) => void,
  ): () => void;
  subscribeSessionAttendance(
    sessionId: string,
    onData: (records: AttendanceEntry[], meta: AttendanceListenerMeta) => void,
    onError: (error: AttendancePortError) => void,
    options?: { classId?: string },
  ): () => void;
}

// Mock SessionSummary untuk pengujian mandiri tanpa menunggu modul kelas/sesi lain.
export const MOCK_SESSION_SUMMARIES: SessionSummary[] = [
  { id: 'session-basis-data-01', classId: 'class-basis-data-b', status: 'scheduled' },
  { id: 'session-dasar-pemrograman-01', classId: 'class-dasar-pemrograman-a', status: 'open' },
  { id: 'session-jaringan-komputer-01', classId: 'class-jaringan-komputer-a', status: 'closed' },
];

export function isSessionSummary(
  session: LabSession | SessionSummary,
): session is SessionSummary {
  return 'classId' in session && !('practicumName' in session);
}

export function toSessionSummary(
  session: LabSession | SessionSummary,
): SessionSummary {
  if (isSessionSummary(session)) {
    return session;
  }

  return {
    id: session.id,
    classId: session.courseClass ?? session.id,
    status: session.status === 'upcoming' ? 'scheduled' : session.status,
  };
}

export function formatServerTime(
  attendedAtMs: number | null,
  mode: 'time' | 'datetime' = 'datetime',
): string {
  if (attendedAtMs === null) {
    return 'Menunggu waktu server';
  }

  const date = new Date(attendedAtMs);
  if (mode === 'time') {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function sortAttendanceEntries(
  entries: AttendanceEntry[],
  ascending: boolean,
): AttendanceEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = a.attendedAtMs ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.attendedAtMs ?? Number.MAX_SAFE_INTEGER;
    return ascending ? aTime - bTime : bTime - aTime;
  });
}

export function mapAttendanceError(error: unknown): AttendancePortError {
  if (error instanceof AttendancePortError) return error;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'already-exists':
      return new AttendancePortError(
        'duplicate',
        'Kehadiran Anda pada sesi ini sudah tercatat.',
      );
    case 'permission-denied':
      return new AttendancePortError(
        'forbidden',
        'Presensi ditolak. Pastikan Anda anggota kelas dan sesi sedang berlangsung.',
      );
    case 'unavailable':
    case 'deadline-exceeded':
      return new AttendancePortError(
        'network',
        'Koneksi ke server terputus. Periksa jaringan lalu coba lagi.',
      );
    default:
      return new AttendancePortError(
        'unknown',
        error instanceof Error && error.message
          ? error.message
          : 'Gagal memproses data presensi.',
      );
  }
}
