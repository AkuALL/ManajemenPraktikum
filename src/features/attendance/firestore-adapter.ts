import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentData,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { buildAttendanceDocId, type AttendanceEntry, type AuthUser } from '@/types';
import type { PracticumSession } from '@/features/practicum';

import {
  AttendancePortError,
  formatServerTime,
  mapAttendanceError,
  sortAttendanceEntries,
  type SubmitAttendanceResult,
  validateAttendanceLocationAudit,
  type AttendanceListenerMeta,
  type AttendancePort,
} from './port';

function readTimestampMs(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function parseAttendanceDoc(
  id: string,
  data: DocumentData,
  meta?: { fromCache: boolean; hasPendingWrites: boolean },
): AttendanceEntry | null {
  if (
    typeof data.sessionId !== 'string' ||
    typeof data.classId !== 'string' ||
    typeof data.studentId !== 'string'
  ) {
    return null;
  }

  const attendedAtMs = readTimestampMs(data.attendedAt);

  return {
    id,
    sessionId: data.sessionId,
    classId: data.classId,
    studentId: data.studentId,
    studentName: typeof data.studentName === 'string' ? data.studentName : '-',
    studentIdentifier:
      typeof data.studentIdentifier === 'string' ? data.studentIdentifier : '-',
    attendedAtMs,
    attendedAt: formatServerTime(attendedAtMs, 'datetime'),
    latitude: typeof data.latitude === 'number' ? data.latitude : undefined,
    longitude: typeof data.longitude === 'number' ? data.longitude : undefined,
    accuracy: typeof data.accuracy === 'number' ? data.accuracy : undefined,
    distanceMeters:
      typeof data.distanceMeters === 'number' ? data.distanceMeters : undefined,
    isWithinRadius:
      typeof data.isWithinRadius === 'boolean' ? data.isWithinRadius : undefined,
    attendanceMethod:
      data.attendanceMethod === 'assistant_override' ? 'assistant_override' :
        data.attendanceMethod === 'qr' ? 'qr' : undefined,
    recordedBy: typeof data.recordedBy === 'string' ? data.recordedBy : undefined,
    assistanceReason: typeof data.assistanceReason === 'string' ? data.assistanceReason : undefined,
    fromCache: meta?.fromCache,
    hasPendingWrites: meta?.hasPendingWrites,
  };
}

async function findExistingAttendance(
  sessionId: string,
  studentId: string,
): Promise<AttendanceEntry | undefined> {
  const q = query(
    collection(db, 'attendance'),
    where('studentId', '==', studentId),
    where('sessionId', '==', sessionId),
    limit(1),
  );
  const snapshot = await getDocs(q);
  const first = snapshot.docs[0];
  if (!first) return undefined;
  return parseAttendanceDoc(first.id, first.data()) ?? undefined;
}

function subscribeAttendanceQuery(
  constraints: ReturnType<typeof where>[],
  ascending: boolean,
  onData: (records: AttendanceEntry[], meta: AttendanceListenerMeta) => void,
  onError: (error: AttendancePortError) => void,
): () => void {
  const q = query(collection(db, 'attendance'), ...constraints);

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const entries: AttendanceEntry[] = [];
      snapshot.docs.forEach((docSnap) => {
        const parsed = parseAttendanceDoc(docSnap.id, docSnap.data(), {
          fromCache: docSnap.metadata.fromCache,
          hasPendingWrites: docSnap.metadata.hasPendingWrites,
        });
        if (parsed) entries.push(parsed);
      });

      onData(sortAttendanceEntries(entries, ascending), {
        fromCache: snapshot.metadata.fromCache,
      });
    },
    (error) => {
      onError(
        error instanceof AttendancePortError ? error : mapAttendanceError(error),
      );
    },
  );
}

