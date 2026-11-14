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
