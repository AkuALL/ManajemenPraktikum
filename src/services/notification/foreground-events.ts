import type { PracticumSession } from '../../features/practicum/types';
import type { LeaveRequest } from '../../types';

export type ForegroundEvent = { id: string; title: string; body: string; route: string; sessionId?: string };

export function getSessionEvents(previous: PracticumSession[], current: PracticumSession[]): ForegroundEvent[] {
  const old = new Map(previous.map((session) => [session.id, session]));
  return current.flatMap((session) => {
    const prior = old.get(session.id);
    if ((!prior || prior.status === 'scheduled') && session.status === 'open') {
      return [{ id: `session-open-${session.id}`, title: 'Sesi Praktikum Dibuka', body: `${session.title} sudah dibuka. Silakan lakukan presensi.`, route: '/presensi', sessionId: session.id }];
    }
    if (!prior && session.status === 'scheduled') {
      return [{ id: `session-new-${session.id}`, title: 'Sesi Praktikum Baru', body: `${session.title} telah ditambahkan di ${session.location}.`, route: '/schedule' }];
    }
    if (prior && session.status === 'scheduled' && (prior.startsAt !== session.startsAt || prior.endsAt !== session.endsAt || prior.location !== session.location || prior.labId !== session.labId)) {
      return [{ id: `session-changed-${session.id}`, title: 'Jadwal Praktikum Diperbarui', body: `Jadwal atau lokasi ${session.title} telah diperbarui.`, route: '/schedule' }];
    }
    return [];
  });
}

export function getLeaveEvents(previous: LeaveRequest[], current: LeaveRequest[], role: 'student' | 'assistant'): ForegroundEvent[] {
  const old = new Map(previous.map((request) => [request.id, request]));
  return current.flatMap((request) => {
    const prior = old.get(request.id);
    if (role === 'assistant' && !prior && request.status === 'pending') {
      return [{ id: `leave-new-${request.id}`, title: 'Pengajuan Izin Baru', body: 'Ada pengajuan izin praktikan yang perlu ditinjau.', route: '/review-izin' }];
    }
    if (role === 'student' && prior?.status === 'pending' && (request.status === 'approved' || request.status === 'rejected')) {
      const approved = request.status === 'approved';
      return [{ id: `leave-${request.status}-${request.id}`, title: approved ? 'Pengajuan Izin Disetujui' : 'Pengajuan Izin Ditolak', body: `Pengajuan izin Anda ${approved ? 'disetujui' : 'ditolak'} oleh asisten.`, route: '/kehadiran' }];
    }
    return [];
  });
}
