import type { PracticumSession } from './types';

export type SessionStartWindowResult = {
  canOpen: boolean;
  state: 'before' | 'within' | 'after';
  reason?: string;
};

export interface ScheduleConflictCandidate {
  classId: string;
  labId?: string;
  location?: string;
  locationName?: string;
  startsAt: string;
  endsAt: string;
  date?: string;
  excludeSessionId?: string;
}

export interface ScheduleConflictResult {
  hasConflict: boolean;
  conflictType?: 'lab' | 'class';
  conflictingSession?: PracticumSession;
  message?: string;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function parseSessionBoundary(value: string, dateHint?: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (/^\d{2}:\d{2}$/.test(trimmed) && dateHint && /^\d{4}-\d{2}-\d{2}$/.test(dateHint.trim())) {
    const parsed = new Date(`${dateHint.trim()}T${trimmed}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Memeriksa apakah waktu saat ini berada di dalam rentang jadwal sesi agar asisten boleh membukanya. */
export function checkSessionStartWindow(
  session: Pick<PracticumSession, 'startsAt' | 'endsAt' | 'date'>,
  now: Date = new Date(),
): SessionStartWindowResult {
  const start = parseSessionBoundary(session.startsAt, session.date);
  const end = parseSessionBoundary(session.endsAt, session.date);
  if (!start || !end) {
    return { canOpen: true, state: 'within' };
  }

  const nowMs = now.getTime();
  if (nowMs < start.getTime()) {
    return {
      canOpen: false,
      state: 'before',
      reason: `Sesi belum memasuki jamnya. Dapat dimulai pada ${formatShortDate(start)} pukul ${formatClock(start)}–${formatClock(end)}.`,
    };
  }

  if (nowMs > end.getTime()) {
    return {
      canOpen: false,
      state: 'after',
      reason: `Jadwal sesi (${formatShortDate(start)} pukul ${formatClock(start)}–${formatClock(end)}) telah berakhir. Reschedule sesi terlebih dahulu.`,
    };
  }

  return { canOpen: true, state: 'within' };
}

export function assertSessionWithinStartWindow(
  session: Pick<PracticumSession, 'startsAt' | 'endsAt' | 'date'>,
  now: Date = new Date(),
): void {
  const check = checkSessionStartWindow(session, now);
  if (!check.canOpen) {
    throw new Error(check.reason ?? 'Sesi praktikum belum memasuki jam pelaksanaan.');
  }
}

/** Memeriksa bentrok jadwal pada lab yang sama atau sesi lain di kelas yang sama (termasuk saat reschedule). */
export function findScheduleConflict(
  existingSessions: PracticumSession[],
  candidate: ScheduleConflictCandidate,
): ScheduleConflictResult {
  const candidateStart = parseSessionBoundary(candidate.startsAt, candidate.date);
  const candidateEnd = parseSessionBoundary(candidate.endsAt, candidate.date);
  if (!candidateStart || !candidateEnd || candidateStart.getTime() >= candidateEnd.getTime()) {
    return { hasConflict: false };
  }

  const candidateLabId = candidate.labId?.trim().toLowerCase() ?? '';
  const candidateLocation = (candidate.locationName ?? candidate.location ?? '').trim().toLowerCase();

  for (const session of existingSessions) {
    if (candidate.excludeSessionId && session.id === candidate.excludeSessionId) {
      continue;
    }
    if ((session.status as string) === 'cancelled') {
      continue;
    }

    const otherStart = parseSessionBoundary(session.startsAt, session.date);
    const otherEnd = parseSessionBoundary(session.endsAt, session.date);
    if (!otherStart || !otherEnd) {
      continue;
    }

    const overlaps =
      candidateStart.getTime() < otherEnd.getTime() &&
      otherStart.getTime() < candidateEnd.getTime();
    if (!overlaps) {
      continue;
    }

    const otherLabId = session.labId?.trim().toLowerCase() ?? '';
    const otherLocation = (session.locationName ?? session.location ?? '').trim().toLowerCase();
    const isSameLab =
      candidateLabId && otherLabId
        ? candidateLabId === otherLabId
        : Boolean(candidateLocation && otherLocation && candidateLocation === otherLocation);

    if (isSameLab) {
      const labLabel =
        session.locationName ??
        session.location ??
        candidate.locationName ??
        candidate.location ??
        'lab ini';
      return {
        hasConflict: true,
        conflictType: 'lab',
        conflictingSession: session,
        message: `Jadwal bentrok di ${labLabel} dengan sesi "${session.title}" (${formatShortDate(otherStart)} pukul ${formatClock(otherStart)}–${formatClock(otherEnd)}). Pilih lab atau jam lain.`,
      };
    }

    if (candidate.classId && session.classId === candidate.classId) {
      return {
        hasConflict: true,
        conflictType: 'class',
        conflictingSession: session,
        message: `Jadwal bentrok dengan sesi lain di kelas ini ("${session.title}", ${formatShortDate(otherStart)} pukul ${formatClock(otherStart)}–${formatClock(otherEnd)}). Pilih hari atau jam lain.`,
      };
    }
  }

  return { hasConflict: false };
}

export function assertNoScheduleConflict(
  existingSessions: PracticumSession[],
  candidate: ScheduleConflictCandidate,
): void {
  const result = findScheduleConflict(existingSessions, candidate);
  if (result.hasConflict) {
    throw new Error(result.message ?? 'Jadwal praktikum bentrok dengan sesi lain.');
  }
}

/** Pertemuan mengikuti jadwal mulai, dengan ID sebagai penentu jika waktunya sama. */
export function compareSessions(a: PracticumSession, b: PracticumSession): number {
  const key = (session: PracticumSession) => session.startsAt.includes('T')
    ? session.startsAt
    : `${session.date ?? ''}T${session.startsAt}`;
  return key(a).localeCompare(key(b)) || a.id.localeCompare(b.id);
}

export function assertPreviousSessionsClosed(sessions: PracticumSession[], sessionId: string): void {
  const ordered = [...sessions].sort(compareSessions);
  const index = ordered.findIndex((session) => session.id === sessionId);
  if (index < 0) throw new Error('Sesi tidak ditemukan dalam kelas.');
  const previous = ordered.slice(0, index).find((session) => session.status !== 'closed');
  if (previous) throw new Error(`Selesaikan pertemuan sebelumnya (${previous.title}) terlebih dahulu.`);
}
