import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  type DocumentReference,
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';

initializeApp();

const db = getFirestore();
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const region = 'asia-southeast2';
const maxReasonLength = 1000;

const categorySchema = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['sakit', 'keluarga', 'akademik', 'darurat', 'lainnya'],
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  },
  required: ['category', 'confidence'],
  additionalProperties: false,
};

type Classification = {
  category: 'sakit' | 'keluarga' | 'akademik' | 'darurat' | 'lainnya';
  confidence: number;
};

function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function isClassification(value: unknown): value is Classification {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { category?: unknown; confidence?: unknown };
  const categories = ['sakit', 'keluarga', 'akademik', 'darurat', 'lainnya'];

  return (
    typeof candidate.category === 'string'
    && categories.includes(candidate.category)
    && typeof candidate.confidence === 'number'
    && Number.isFinite(candidate.confidence)
    && candidate.confidence >= 0
    && candidate.confidence <= 1
  );
}

function readLeaveRequestId(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const leaveRequestId = (body as { leaveRequestId?: unknown }).leaveRequestId;

  if (
    typeof leaveRequestId !== 'string'
    || !leaveRequestId.trim()
    || leaveRequestId.includes('/')
  ) {
    return null;
  }

  return leaveRequestId;
}

export const classifyLeaveReason = onRequest(
  {
    region,
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    secrets: [geminiApiKey],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).json({ message: 'Gunakan method POST.' });
      return;
    }

    const idToken = readBearerToken(request.header('authorization'));

    if (!idToken) {
      response.status(401).json({ message: 'Token autentikasi tidak tersedia.' });
      return;
    }

    const leaveRequestId = readLeaveRequestId(request.body);

    if (!leaveRequestId) {
      response.status(400).json({ message: 'leaveRequestId tidak valid.' });
      return;
    }

    let authorizedLeaveRef: DocumentReference | null = null;

    try {
      const decodedToken = await getAuth().verifyIdToken(idToken, true);
      const [profileSnapshot, leaveSnapshot] = await Promise.all([
        db.collection('users').doc(decodedToken.uid).get(),
        db.collection('leaveRequests').doc(leaveRequestId).get(),
      ]);

      if (!profileSnapshot.exists || profileSnapshot.data()?.role !== 'student') {
        response.status(403).json({ message: 'Hanya Praktikan yang dapat meminta klasifikasi.' });
        return;
      }

      if (!leaveSnapshot.exists) {
        response.status(404).json({ message: 'Pengajuan izin tidak ditemukan.' });
        return;
      }

      const leaveRequest = leaveSnapshot.data();

      if (leaveRequest?.studentId !== decodedToken.uid) {
        response.status(403).json({ message: 'Pengajuan izin bukan milik pengguna aktif.' });
        return;
      }

      // Simpan ref hanya setelah pemilik dan dokumen pengajuan tervalidasi.
      // Catch di bawah tidak boleh membuat dokumen baru lewat Admin SDK.
      authorizedLeaveRef = leaveSnapshot.ref;

      if (leaveRequest.status !== 'pending') {
        response.status(409).json({ message: 'Pengajuan izin sudah memiliki keputusan.' });
        return;
      }

      if (
        typeof leaveRequest.reason !== 'string'
        || leaveRequest.reason.length < 5
        || leaveRequest.reason.length > maxReasonLength
      ) {
        response.status(400).json({ message: 'Alasan izin pada data tidak valid.' });
        return;
      }

      if (
        leaveRequest.aiStatus === 'success'
        && typeof leaveRequest.aiCategory === 'string'
        && typeof leaveRequest.aiConfidence === 'number'
      ) {
        response.status(200).json({
          category: leaveRequest.aiCategory,
          confidence: leaveRequest.aiConfidence,
          cached: true,
        });
        return;
      }

      await leaveSnapshot.ref.set(
        {
          aiStatus: 'pending',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });
      const interaction = await ai.interactions.create({
        model: 'gemini-3.8-flash',
        input: [
          {
            type: 'user_input',
            content: [
              {
                type: 'text',
                text: [
                  'Klasifikasikan alasan ketidakhadiran praktikum berikut.',
                  'Pilih tepat satu kategori: sakit, keluarga, akademik, darurat, atau lainnya.',
                  'Kembalikan JSON sesuai schema. Hasil ini hanya informasi pendukung, bukan keputusan izin.',
                  `Alasan: ${leaveRequest.reason}`,
                ].join('\n'),
              },
            ],
          },
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: categorySchema,
        },
      });

      const output = interaction.output_text;
      const parsed = output ? JSON.parse(output) : null;

      if (!isClassification(parsed)) {
        throw new Error('Respons Gemini tidak cocok dengan schema klasifikasi.');
      }

      await leaveSnapshot.ref.set(
        {
          aiStatus: 'success',
          aiCategory: parsed.category,
          aiConfidence: parsed.confidence,
          aiClassifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      response.status(200).json({ ...parsed, cached: false });
    } catch (error) {
      logger.error('Klasifikasi izin gagal.', {
        leaveRequestId,
        error: error instanceof Error ? error.message : 'unknown_error',
      });

      if (authorizedLeaveRef) {
        await authorizedLeaveRef.set(
          {
            aiStatus: 'failed',
            aiClassifiedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      response.status(502).json({
        message: 'Klasifikasi AI gagal. Pengajuan izin tetap tersimpan.',
      });
    }
  },
);


type PushMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
};

/** Member kelas lama dapat disimpan sebagai NIM; profil pengguna memakai UID Firebase. */
async function studentUidsForClass(classId: string): Promise<string[]> {
  const classDoc = await db.collection('classes').doc(classId).get();
  const members = classDoc.data()?.memberUids;
  if (!Array.isArray(members)) return [];
  const ids = [...new Set(members.filter((item): item is string => typeof item === 'string' && item.length > 0))];
  const users = new Set<string>();
  for (const id of ids) {
    const direct = await db.collection('users').doc(id).get();
    if (direct.exists && direct.data()?.role === 'student') users.add(direct.id);
    const matches = await db.collection('users').where('identifier', '==', id).get();
    matches.docs.filter((user) => user.data().role === 'student').forEach((user) => users.add(user.id));
  }
  return [...users];
}

async function assistantsForClass(classId: string): Promise<string[]> {
  const classDoc = await db.collection('classes').doc(classId).get();
  const ids = classDoc.data()?.assistantIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}

async function sendEventPush(eventId: string, uids: string[], message: PushMessage): Promise<void> {
  const uniqueUids = [...new Set(uids)];
  const profiles = await Promise.all(uniqueUids.map((uid) => db.collection('users').doc(uid).get()));
  const tokens = [...new Set(profiles.flatMap((profile) => {
    const value = profile.data()?.pushTokens;
    return Array.isArray(value) ? value.filter((token): token is string => typeof token === 'string' && /^(ExponentPushToken|ExpoPushToken)\[/.test(token)) : [];
  }))];
  if (!tokens.length) {
    logger.info('Notifikasi tidak dikirim: penerima belum memiliki token push.', { eventId, recipients: uniqueUids.length });
    return;
  }
  for (let index = 0; index < tokens.length; index += 100) {
    const payload = tokens.slice(index, index + 100).map((to) => ({
      to, sound: 'default', channelId: 'practicum-alerts', ...message,
    }));
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { data?: { status?: string; message?: string }[]; errors?: unknown };
    if (!response.ok || result.errors || result.data?.some((ticket) => ticket.status === 'error')) {
      logger.error('Expo menolak notifikasi.', { eventId, httpStatus: response.status, result });
    }
  }
}

export const notifySessionCreated = onDocumentCreated({ document: 'sessions/{sessionId}', region }, async (event) => {
  const session = event.data?.data();
  if (!session || typeof session.classId !== 'string') return;
  await sendEventPush(event.id, await studentUidsForClass(session.classId), {
    title: 'Sesi Praktikum Baru',
    body: `Sesi ${session.title ?? 'praktikum'} telah ditambahkan di ${session.location ?? 'laboratorium'}.`,
    data: { type: 'SCHEDULE_CHANGED', sessionId: event.params.sessionId, classId: session.classId, route: '/schedule' },
  });
});

export const notifySessionUpdated = onDocumentUpdated({ document: 'sessions/{sessionId}', region }, async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (typeof after.classId !== 'string') return;
  const opened = before.status === 'scheduled' && after.status === 'open';
  const timeChanged = (field: string) => before[field]?.toMillis?.() !== after[field]?.toMillis?.();
  const changed = after.status === 'scheduled' && (before.location !== after.location || before.labId !== after.labId || timeChanged('startsAt') || timeChanged('endsAt'));
  if (!opened && !changed) return;
  await sendEventPush(event.id, await studentUidsForClass(after.classId), {
    title: opened ? 'Sesi Praktikum Dibuka' : 'Jadwal Praktikum Diperbarui',
    body: opened ? `${after.title} sudah dibuka di ${after.location}. Silakan lakukan presensi.` : `Jadwal atau lokasi ${after.title} telah diperbarui.`,
    data: { type: opened ? 'SESSION_OPENED' : 'SCHEDULE_CHANGED', sessionId: event.params.sessionId, classId: after.classId, route: opened ? '/presensi' : '/schedule' },
  });
});

export const notifyLeaveCreated = onDocumentCreated({ document: 'leaveRequests/{leaveId}', region }, async (event) => {
  const leave = event.data?.data();
  if (!leave || typeof leave.classId !== 'string' || typeof leave.studentId !== 'string') return;
  const student = await db.collection('users').doc(leave.studentId).get();
  await sendEventPush(event.id, await assistantsForClass(leave.classId), {
    title: 'Pengajuan Izin Baru',
    body: `${student.data()?.displayName ?? 'Praktikan'} mengajukan izin praktikum.`,
    data: { type: 'LEAVE_SUBMITTED', sessionId: leave.sessionId, classId: leave.classId, leaveRequestId: event.params.leaveId, route: '/review-izin' },
  });
});

export const notifyLeaveDecision = onDocumentUpdated({ document: 'leaveRequests/{leaveId}', region }, async (event) => {
  if (!event.data) return;
  const before = event.data.before.data();
  const leave = event.data.after.data();
  if (before.status !== 'pending' || !['approved', 'rejected'].includes(leave.status) || typeof leave.studentId !== 'string') return;
  const approved = leave.status === 'approved';
  await sendEventPush(event.id, [leave.studentId], {
    title: approved ? 'Pengajuan Izin Disetujui' : 'Pengajuan Izin Ditolak',
    body: `Pengajuan izin Anda ${approved ? 'disetujui' : 'ditolak'} oleh asisten.`,
    data: { type: approved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED', sessionId: leave.sessionId, classId: leave.classId, leaveRequestId: event.params.leaveId, route: '/kehadiran' },
  });
});
