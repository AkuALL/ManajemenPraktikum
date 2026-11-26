/**
 * Attachment helpers and client-side fallback store for leave requests (Image / PDF <= 2 MB).
 */

import type { LeaveAttachment, LeaveRequest } from '@/types';

export interface LeaveAttachmentMeta {
  name: string;
  sizeBytes: number;
  mimeType: string;
  uri: string;
  url?: string;
  storagePath?: string;
  file?: Blob;
}

export const MAX_ATTACHMENT_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_INLINE_ATTACHMENT_BYTES = 650 * 1024; // ~867 KB base64, safe under Firestore 1 MiB limit

const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
};

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

export function inferAttachmentMimeType(name: string, rawMimeType?: string): string {
  const normalized = rawMimeType?.trim().toLowerCase();
  if (normalized && normalized !== 'application/octet-stream') {
    return normalized;
  }

  const ext = name.split('.').pop()?.trim().toLowerCase();
  if (ext && Object.prototype.hasOwnProperty.call(EXTENSION_MIME_MAP, ext)) {
    return EXTENSION_MIME_MAP[ext];
  }
  return normalized || 'application/octet-stream';
}

export function isAllowedAttachmentMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  return normalized.startsWith('image/') || normalized === 'application/pdf';
}

export function sanitizeAttachmentFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[/\\?#[\]]+/g, '_')
    .replace(/\s+/g, '_');
  return cleaned.slice(0, 120) || 'lampiran';
}

export function parseLeaveAttachment(value: unknown): LeaveAttachment | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.name !== 'string'
    || !candidate.name.trim()
    || typeof candidate.sizeBytes !== 'number'
    || !Number.isFinite(candidate.sizeBytes)
    || candidate.sizeBytes < 0
    || candidate.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES
    || typeof candidate.mimeType !== 'string'
    || !isAllowedAttachmentMimeType(candidate.mimeType)
    || typeof candidate.url !== 'string'
    || !(
      candidate.url.startsWith('https://')
      || candidate.url.startsWith('data:image/')
      || candidate.url.startsWith('data:application/pdf;base64,')
    )
  ) {
    return undefined;
  }

  return {
    name: candidate.name.trim(),
    sizeBytes: candidate.sizeBytes,
    mimeType: candidate.mimeType.trim(),
    url: candidate.url,
    ...(typeof candidate.storagePath === 'string' && candidate.storagePath.trim()
      ? { storagePath: candidate.storagePath.trim() }
      : {}),
  };
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

export function resolveLeaveAttachment(
  request: Pick<LeaveRequest, 'id' | 'sessionId' | 'studentId' | 'attachment'>,
): LeaveAttachmentMeta | null {
  if (request.attachment) {
    return {
      name: request.attachment.name,
      sizeBytes: request.attachment.sizeBytes,
      mimeType: request.attachment.mimeType,
      uri: request.attachment.url,
      url: request.attachment.url,
      storagePath: request.attachment.storagePath,
    };
  }
  return getLeaveAttachment({
    sessionId: request.sessionId,
    userId: request.studentId,
    leaveId: request.id,
  });
}
