import type { PushNotificationPayload } from '@/types';
import { sendPushNotification } from '@/services/notification/push-sender';

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

async function defaultPushSender(
  payload: PushNotificationPayload,
): Promise<LeaveNotificationDispatchResult> {
  return sendPushNotification(payload);
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
