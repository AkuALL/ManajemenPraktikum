import { auth } from '@/lib/firebase';

export type LeaveReasonClassification = {
  category: 'sakit' | 'keluarga' | 'akademik' | 'darurat' | 'lainnya';
  confidence: number;
  cached: boolean;
};

type ClassifierErrorPayload = {
  message?: string;
};

const classifierUrl = process.env.EXPO_PUBLIC_AI_CLASSIFIER_URL;

function readErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const message = (payload as ClassifierErrorPayload).message;
  return typeof message === 'string' ? message : null;
}

export async function classifyLeaveReason(
  leaveRequestId: string,
): Promise<LeaveReasonClassification> {
  if (!classifierUrl) {
    throw new Error('URL klasifikasi AI belum dikonfigurasi.');
  }

  if (!auth.currentUser) {
    throw new Error('Silakan login sebelum meminta klasifikasi AI.');
  }

  const idToken = await auth.currentUser.getIdToken();
  const response = await fetch(classifierUrl, {
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
      readErrorMessage(payload) ?? 'Klasifikasi AI tidak dapat diproses.',
    );
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Respons klasifikasi AI tidak valid.');
  }

  const result = payload as Partial<LeaveReasonClassification>;
  const validCategory = [
    'sakit',
    'keluarga',
    'akademik',
    'darurat',
    'lainnya',
  ].includes(result.category ?? '');

  if (
    !validCategory
    || typeof result.confidence !== 'number'
    || typeof result.cached !== 'boolean'
  ) {
    throw new Error('Respons klasifikasi AI tidak sesuai kontrak.');
  }

  return result as LeaveReasonClassification;
}
