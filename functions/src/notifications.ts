import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

import { db, region } from './firebase-admin.js';

type PushMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
};

/** Member kelas lama dapat disimpan sebagai NIM; profil pengguna memakai UID Firebase. */
async function studentUidsForClass(classId: string): Promise<string[]> {
  const classDoc = await db.collection('classes').doc(classId).get();
  const members = classDoc.data()?.memberUids;
  if (!Array.isArray(members)) return [];
  const ids = [...new Set(members.filter((item): item is string => typeof item === 'string' && item.length > 0))];
  const users = new Set<string>();
  for (const id of ids) {
    const direct = await db.collection('users').doc(id).get();
    if (direct.exists && direct.data()?.role === 'student') users.add(direct.id);
    const matches = await db.collection('users').where('identifier', '==', id).get();
    matches.docs.filter((user) => user.data().role === 'student').forEach((user) => users.add(user.id));
  }
  return [...users];
}

async function assistantsForClass(classId: string): Promise<string[]> {
  const classDoc = await db.collection('classes').doc(classId).get();
  const ids = classDoc.data()?.assistantIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}

async function sendWebPush(eventId: string, uids: string[], message: PushMessage): Promise<void> {
  const snapshots = await Promise.all(uids.map((uid) => db.collection('users').doc(uid).collection('webPushTokens').get()));
  const registrations = snapshots.flatMap((snapshot) => snapshot.docs);
  const byToken = new Map<string, typeof registrations>();
  for (const registration of registrations) {
    const token = registration.data().token;
    if (typeof token !== 'string') continue;
    const matches = byToken.get(token) ?? [];
    matches.push(registration);
    byToken.set(token, matches);
  }

  const tokens = [...byToken.keys()];
  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);
    const result = await getMessaging().sendEachForMulticast({
      tokens: batch,
      data: { ...message.data, title: message.title, body: message.body, eventId },
    });
    if (!result.failureCount) continue;

    logger.warn('FCM menolak sebagian push web.', {
      eventId,
      failed: result.failureCount,
      codes: [...new Set(result.responses.flatMap((response) => response.error ? [response.error.code] : []))],
    });
    const expired = result.responses.flatMap((response, offset) =>
      response.error?.code === 'messaging/registration-token-not-registered'
        ? byToken.get(batch[offset]) ?? []
        : [],
    );
    await Promise.allSettled(expired.map((registration) => registration.ref.delete({ lastUpdateTime: registration.updateTime })));
  }
}

async function sendNativePush(eventId: string, uids: string[], message: PushMessage): Promise<void> {
  const profiles = await Promise.all(uids.map((uid) => db.collection('users').doc(uid).get()));
  const tokens = [...new Set(profiles.flatMap((profile) => {
    const value = profile.data()?.pushTokens;
    return Array.isArray(value) ? value.filter((token): token is string => typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[/.test(token)) : [];
  }))];
  if (!tokens.length) {
    return;
  }
  for (let index = 0; index < tokens.length; index += 100) {
    const payload = tokens.slice(index, index + 100).map((to) => ({
      to,
      sound: 'default',
      priority: 'high',
      channelId: 'practicum-alerts',
      ...message,
    }));
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { data?: { status?: string; message?: string }[]; errors?: unknown };
    if (!response.ok || result.errors || result.data?.some((ticket) => ticket.status === 'error')) {
      logger.error('Expo menolak notifikasi.', {
        eventId,
        httpStatus: response.status,
        rejectedTickets: result.data?.filter((ticket) => ticket.status === 'error').length ?? 0,
      });
    }
  }
}

async function sendEventPush(eventId: string, uids: string[], message: PushMessage): Promise<void> {
  const uniqueUids = [...new Set(uids)];
  const results = await Promise.allSettled([
    sendNativePush(eventId, uniqueUids, message),
    sendWebPush(eventId, uniqueUids, message),
  ]);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error('Pengiriman push gagal.', {
        eventId,
        platform: index === 0 ? 'native' : 'web',
        code: result.reason?.code,
      });
    }
  });
}

export const notifySessionCreated = onDocumentCreated({ document: 'sessions/{sessionId}', region }, async (event) => {
  const session = event.data?.data();
  if (!session || typeof session.classId !== 'string') return;
  await sendEventPush(event.id, await studentUidsForClass(session.classId), {
    title: 'Sesi Praktikum Baru',
    body: `Sesi ${session.title ?? 'praktikum'} telah ditambahkan di ${session.location ?? 'laboratorium'}.`,
    data: { type: 'SCHEDULE_CHANGED', sessionId: event.params.sessionId, classId: session.classId, route: '/schedule' },
  });
});

export const notifySessionUpdated = onDocumentUpdated({ document: 'sessions/{sessionId}', region }, async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (typeof after.classId !== 'string') return;
  const opened = before.status === 'scheduled' && after.status === 'open';
  const timeChanged = (field: string) => before[field]?.toMillis?.() !== after[field]?.toMillis?.();
  const changed = after.status === 'scheduled' && (before.location !== after.location || before.labId !== after.labId || timeChanged('startsAt') || timeChanged('endsAt'));
  if (!opened && !changed) return;
  await sendEventPush(event.id, await studentUidsForClass(after.classId), {
    title: opened ? 'Sesi Praktikum Dibuka' : 'Jadwal Praktikum Diperbarui',
    body: opened ? `${after.title} sudah dibuka di ${after.location}. Silakan lakukan presensi.` : `Jadwal atau lokasi ${after.title} telah diperbarui.`,
    data: { type: opened ? 'SESSION_OPENED' : 'SCHEDULE_CHANGED', sessionId: event.params.sessionId, classId: after.classId, route: opened ? '/presensi' : '/schedule' },
  });
});

export const notifyLeaveCreated = onDocumentCreated({ document: 'leaveRequests/{leaveId}', region }, async (event) => {
  const leave = event.data?.data();
  if (!leave || typeof leave.classId !== 'string' || typeof leave.studentId !== 'string') return;
  const student = await db.collection('users').doc(leave.studentId).get();
  await sendEventPush(event.id, await assistantsForClass(leave.classId), {
    title: 'Pengajuan Izin Baru',
    body: `${student.data()?.displayName ?? 'Praktikan'} mengajukan izin praktikum.`,
    data: { type: 'LEAVE_SUBMITTED', sessionId: leave.sessionId, classId: leave.classId, leaveRequestId: event.params.leaveId, route: '/review-izin' },
  });
});

export const notifyLeaveDecision = onDocumentUpdated({ document: 'leaveRequests/{leaveId}', region }, async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const leave = event.data.after.data();
  if (before.status !== 'pending' || !['approved', 'rejected'].includes(leave.status) || typeof leave.studentId !== 'string') return;
  const approved = leave.status === 'approved';
  await sendEventPush(event.id, [leave.studentId], {
    title: approved ? 'Pengajuan Izin Disetujui' : 'Pengajuan Izin Ditolak',
    body: `Pengajuan izin Anda ${approved ? 'disetujui' : 'ditolak'} oleh asisten.`,
    data: { type: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED', sessionId: leave.sessionId, classId: leave.classId, leaveRequestId: event.params.leaveId, route: '/kehadiran' },
  });
});
