import type { PracticumSession } from './types';

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
