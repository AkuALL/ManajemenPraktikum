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
  updateDoc,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import {
  buildLeaveRequestDocId,
  type LeaveRequest,
} from '@/types';

import {
  LeavePortError,
  mapLeaveError,
  sortLeaveRequests,
  validateLeaveReason,
  type CreateLeaveInput,
  type LeaveListenerMeta,
  type LeavePort,
} from './port';
import { parseLeaveAttachment } from './attachment-store';
import { parseLeaveSentiment } from './sentiment';

function timestampMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (
    typeof value === 'object'
    && value !== null
    && 'toMillis' in value
    && typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function isLeaveStatus(value: unknown): value is LeaveRequest['status'] {
  return value === 'pending' || value === 'approved' || value === 'rejected';
}

function isAiStatus(value: unknown): value is LeaveRequest['aiStatus'] {
  return value === 'pending' || value === 'success' || value === 'failed';
}

function parseLeaveRequest(
  id: string,
  data: DocumentData,
  meta?: { fromCache: boolean; hasPendingWrites: boolean },
): LeaveRequest | null {
  if (
    typeof data.sessionId !== 'string'
    || typeof data.classId !== 'string'
    || typeof data.studentId !== 'string'
    || typeof data.reason !== 'string'
    || !isLeaveStatus(data.status)
    || !isAiStatus(data.aiStatus)
  ) {
    return null;
  }

  return {
    id,
    sessionId: data.sessionId,
    classId: data.classId,
    studentId: data.studentId,
    reason: data.reason,
    status: data.status,
    aiStatus: data.aiStatus,
    aiCategory: typeof data.aiCategory === 'string' ? data.aiCategory : undefined,
    aiConfidence: typeof data.aiConfidence === 'number' ? data.aiConfidence : undefined,
    aiClassifiedAtMs: timestampMs(data.aiClassifiedAt),
    sentimentAnalysis: parseLeaveSentiment(data.sentimentAnalysis),
    attachment: parseLeaveAttachment(data.attachment),
    reviewedBy: typeof data.reviewedBy === 'string' ? data.reviewedBy : undefined,
    reviewedAtMs: timestampMs(data.reviewedAt),
    reviewNote: typeof data.reviewNote === 'string' ? data.reviewNote : undefined,
    createdAtMs: timestampMs(data.createdAt),
    updatedAtMs: timestampMs(data.updatedAt),
    fromCache: meta?.fromCache,
    hasPendingWrites: meta?.hasPendingWrites,
  };
}

function createSnapshotHandler(
  onData: (requests: LeaveRequest[], meta: LeaveListenerMeta) => void,
) {
  return (snapshot: QuerySnapshot<DocumentData>) => {
    const requests = snapshot.docs
      .map((item) => parseLeaveRequest(item.id, item.data(), item.metadata))
      .filter((item: LeaveRequest | null): item is LeaveRequest => item !== null);

    onData(sortLeaveRequests(requests), { fromCache: snapshot.metadata.fromCache });
  };
}

// Use a filtered list query instead of getDoc(id) because Firestore rules reject get on non-existent docs when checking resource.data.studentId.
async function findExistingLeaveRequest(
  sessionId: string,
  studentId: string,
): Promise<LeaveRequest | null> {
  const q = query(
    collection(db, 'leaveRequests'),
    where('studentId', '==', studentId),
    where('sessionId', '==', sessionId),
    limit(1),
  );
  const snapshot = await getDocs(q);
  const first = snapshot.docs[0];
  return first ? parseLeaveRequest(first.id, first.data(), first.metadata) : null;
}

export const firestoreLeaveAdapter: LeavePort = {
  async createLeaveRequest({ session, user, reason, sentimentAnalysis, attachment }: CreateLeaveInput) {
    const validationError = validateLeaveReason(reason);
    if (validationError) throw new LeavePortError('invalid-input', validationError);
    if (user.role !== 'student') {
      throw new LeavePortError('forbidden', 'Hanya Praktikan yang dapat mengajukan izin.');
    }

    const id = buildLeaveRequestDocId(session.id, user.uid);
    const reference = doc(db, 'leaveRequests', id);

    try {
      const existing = await findExistingLeaveRequest(session.id, user.uid);
      if (existing) {
        throw new LeavePortError('duplicate', 'Izin untuk sesi ini sudah pernah diajukan.');
      }

      await setDoc(reference, {
        sessionId: session.id,
        classId: session.classId,
        studentId: user.uid,
        reason: reason.trim(),
        status: 'pending',
        aiStatus: 'pending',
        ...(sentimentAnalysis ? { sentimentAnalysis } : {}),
        ...(attachment ? { attachment } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return (await findExistingLeaveRequest(session.id, user.uid)) ?? {
        id,
        sessionId: session.id,
        classId: session.classId,
        studentId: user.uid,
        reason: reason.trim(),
        status: 'pending',
        aiStatus: 'pending',
        aiClassifiedAtMs: null,
        sentimentAnalysis,
        attachment,
        reviewedAtMs: null,
        createdAtMs: null,
        updatedAtMs: null,
        hasPendingWrites: true,
      };
    } catch (error) {
      const mapped = mapLeaveError(error);
      if (mapped.code === 'forbidden') {
        const existing = await findExistingLeaveRequest(session.id, user.uid).catch(() => null);
        if (existing) {
          throw new LeavePortError('duplicate', 'Izin untuk sesi ini sudah pernah diajukan.');
        }
      }
      throw mapped;
    }
  },

  async reviewLeaveRequest(leaveRequestId, reviewerId, decision, reviewNote) {
    try {
      await updateDoc(doc(db, 'leaveRequests', leaveRequestId), {
        status: decision,
        reviewedBy: reviewerId,
        reviewedAt: serverTimestamp(),
        ...(reviewNote?.trim() ? { reviewNote: reviewNote.trim() } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      throw mapLeaveError(error);
    }
  },

  subscribeStudentLeaveRequests(studentId, onData, onError) {
    const q = query(collection(db, 'leaveRequests'), where('studentId', '==', studentId));
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      createSnapshotHandler(onData),
      (error) => onError(mapLeaveError(error)),
    );
  },

  subscribeAssistantLeaveRequests(classIds, onData, onError) {
    const uniqueClassIds = Array.from(new Set(classIds)).filter(Boolean);
    if (uniqueClassIds.length === 0) {
      onData([], { fromCache: false });
      return () => undefined;
    }

    const chunks = Array.from({ length: Math.ceil(uniqueClassIds.length / 30) }, (_, index) =>
      uniqueClassIds.slice(index * 30, (index + 1) * 30),
    );
    const snapshots = new Map<number, { requests: LeaveRequest[]; fromCache: boolean }>();

    const publish = () => {
      if (snapshots.size < chunks.length) return;
      const requests = Array.from(snapshots.values()).flatMap((snapshot) => snapshot.requests);
      onData(sortLeaveRequests(requests), {
        fromCache: Array.from(snapshots.values()).some((snapshot) => snapshot.fromCache),
      });
    };

    return chunks
      .map((classIdChunk, index) =>
        onSnapshot(
          query(collection(db, 'leaveRequests'), where('classId', 'in', classIdChunk)),
          { includeMetadataChanges: true },
          (snapshot) => {
            const requests = snapshot.docs
              .map((item) => parseLeaveRequest(item.id, item.data(), item.metadata))
              .filter((item): item is LeaveRequest => item !== null);
            snapshots.set(index, { requests, fromCache: snapshot.metadata.fromCache });
            publish();
          },
          (error) => onError(mapLeaveError(error)),
        ),
      )
      .reduce(
        (unsubscribeAll, unsubscribe) => () => {
          unsubscribeAll();
          unsubscribe();
        },
        () => undefined,
      );
  },
};
