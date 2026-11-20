import type { NotificationType, PushNotificationPayload } from '@/types';

export type LeaveDecisionNotificationInput = {
  leaveRequestId: string;
  studentId: string;
  sessionId: string;
  classId: string;
  decision: 'approved' | 'rejected';
  sessionTitle?: string;
  reviewNote?: string;
};

export type LeaveNotificationDispatchResult = {
  ok: boolean;
  sentCount: number;
  skippedReason?: string;
};

export type PushNotificationSender = (
  payload: PushNotificationPayload,
) => Promise<LeaveNotificationDispatchResult | void>;

/**
 * Membentuk payload Push Notification standar Sprint 3 untuk keputusan izin praktikan (FR-14).
 */
export function buildLeaveDecisionNotificationPayload(
  input: LeaveDecisionNotificationInput,
): PushNotificationPayload {
  const type: NotificationType =
    input.decision === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED';

  const title =
    input.decision === 'approved'
      ? 'Pengajuan Izin Disetujui'
      : 'Pengajuan Izin Ditolak';

  const sessionLabel = input.sessionTitle?.trim()
    ? ` untuk ${input.sessionTitle.trim()}`
    : '';
  const statusPhrase =
    input.decision === 'approved' ? 'telah disetujui' : 'ditolak';
  const noteSuffix = input.reviewNote?.trim()
    ? ` Catatan: ${input.reviewNote.trim()}`
    : '';

  return {
    recipientUids: [input.studentId],
    type,
    title,
    body: `Pengajuan izin Anda${sessionLabel} ${statusPhrase} oleh Asisten.${noteSuffix}`,
    data: {
      sessionId: input.sessionId,
      classId: input.classId,
      leaveRequestId: input.leaveRequestId,
      route: '/kehadiran',
    },
  };
}

/**
 * Menjalankan pengirim notifikasi secara fault-tolerant (NFR-05).
 */
export async function executeLeaveNotificationDispatch(
  input: LeaveDecisionNotificationInput,
  sender: PushNotificationSender,
): Promise<LeaveNotificationDispatchResult> {
  try {
    const payload = buildLeaveDecisionNotificationPayload(input);
    const result = await sender(payload);
    if (result) {
      return result;
    }
    return { ok: true, sentCount: payload.recipientUids.length };
  } catch (error) {
    return {
      ok: false,
      sentCount: 0,
      skippedReason:
        error instanceof Error && error.message
          ? error.message
          : 'notification-dispatch-error',
    };
  }
}
