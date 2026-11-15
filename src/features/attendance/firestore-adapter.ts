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
import { buildAttendanceDocId, type AttendanceEntry } from '@/types';

import {
  AttendancePortError,
  formatServerTime,
  mapAttendanceError,
  sortAttendanceEntries,
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
  field: 'studentId' | 'sessionId',
  value: string,
  ascending: boolean,
  onData: (records: AttendanceEntry[], meta: AttendanceListenerMeta) => void,
  onError: (error: AttendancePortError) => void,
): () => void {
  const q = query(collection(db, 'attendance'), where(field, '==', value));

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
  async submitAttendance({ session, user }) {
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
    return subscribeAttendanceQuery('studentId', studentId, false, onData, onError);
  },

  subscribeSessionAttendance(sessionId, onData, onError) {
    return subscribeAttendanceQuery('sessionId', sessionId, true, onData, onError);
  },
};
