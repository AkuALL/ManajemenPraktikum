import type { PushNotificationPayload } from '@/types';
import {
  dispatchLeaveSubmittedNotification,
  sendPushNotification,
} from '@/features/notifications/push-sender';

import {
  buildLeaveDecisionNotificationPayload,
  buildLeaveSubmittedNotificationPayload,
  executeLeaveNotificationDispatch,
  type LeaveDecisionNotificationInput,
  type LeaveNotificationDispatchResult,
  type LeaveSubmittedNotificationInput,
  type PushNotificationSender,
} from './leave-notification-payload';

export {
  buildLeaveDecisionNotificationPayload,
  buildLeaveSubmittedNotificationPayload,
  dispatchLeaveSubmittedNotification,
  type LeaveDecisionNotificationInput,
  type LeaveNotificationDispatchResult,
  type LeaveSubmittedNotificationInput,
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
