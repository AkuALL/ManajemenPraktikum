/**
 * Client-side attachment store for leave requests (Image / PDF <= 2 MB)
 * Ensures Firestore `leaveRequests` documents adhere strictly to `firestore.rules` `hasOnly` whitelist.
 */

export interface LeaveAttachmentMeta {
  name: string;
  sizeBytes: number;
  mimeType: string;
  uri: string;
}

export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const attachmentBySessionAndStudent = new Map<string, LeaveAttachmentMeta>();
const attachmentByLeaveId = new Map<string, LeaveAttachmentMeta>();

function keyFor(sessionId: string, userId?: string): string {
  return userId ? `${sessionId}_${userId}` : sessionId;
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function saveLeaveAttachment(
  params: { sessionId: string; userId?: string; leaveId?: string },
  meta: LeaveAttachmentMeta,
): void {
  attachmentBySessionAndStudent.set(keyFor(params.sessionId, params.userId), meta);
  if (params.leaveId) {
    attachmentByLeaveId.set(params.leaveId, meta);
  }
}

export function getLeaveAttachment(params: {
  sessionId: string;
  userId?: string;
  leaveId?: string;
}): LeaveAttachmentMeta | null {
  if (params.leaveId && attachmentByLeaveId.has(params.leaveId)) {
    return attachmentByLeaveId.get(params.leaveId) ?? null;
  }
  return attachmentBySessionAndStudent.get(keyFor(params.sessionId, params.userId)) ?? null;
}
