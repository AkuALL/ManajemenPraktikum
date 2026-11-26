import type {
  AiStatus,
  AuthUser,
  LeaveRequest,
  LeaveSentimentAnalysis,
  LeaveStatus,
  SessionSummary,
} from '@/types';

export type LeaveErrorCode =
  | 'duplicate'
  | 'forbidden'
  | 'invalid-input'
  | 'network'
  | 'unknown';

export class LeavePortError extends Error {
  readonly code: LeaveErrorCode;

  constructor(code: LeaveErrorCode, message: string) {
    super(message);
    this.name = 'LeavePortError';
    this.code = code;
  }
}

export type LeaveListenerMeta = { fromCache: boolean };

export type CreateLeaveInput = {
  session: SessionSummary;
  user: AuthUser;
  reason: string;
  sentimentAnalysis?: LeaveSentimentAnalysis;
};

export interface LeavePort {
  createLeaveRequest(input: CreateLeaveInput): Promise<LeaveRequest>;
  saveSentimentAnalysis(
    leaveRequestId: string,
    analysis: LeaveSentimentAnalysis,
  ): Promise<void>;
  reviewLeaveRequest(
    leaveRequestId: string,
    reviewerId: string,
    decision: Extract<LeaveStatus, 'approved' | 'rejected'>,
    reviewNote?: string,
  ): Promise<void>;
  subscribeStudentLeaveRequests(
    studentId: string,
    onData: (requests: LeaveRequest[], meta: LeaveListenerMeta) => void,
    onError: (error: LeavePortError) => void,
  ): () => void;
  subscribeAssistantLeaveRequests(
    classIds: string[],
    onData: (requests: LeaveRequest[], meta: LeaveListenerMeta) => void,
    onError: (error: LeavePortError) => void,
  ): () => void;
}

export function validateLeaveReason(reason: string): string | null {
  const normalized = reason.trim();
  if (normalized.length < 5) return 'Alasan izin minimal 5 karakter.';
  if (normalized.length > 1000) return 'Alasan izin maksimal 1000 karakter.';
  return null;
}

export function isLeaveEligibleStatus(status: SessionSummary['status']): boolean {
  return status === 'scheduled' || status === 'open';
}

export function sortLeaveRequests(requests: LeaveRequest[]): LeaveRequest[] {
  return [...requests].sort(
    (left, right) => (right.createdAtMs ?? 0) - (left.createdAtMs ?? 0),
  );
}

export function mapLeaveError(error: unknown): LeavePortError {
  if (error instanceof LeavePortError) return error;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'permission-denied':
      return new LeavePortError(
        'forbidden',
        'Aksi izin ditolak. Pastikan Anda memiliki akses ke sesi ini.',
      );
    case 'already-exists':
      return new LeavePortError('duplicate', 'Izin untuk sesi ini sudah pernah diajukan.');
    case 'unavailable':
    case 'deadline-exceeded':
      return new LeavePortError(
        'network',
        'Koneksi ke server terputus. Periksa jaringan lalu coba lagi.',
      );
    default:
      return new LeavePortError(
        'unknown',
        error instanceof Error && error.message
          ? error.message
          : 'Gagal memproses pengajuan izin.',
      );
  }
}

export function aiStatusLabel(status: AiStatus): string {
  switch (status) {
    case 'pending':
      return 'Menunggu klasifikasi AI';
    case 'success':
      return 'Klasifikasi AI tersedia';
    case 'failed':
      return 'Klasifikasi AI gagal';
  }
}
