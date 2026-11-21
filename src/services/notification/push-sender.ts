import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { buildLeaveSubmittedNotificationPayload } from '@/features/leave/leave-notification-payload';
import { auth, db } from '@/lib/firebase';
import type { PushNotificationPayload } from '@/types';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export type PushNotificationDispatchResult = {
  ok: boolean;
  sentCount: number;
  skippedReason?: string;
};

type SessionPushContext = {
  sessionId: string;
  classId: string;
  title: string;
  location: string;
};

function isExpoPushToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
  );
}

async function resolveExpoPushTokens(recipientUids: string[]): Promise<string[]> {
  const users = await Promise.all(
    Array.from(new Set(recipientUids.filter(Boolean))).map((uid) => getDoc(doc(db, 'users', uid))),
  );
  return Array.from(
    new Set(
      users.flatMap((user) => {
        const tokens = user.exists() ? user.data().pushTokens : [];
        return Array.isArray(tokens) ? tokens.filter(isExpoPushToken) : [];
      }),
    ),
  );
}

async function resolveClassAssistantUids(classId: string): Promise<string[]> {
  const classSnapshot = await getDoc(doc(db, 'classes', classId));
  if (!classSnapshot.exists()) return [];

  const assistants = classSnapshot.data().assistantIds;
  if (!Array.isArray(assistants)) return [];
  return Array.from(
    new Set(
      assistants.filter((uid): uid is string => typeof uid === 'string' && uid.trim().length > 0),
    ),
  );
}

async function resolveClassStudentUids(classId: string): Promise<string[]> {
  const classSnapshot = await getDoc(doc(db, 'classes', classId));
  if (!classSnapshot.exists()) return [];

  const members = classSnapshot.data().memberUids;
  if (!Array.isArray(members) || members.length === 0) return [];
  const memberIds = new Set(members.filter((member): member is string => typeof member === 'string'));

  const students = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'student')),
  );
  return students.docs
    .filter((student) => {
      const data = student.data();
      return memberIds.has(student.id) || memberIds.has(data.identifier);
    })
    .map((student) => student.id);
}

async function recordNotificationLogs(
  recipientUids: string[],
  payload: PushNotificationPayload,
  status: 'sent' | 'skipped' | 'failed',
): Promise<void> {
  const senderUid = auth.currentUser?.uid;
  if (!senderUid || recipientUids.length === 0) return;

  await Promise.allSettled(
    recipientUids.map((recipientUid) =>
      addDoc(collection(db, 'notifications'), {
        recipientUid,
        senderUid,
        title: payload.title,
        body: payload.body,
        type: payload.type,
        data: payload.data,
        status,
        sentAt: serverTimestamp(),
      }),
    ),
  );
}

/** Mengirim payload Sprint 3 melalui Expo Push API tanpa menghentikan alur utama aplikasi. */
export async function sendPushNotification(
  payload: PushNotificationPayload,
): Promise<PushNotificationDispatchResult> {
  const uniqueRecipients = Array.from(new Set(payload.recipientUids.filter(Boolean)));
  let deliveryStatus: 'sent' | 'skipped' | 'failed' = 'failed';
  let result: PushNotificationDispatchResult;

  try {
    const tokens = await resolveExpoPushTokens(uniqueRecipients);
    if (tokens.length === 0) {
      deliveryStatus = 'skipped';
      result = { ok: true, sentCount: 0, skippedReason: 'no-push-tokens' };
    } else {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          tokens.map((to) => ({
            to,
            sound: 'default',
            title: payload.title,
            body: payload.body,
            data: { ...payload.data, type: payload.type },
          })),
        ),
      });

      if (response.ok) {
        deliveryStatus = 'sent';
        result = { ok: true, sentCount: tokens.length };
      } else {
        deliveryStatus = 'failed';
        result = { ok: false, sentCount: 0, skippedReason: 'push-delivery-failed' };
      }
    }
  } catch {
    deliveryStatus = 'failed';
    result = { ok: false, sentCount: 0, skippedReason: 'notification-dispatch-error' };
  }

  await recordNotificationLogs(uniqueRecipients, payload, deliveryStatus);
  return result;
}

async function sendClassNotification(
  context: SessionPushContext,
  payload: Omit<PushNotificationPayload, 'recipientUids'>,
): Promise<PushNotificationDispatchResult> {
  try {
    const recipientUids = await resolveClassStudentUids(context.classId);
    if (recipientUids.length === 0) {
      return { ok: true, sentCount: 0, skippedReason: 'no-recipients' };
    }
    return sendPushNotification({ ...payload, recipientUids });
  } catch {
    return { ok: false, sentCount: 0, skippedReason: 'notification-dispatch-error' };
  }
}

export function dispatchSessionOpenedNotification(context: SessionPushContext) {
  return sendClassNotification(context, {
    type: 'SESSION_OPENED',
    title: 'Sesi Praktikum Dibuka',
    body: `${context.title} sudah dibuka di ${context.location}. Silakan lakukan presensi.`,
    data: { sessionId: context.sessionId, classId: context.classId, route: '/presensi' },
  });
}

export function dispatchScheduleChangedNotification(context: SessionPushContext) {
  return sendClassNotification(context, {
    type: 'SCHEDULE_CHANGED',
    title: 'Jadwal Praktikum Diperbarui',
    body: `Jadwal atau lokasi ${context.title} telah diperbarui. Lokasi: ${context.location}.`,
    data: { sessionId: context.sessionId, classId: context.classId, route: '/schedule' },
  });
}

export async function dispatchLeaveSubmittedNotification(context: {
  leaveRequestId: string;
  classId: string;
  sessionId: string;
  studentName: string;
  sessionTitle?: string;
  reason?: string;
}): Promise<PushNotificationDispatchResult> {
  try {
    const assistantIds = await resolveClassAssistantUids(context.classId);
    if (assistantIds.length === 0) {
      return { ok: true, sentCount: 0, skippedReason: 'no-recipients' };
    }
    const payload = buildLeaveSubmittedNotificationPayload({
      ...context,
      assistantIds,
    });
    return sendPushNotification(payload);
  } catch {
    return { ok: false, sentCount: 0, skippedReason: 'notification-dispatch-error' };
  }
}
