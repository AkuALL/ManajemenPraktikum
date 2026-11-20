import { doc, getDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { PushNotificationPayload } from '@/types';

import {
  buildLeaveDecisionNotificationPayload,
  executeLeaveNotificationDispatch,
  type LeaveDecisionNotificationInput,
  type LeaveNotificationDispatchResult,
  type PushNotificationSender,
} from './leave-notification-payload';

export {
  buildLeaveDecisionNotificationPayload,
  type LeaveDecisionNotificationInput,
  type LeaveNotificationDispatchResult,
  type PushNotificationSender,
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

function isExpoPushToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['))
  );
}

async function sendViaExpoPushApi(
  tokens: string[],
  payload: PushNotificationPayload,
): Promise<number> {
  if (tokens.length === 0) return 0;

  const messages = tokens.map((to) => ({
    to,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: {
      ...payload.data,
      type: payload.type,
    },
  }));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });

    if (!response.ok) {
      return 0;
    }
    return tokens.length;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function defaultPushSender(
  payload: PushNotificationPayload,
): Promise<LeaveNotificationDispatchResult> {
  const uniqueUids = Array.from(new Set(payload.recipientUids)).filter(Boolean);
  if (uniqueUids.length === 0) {
    return { ok: true, sentCount: 0, skippedReason: 'no-recipients' };
  }

  const tokens: string[] = [];
  for (const uid of uniqueUids) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) continue;
    const rawTokens = userSnap.data()?.pushTokens;
    if (Array.isArray(rawTokens)) {
      rawTokens.forEach((token) => {
        if (isExpoPushToken(token)) {
          tokens.push(token);
        }
      });
    }
  }

  const uniqueTokens = Array.from(new Set(tokens));
  if (uniqueTokens.length === 0) {
    return { ok: true, sentCount: 0, skippedReason: 'no-push-tokens' };
  }

  const sentCount = await sendViaExpoPushApi(uniqueTokens, payload);
  return {
    ok: sentCount > 0,
    sentCount,
    skippedReason: sentCount === 0 ? 'push-delivery-failed' : undefined,
  };
}

/**
 * Mengirim push notification keputusan izin secara fault-tolerant (NFR-05):
 * kegagalan pengiriman atau ketiadaan token tidak melempar error ke alur keputusan izin.
 */
export async function dispatchLeaveDecisionNotification(
  input: LeaveDecisionNotificationInput,
  sender: PushNotificationSender = defaultPushSender,
): Promise<LeaveNotificationDispatchResult> {
  return executeLeaveNotificationDispatch(input, sender);
}
