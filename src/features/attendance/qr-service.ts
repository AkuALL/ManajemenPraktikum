import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase';

export const QR_ATTENDANCE_TTL_MS = 5 * 60 * 1000;
const QR_PREFIX = 'MPQR1';

export type SessionQrChallenge = {
  sessionId: string;
  classId: string;
  token: string;
  expiresAtMs: number;
};

export function buildQrPayload(challenge: Pick<SessionQrChallenge, 'sessionId' | 'token'>): string {
  return `${QR_PREFIX}|${challenge.sessionId}|${challenge.token}`;
}

export function parseQrPayload(value: string): { sessionId: string; token: string } | null {
  const [prefix, sessionId, token, ...extra] = value.trim().split('|');
  if (prefix !== QR_PREFIX || !sessionId || !token || extra.length > 0 || token.length < 12) return null;
  return { sessionId, token };
}

function generateToken(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(18);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(36).padStart(2, '0')).join('');
  }
  // Fallback only for runtimes without Web Crypto; token tetap tidak pernah readable oleh praktikan.
  return Array.from({ length: 5 }, () => Math.random().toString(36).slice(2, 10)).join('');
}

function readTimestampMs(value: unknown): number | null {
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

export async function getSessionQrChallenge(sessionId: string): Promise<SessionQrChallenge | null> {
  const snapshot = await getDoc(doc(db, 'sessionQr', sessionId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const expiresAtMs = readTimestampMs(data.expiresAt);
  if (
    typeof data.sessionId !== 'string' ||
    typeof data.classId !== 'string' ||
    typeof data.token !== 'string' ||
    expiresAtMs === null
  ) return null;
  return { sessionId: data.sessionId, classId: data.classId, token: data.token, expiresAtMs };
}

export async function createSessionQrChallenge(input: {
  sessionId: string;
  classId: string;
  assistantId: string;
}): Promise<SessionQrChallenge> {
  const challenge: SessionQrChallenge = {
    sessionId: input.sessionId,
    classId: input.classId,
    token: generateToken(),
    expiresAtMs: Date.now() + QR_ATTENDANCE_TTL_MS,
  };
  await setDoc(doc(db, 'sessionQr', input.sessionId), {
    ...challenge,
    expiresAt: Timestamp.fromMillis(challenge.expiresAtMs),
    createdBy: input.assistantId,
    createdAt: serverTimestamp(),
  });
  return challenge;
}
