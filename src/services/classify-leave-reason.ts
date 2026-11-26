export type LeaveReasonCategory =
  | 'sakit'
  | 'keluarga'
  | 'akademik'
  | 'darurat'
  | 'lainnya';

export type LeaveReasonClassification = {
  category: LeaveReasonCategory;
  confidence: number;
  cached: boolean;
  persistedByServer?: boolean;
};

type ClassifierErrorPayload = {
  message?: string;
};

const VALID_CATEGORIES: readonly LeaveReasonCategory[] = [
  'sakit',
  'keluarga',
  'akademik',
  'darurat',
  'lainnya',
];

const AI_REQUEST_TIMEOUT_MS = 15_000;

const classifierUrl =
  process.env.EXPO_PUBLIC_AI_CLASSIFIER_URL?.trim() ||
  process.env.EXPO_PUBLIC_AI_API_URL?.trim();

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = AI_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Klasifikasi AI melebihi batas waktu (timeout).');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function readErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const message = (payload as ClassifierErrorPayload).message;
  return typeof message === 'string' ? message : null;
}

export function parseGeminiClassificationPayload(
  rawText: string,
): { category: LeaveReasonCategory; confidence: number } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const candidate = parsed as { category?: unknown; confidence?: unknown };
  if (
    typeof candidate.category !== 'string'
    || !VALID_CATEGORIES.includes(candidate.category as LeaveReasonCategory)
    || typeof candidate.confidence !== 'number'
    || !Number.isFinite(candidate.confidence)
  ) {
    return null;
  }

  const confidence = Math.min(1, Math.max(0, candidate.confidence));
  return {
    category: candidate.category as LeaveReasonCategory,
    confidence,
  };
}

async function classifyViaProxy(
  leaveRequestId: string,
): Promise<LeaveReasonClassification> {
  if (!classifierUrl) {
    throw new Error('URL Cloud Function klasifikasi AI (EXPO_PUBLIC_AI_API_URL) belum dikonfigurasi.');
  }

  const { auth } = await import('@/lib/firebase');
  if (!auth.currentUser) {
    throw new Error('Silakan login sebelum meminta klasifikasi AI.');
  }

  const idToken = await auth.currentUser.getIdToken();
  const response = await fetchWithTimeout(classifierUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ leaveRequestId }),
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      readErrorMessage(payload) ?? `Klasifikasi AI tidak dapat diproses (HTTP ${response.status}).`,
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Respons klasifikasi AI tidak valid.');
  }

  const result = payload as Partial<LeaveReasonClassification>;
  if (
    typeof result.category !== 'string'
    || !VALID_CATEGORIES.includes(result.category as LeaveReasonCategory)
    || typeof result.confidence !== 'number'
    || !Number.isFinite(result.confidence)
    || typeof result.cached !== 'boolean'
  ) {
    throw new Error('Respons klasifikasi AI tidak sesuai kontrak.');
  }

  return {
    category: result.category as LeaveReasonCategory,
    confidence: Math.min(1, Math.max(0, result.confidence)),
    cached: result.cached,
    persistedByServer: true,
  };
}

export async function classifyLeaveReason(
  leaveRequestId: string,
): Promise<LeaveReasonClassification> {
  return classifyViaProxy(leaveRequestId);
}
