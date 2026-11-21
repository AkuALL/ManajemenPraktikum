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

const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.8-flash'] as const;
const AI_REQUEST_TIMEOUT_MS = 15_000;

const classifierUrl = process.env.EXPO_PUBLIC_AI_CLASSIFIER_URL?.trim();
const geminiApiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();

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
    throw new Error('URL klasifikasi AI belum dikonfigurasi.');
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

// shortcut: client-side Gemini fallback when Cloud Function proxy is not yet deployed; remove once Cloud Function is deployed on Blaze plan
async function classifyDirectWithGemini(
  reason: string,
): Promise<LeaveReasonClassification> {
  if (!geminiApiKey) {
    throw new Error('API key Gemini belum dikonfigurasi.');
  }

  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'Klasifikasikan alasan ketidakhadiran praktikum berikut.',
              'Pilih tepat satu kategori: sakit, keluarga, akademik, darurat, atau lainnya.',
              'Kembalikan JSON sesuai schema. Hasil ini hanya informasi pendukung, bukan keputusan izin.',
              `Alasan: ${reason.trim()}`,
            ].join('\n'),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          category: {
            type: 'STRING',
            enum: VALID_CATEGORIES,
          },
          confidence: { type: 'NUMBER' },
        },
        required: ['category', 'confidence'],
      },
    },
  });

  let lastError = 'Klasifikasi Gemini tidak dapat diproses.';

  for (const model of GEMINI_MODELS) {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
    );

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const apiErr = (payload as { error?: { message?: string } } | null)?.error?.message;
      lastError = apiErr ?? `Gemini HTTP ${response.status}`;
      if (response.status === 404 || response.status === 503 || response.status === 429) {
        continue;
      }
      throw new Error(lastError);
    }

    const text = (
      payload as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      } | null
    )?.candidates?.[0]?.content?.parts?.[0]?.text;

    const parsed = typeof text === 'string' ? parseGeminiClassificationPayload(text) : null;
    if (!parsed) {
      throw new Error('Respons Gemini tidak sesuai kontrak klasifikasi.');
    }

    return {
      ...parsed,
      cached: false,
      persistedByServer: false,
    };
  }

  throw new Error(lastError);
}

export async function classifyLeaveReason(
  leaveRequestId: string,
  reason?: string,
): Promise<LeaveReasonClassification> {
  if (classifierUrl) {
    try {
      return await classifyViaProxy(leaveRequestId);
    } catch (proxyError) {
      if (!geminiApiKey || !reason?.trim()) {
        throw proxyError;
      }
    }
  }

  if (geminiApiKey && reason?.trim()) {
    return classifyDirectWithGemini(reason);
  }

  throw new Error('Layanan klasifikasi AI belum dikonfigurasi.');
}