export const firestoreAttendanceAdapter: AttendancePort = {
  async submitAttendance({ session, user, location, qrToken }) {
    if (user.role !== 'student') {
      return {
        ok: false,
        reason: 'role',
        message: 'Hanya Praktikan yang dapat mencatat presensi.',
      };
    }

    if (session.status !== 'open') {
      return {
        ok: false,
        reason: 'status',
        message:
          session.status === 'closed'
            ? 'Sesi ini sudah selesai. Presensi baru tidak dapat diterima.'
            : 'Sesi belum dibuka oleh Asisten.',
      };
    }

    const locationCheck = validateAttendanceLocationAudit(location);
    if (!locationCheck.ok) {
      return {
        ok: false,
        reason: locationCheck.reason,
        message: locationCheck.message,
      };
    }
    const validLocation = locationCheck.value;

    if (typeof qrToken !== 'string' || qrToken.trim().length < 12) {
      return {
        ok: false,
        reason: 'qr-required',
        message: 'Pindai QR presensi aktif dari Asisten terlebih dahulu.',
      };
    }

    const docId = buildAttendanceDocId(session.id, user.uid);

    try {
      const existing = await findExistingAttendance(session.id, user.uid);
      if (existing) {
        return {
          ok: false,
          reason: 'duplicate',
          record: existing,
          message: 'Kehadiran Anda pada sesi ini sudah tercatat.',
        };
      }

      await setDoc(doc(db, 'attendance', docId), {
        sessionId: session.id,
        classId: session.classId,
        studentId: user.uid,
        studentName: user.displayName,
        studentIdentifier: user.identifier,
        attendedAt: serverTimestamp(),
        latitude: validLocation.latitude,
        longitude: validLocation.longitude,
        accuracy: validLocation.accuracy,
        distanceMeters: validLocation.distanceMeters,
        isWithinRadius: true,
        attendanceMethod: 'qr',
        qrToken: qrToken.trim(),
      });

      const created = await findExistingAttendance(session.id, user.uid);
      return {
        ok: true,
        record: created ?? {
          id: docId,
          sessionId: session.id,
          classId: session.classId,
          studentId: user.uid,
          studentName: user.displayName,
          studentIdentifier: user.identifier,
          attendedAtMs: null,
          attendedAt: formatServerTime(null, 'datetime'),
          latitude: validLocation.latitude,
          longitude: validLocation.longitude,
          accuracy: validLocation.accuracy,
          distanceMeters: validLocation.distanceMeters,
          isWithinRadius: true,
          hasPendingWrites: true,
        },
      };
    } catch (error) {
      const mapped = mapAttendanceError(error);

      // Rules reject overwrite on existing {sessionId}_{studentId} with permission-denied.
      if (mapped.code === 'forbidden') {
        const existing = await findExistingAttendance(session.id, user.uid).catch(() => undefined);
        if (existing) {
          return {
            ok: false,
            reason: 'duplicate',
            record: existing,
            message: 'Kehadiran Anda pada sesi ini sudah tercatat.',
          };
        }

      }

      return {
        ok: false,
        reason:
          mapped.code === 'duplicate' ||
          mapped.code === 'forbidden' ||
          mapped.code === 'network'
            ? mapped.code
            : 'unknown',
        message: mapped.message,
      };
    }
  },

  subscribeStudentAttendance(studentId, onData, onError) {
    return subscribeAttendanceQuery(
      [where('studentId', '==', studentId)],
      false,
      onData,
      onError,
    );
  },

  subscribeSessionAttendance(sessionId, onData, onError, options) {
    const constraints = [where('sessionId', '==', sessionId)];
    if (options?.classId) {
      constraints.push(where('classId', '==', options.classId));
    }
    return subscribeAttendanceQuery(constraints, true, onData, onError);
  },
};

/** Catatan audit untuk praktikan yang benar-benar mengalami kendala presensi mandiri. */
export async function recordAssistantAttendance(input: {
  session: PracticumSession;
  assistant: AuthUser;
  student: { uid: string; displayName: string; identifier: string };
  reason: string;
}): Promise<SubmitAttendanceResult> {
  const { session, assistant, student } = input;
  const reason = input.reason.trim();
  if (assistant.role !== 'assistant') return { ok: false, reason: 'role', message: 'Hanya Asisten yang dapat melakukan presensi bantuan.' };
  if (session.status !== 'open') return { ok: false, reason: 'status', message: 'Presensi bantuan hanya dapat dilakukan saat sesi dibuka.' };
  if (typeof session.latitude !== 'number' || typeof session.longitude !== 'number') return { ok: false, reason: 'unknown', message: 'Lokasi sesi belum lengkap.' };
  if (reason.length < 5) return { ok: false, reason: 'unknown', message: 'Tuliskan alasan kendala minimal 5 karakter.' };

  const id = buildAttendanceDocId(session.id, student.uid);
  try {
    const existing = await findExistingAttendance(session.id, student.uid);
    if (existing) return { ok: false, reason: 'duplicate', record: existing, message: 'Presensi praktikan ini sudah tercatat.' };
    await setDoc(doc(db, 'attendance', id), {
      sessionId: session.id, classId: session.classId, studentId: student.uid,
      studentName: student.displayName, studentIdentifier: student.identifier,
      attendedAt: serverTimestamp(), latitude: session.latitude, longitude: session.longitude,
      accuracy: 0, distanceMeters: 0, isWithinRadius: false,
      attendanceMethod: 'assistant_override', recordedBy: assistant.uid, assistanceReason: reason,
    });
    return { ok: true, record: {
      id, sessionId: session.id, classId: session.classId, studentId: student.uid,
      studentName: student.displayName, studentIdentifier: student.identifier,
      attendedAtMs: null, attendedAt: formatServerTime(null, 'datetime'),
      latitude: session.latitude, longitude: session.longitude, accuracy: 0, distanceMeters: 0,
      isWithinRadius: false, attendanceMethod: 'assistant_override', recordedBy: assistant.uid,
      assistanceReason: reason, hasPendingWrites: true,
    } };
  } catch (error) {
    const mapped = mapAttendanceError(error);
    return { ok: false, reason: mapped.code === 'forbidden' || mapped.code === 'network' ? mapped.code : 'unknown', message: mapped.message };
  }
}
