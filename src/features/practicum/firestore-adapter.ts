import {
  AddMemberInput,
  ClassMember,
  CreateClassInput,
  CreateSessionInput,
  PracticumClass,
  PracticumSession,
  StudentCandidate,
  UpdateClassInput,
  UpdateSessionInput,
} from './types';
import { PracticumPort } from './port';
import type { Firestore } from 'firebase/firestore';

function formatTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts.toDate === 'function') {
    return ts.toDate().toISOString();
  }
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  return String(ts);
}

function parseSessionDate(value: unknown): Date {
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return new Date(String(value ?? ''));
}

function mapClassDoc(id: string, data: Record<string, any>): PracticumClass {
  return {
    id,
    courseName: data.practicumName ?? '',
    className: data.className ?? '',
    lab: data.lab,
    assistantIds: Array.isArray(data.assistantIds) ? data.assistantIds : [],
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    createdBy: data.createdBy ?? '',
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
}

function mapSessionDoc(id: string, data: Record<string, any>): PracticumSession {
  return {
    id,
    classId: data.classId,
    title: data.title ?? '',
    location: data.location ?? '',
    labId: typeof data.labId === 'string' ? data.labId : undefined,
    locationName: typeof data.locationName === 'string' ? data.locationName : undefined,
    latitude:
      typeof data.latitude === 'number' && Number.isFinite(data.latitude)
        ? data.latitude
        : undefined,
    longitude:
      typeof data.longitude === 'number' && Number.isFinite(data.longitude)
        ? data.longitude
        : undefined,
    radiusMeters:
      typeof data.radiusMeters === 'number' && Number.isFinite(data.radiusMeters)
        ? data.radiusMeters
        : undefined,
    startsAt: formatTimestamp(data.startsAt),
    endsAt: formatTimestamp(data.endsAt),
    status: data.status,
    openedBy: data.openedBy,
    openedAt: data.openedAt ? formatTimestamp(data.openedAt) : undefined,
    closedBy: data.closedBy,
    closedAt: data.closedAt ? formatTimestamp(data.closedAt) : undefined,
    createdBy: data.createdBy,
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
}

function sortSessionsByStart(items: PracticumSession[]): PracticumSession[] {
  return [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export class FirestorePracticumAdapter implements PracticumPort {
  private firestoreInstance: Firestore | null = null;

  private async getDb(): Promise<Firestore> {
    if (!this.firestoreInstance) {
      const { db } = await import('@/lib/firebase');
      this.firestoreInstance = db;
    }
    return this.firestoreInstance;
  }

  // === KELAS ===

  async getClasses(assistantId?: string): Promise<PracticumClass[]> {
    const db = await this.getDb();
    const { collection, getDocs, query, where } = await import('firebase/firestore');

    const classesRef = collection(db, 'classes');
    const q = assistantId
      ? query(classesRef, where('assistantIds', 'array-contains', assistantId))
      : classesRef;

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => mapClassDoc(docSnap.id, docSnap.data()));
  }

  subscribeClasses(
    assistantId: string | undefined,
    onData: (classes: PracticumClass[], meta: { fromCache: boolean }) => void,
    onError?: (err: Error) => void,
    studentId?: string
  ): () => void {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    this.getDb()
      .then(async (db) => {
        if (isCancelled) return;
        const { collection, onSnapshot, query, where } = await import('firebase/firestore');

        if (assistantId || studentId) {
          const classesRef = collection(db, 'classes');
          const q = assistantId
            ? query(classesRef, where('assistantIds', 'array-contains', assistantId))
            : query(classesRef, where('memberUids', 'array-contains', studentId));

          unsubscribe = onSnapshot(
            q,
            { includeMetadataChanges: true },
            (snapshot) => {
              const list = snapshot.docs.map((docSnap) => mapClassDoc(docSnap.id, docSnap.data()));
              onData(list, { fromCache: snapshot.metadata.fromCache });
            },
            (err) => {
              onError?.(err);
            }
          );
        } else {
          onData([], { fromCache: false });
        }
      })
      .catch((err) => onError?.(err));

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }

  async createClass(input: CreateClassInput, assistantId: string): Promise<PracticumClass> {
    const db = await this.getDb();
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

    const assistantIds = input.assistantIds?.length
      ? Array.from(new Set([...input.assistantIds, assistantId]))
      : [assistantId];

    const payload = {
      practicumName: input.courseName,
      className: input.className,
      ...(input.lab ? { lab: input.lab } : {}),
      assistantIds,
      memberUids: [] as string[],
      createdBy: assistantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'classes'), payload);

    return {
      id: docRef.id,
      courseName: input.courseName,
      className: input.className,
      lab: input.lab,
      assistantIds,
      memberUids: [],
      createdBy: assistantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateClass(classId: string, input: UpdateClassInput): Promise<void> {
    const db = await this.getDb();
    const { doc, serverTimestamp, updateDoc } = await import('firebase/firestore');

    const updatePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };
    if (input.courseName !== undefined) updatePayload.practicumName = input.courseName;
    if (input.className !== undefined) updatePayload.className = input.className;
    if (input.lab !== undefined) updatePayload.lab = input.lab;
    if (input.assistantIds !== undefined) updatePayload.assistantIds = input.assistantIds;

    await updateDoc(doc(db, 'classes', classId), updatePayload);
  }

  async deleteClass(classId: string): Promise<void> {
    const db = await this.getDb();
    const { collection, doc, getDoc, getDocs, limit, query, where, writeBatch } =
      await import('firebase/firestore');

    const classRef = doc(db, 'classes', classId);
    const classSnap = await getDoc(classRef);
    if (!classSnap.exists()) {
      throw new Error('Kelas tidak ditemukan');
    }

    // Ambil semua sesi milik kelas ini
    const sessionsQuery = query(collection(db, 'sessions'), where('classId', '==', classId));
    const sessionsSnap = await getDocs(sessionsQuery);

    // Pastikan tidak ada sesi yang statusnya bukan scheduled (sedang berjalan atau selesai)
    const nonScheduled = sessionsSnap.docs.find((d) => d.data().status !== 'scheduled');
    if (nonScheduled) {
      throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sedang berjalan atau sudah selesai.');
    }

    // Periksa apakah terdapat data presensi pada kelas ini
    const attByClassSnap = await getDocs(
      query(collection(db, 'attendance'), where('classId', '==', classId), limit(1))
    );
    if (!attByClassSnap.empty) {
      throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sudah memiliki data presensi.');
    }

    // Periksa apakah terdapat data pengajuan izin pada kelas ini
    const leaveByClassSnap = await getDocs(
      query(collection(db, 'leaveRequests'), where('classId', '==', classId), limit(1))
    );
    if (!leaveByClassSnap.empty) {
      throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sudah memiliki data izin.');
    }

    // Periksa juga per-sessionId untuk memastikan tidak ada presensi/izin yang tertaut
    for (const sDoc of sessionsSnap.docs) {
      const attSessionSnap = await getDocs(
        query(collection(db, 'attendance'), where('sessionId', '==', sDoc.id), limit(1))
      );
      if (!attSessionSnap.empty) {
        throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sudah memiliki data presensi.');
      }

      const leaveSessionSnap = await getDocs(
        query(collection(db, 'leaveRequests'), where('sessionId', '==', sDoc.id), limit(1))
      );
      if (!leaveSessionSnap.empty) {
        throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sudah memiliki data izin.');
      }
    }

    // Ambil seluruh anggota kelas dari subkoleksi members
    const membersSnap = await getDocs(collection(db, 'classes', classId, 'members'));

    // Hapus sesi, anggota subkoleksi, dan kelas dalam batch agar tidak meninggalkan data yatim
    const batch = writeBatch(db);

    sessionsSnap.docs.forEach((sDoc) => {
      batch.delete(sDoc.ref);
    });

    membersSnap.docs.forEach((mDoc) => {
      batch.delete(mDoc.ref);
    });

    batch.delete(classRef);

    await batch.commit();
  }

  // === ANGGOTA KELAS ===

  async getRegisteredStudents(): Promise<StudentCandidate[]> {
    const db = await this.getDb();
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((d) => {
        const data = d.data();
        const nim = String(data.identifier ?? d.id).trim();
        return {
          userId: nim,
          authUid: d.id,
          displayName: data.displayName ?? '',
          identifier: nim,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'id'));
  }

  async getClassMembers(classId: string): Promise<ClassMember[]> {
    const db = await this.getDb();
    const { collection, getDocs } = await import('firebase/firestore');
    const membersRef = collection(db, 'classes', classId, 'members');
    const snapshot = await getDocs(membersRef);

    return snapshot.docs.map((d) => {
      const data = d.data();
      const nim = String(data.identifier ?? data.userId ?? d.id).trim();
      return {
        userId: nim,
        role: 'student',
        displayName: data.displayName ?? '',
        identifier: nim,
        joinedAt: formatTimestamp(data.joinedAt),
      };
    });
  }

  subscribeClassMembers(
    classId: string,
    onData: (members: ClassMember[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    this.getDb()
      .then(async (db) => {
        if (isCancelled) return;
        const { collection, onSnapshot } = await import('firebase/firestore');
        const membersRef = collection(db, 'classes', classId, 'members');

        unsubscribe = onSnapshot(
          membersRef,
          (snapshot) => {
            const list: ClassMember[] = snapshot.docs.map((d) => {
              const data = d.data();
              const nim = String(data.identifier ?? data.userId ?? d.id).trim();
              return {
                userId: nim,
                role: 'student',
                displayName: data.displayName ?? '',
                identifier: nim,
                joinedAt: formatTimestamp(data.joinedAt),
              };
            });
            onData(list);
          },
          (err) => onError?.(err)
        );
      })
      .catch((err) => onError?.(err));

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }

  async addMember(classId: string, input: AddMemberInput): Promise<ClassMember> {
    const db = await this.getDb();
    const { arrayUnion, doc, serverTimestamp, writeBatch } = await import('firebase/firestore');

    const memberNim = input.identifier.trim() || input.userId.trim();
    const memberDocRef = doc(db, 'classes', classId, 'members', memberNim);
    const classDocRef = doc(db, 'classes', classId);
    const payload = {
      userId: memberNim,
      role: 'student',
      displayName: input.displayName,
      identifier: memberNim,
      joinedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(memberDocRef, payload);
    batch.update(classDocRef, {
      memberUids: arrayUnion(memberNim),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      userId: memberNim,
      role: 'student',
      displayName: input.displayName,
      identifier: memberNim,
      joinedAt: new Date().toISOString(),
    };
  }

  async removeMember(classId: string, memberId: string): Promise<void> {
    const db = await this.getDb();
    const { arrayRemove, doc, serverTimestamp, writeBatch } = await import('firebase/firestore');

    const batch = writeBatch(db);
    batch.delete(doc(db, 'classes', classId, 'members', memberId));
    batch.update(doc(db, 'classes', classId), {
      memberUids: arrayRemove(memberId),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  }

  // === SESI PRAKTIKUM & JADWAL ===

  async getSessions(classId?: string): Promise<PracticumSession[]> {
    const db = await this.getDb();
    const { collection, getDocs, query, where } = await import('firebase/firestore');

    const sessionsRef = collection(db, 'sessions');
    const q = classId
      ? query(sessionsRef, where('classId', '==', classId))
      : sessionsRef;

    const snapshot = await getDocs(q);
    return sortSessionsByStart(
      snapshot.docs.map((docSnap) => mapSessionDoc(docSnap.id, docSnap.data())),
    );
  }

  subscribeSessions(
    classId: string | undefined,
    studentId: string | undefined,
    role: 'assistant' | 'student',
    onData: (sessions: PracticumSession[], meta: { fromCache: boolean }) => void,
    onError?: (err: Error) => void,
    knownClassIds?: string[]
  ): () => void {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    this.getDb()
      .then(async (db) => {
        if (isCancelled) return;
        const { collection, onSnapshot, query, where } = await import('firebase/firestore');
        const sessionsRef = collection(db, 'sessions');

        const subscribeForClassIds = (targetClassIds: string[]): (() => void) => {
          if (targetClassIds.length === 0) {
            onData([], { fromCache: false });
            return () => {};
          }

          const byClass = new Map<string, PracticumSession[]>();
          const fromCacheByClass = new Map<string, boolean>();
          const resolved = new Set<string>();
          const unsubs = targetClassIds.map((cId) =>
            onSnapshot(
              query(sessionsRef, where('classId', '==', cId)),
              { includeMetadataChanges: true },
              (snapshot) => {
                byClass.set(
                  cId,
                  snapshot.docs.map((docSnap) => mapSessionDoc(docSnap.id, docSnap.data())),
                );
                fromCacheByClass.set(cId, snapshot.metadata.fromCache);
                resolved.add(cId);
                if (resolved.size >= targetClassIds.length) {
                  onData(sortSessionsByStart(Array.from(byClass.values()).flat()), {
                    fromCache: Array.from(fromCacheByClass.values()).some(Boolean),
                  });
                }
              },
              (err) => onError?.(err),
            ),
          );

          return () => {
            unsubs.forEach((unsub) => unsub());
          };
        };

        if (classId) {
          unsubscribe = subscribeForClassIds([classId]);
        } else if (knownClassIds !== undefined) {
          // Reuse already-subscribed class IDs to avoid opening a duplicate classes listener.
          unsubscribe = subscribeForClassIds(Array.from(new Set(knownClassIds)).filter(Boolean));
        } else if ((role === 'student' && studentId) || role === 'assistant') {
          const classesRef = collection(db, 'classes');
          const qClasses =
            role === 'student'
              ? query(classesRef, where('memberUids', 'array-contains', studentId))
              : studentId
                ? query(classesRef, where('assistantIds', 'array-contains', studentId))
                : classesRef;
          let sessionsUnsub: (() => void) | null = null;
          let prevClassIdsKey: string | null = null;

          const origUnsub = onSnapshot(
            qClasses,
            { includeMetadataChanges: true },
            (classSnap) => {
              const classIds = classSnap.docs.map((d) => d.id);
              const nextKey = [...classIds].sort().join(',');
              if (nextKey === prevClassIdsKey) return;
              prevClassIdsKey = nextKey;

              if (sessionsUnsub) {
                sessionsUnsub();
                sessionsUnsub = null;
              }
              sessionsUnsub = subscribeForClassIds(classIds);
            },
            (err) => onError?.(err),
          );

          unsubscribe = () => {
            origUnsub();
            if (sessionsUnsub) sessionsUnsub();
          };
        } else {
          onData([], { fromCache: false });
        }
      })
      .catch((err) => onError?.(err));

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }

  async getSession(sessionId: string): Promise<PracticumSession | null> {
    const db = await this.getDb();
    const { doc, getDoc } = await import('firebase/firestore');
    const docSnap = await getDoc(doc(db, 'sessions', sessionId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      classId: data.classId,
      title: data.title ?? '',
      location: data.location ?? '',
      startsAt: formatTimestamp(data.startsAt),
      endsAt: formatTimestamp(data.endsAt),
      status: data.status,
      openedBy: data.openedBy,
      openedAt: data.openedAt ? formatTimestamp(data.openedAt) : undefined,
      closedBy: data.closedBy,
      closedAt: data.closedAt ? formatTimestamp(data.closedAt) : undefined,
      createdBy: data.createdBy,
      createdAt: formatTimestamp(data.createdAt),
      updatedAt: formatTimestamp(data.updatedAt),
    };
  }

  subscribeSession(
    sessionId: string,
    onData: (session: PracticumSession | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    this.getDb()
      .then(async (db) => {
        if (isCancelled) return;
        const { doc, onSnapshot } = await import('firebase/firestore');

        unsubscribe = onSnapshot(
          doc(db, 'sessions', sessionId),
          (docSnap) => {
            if (!docSnap.exists()) {
              onData(null);
              return;
            }
            const data = docSnap.data();
            onData({
              id: docSnap.id,
              classId: data.classId,
              title: data.title ?? '',
              location: data.location ?? '',
              startsAt: formatTimestamp(data.startsAt),
              endsAt: formatTimestamp(data.endsAt),
              status: data.status,
              openedBy: data.openedBy,
              openedAt: data.openedAt ? formatTimestamp(data.openedAt) : undefined,
              closedBy: data.closedBy,
              closedAt: data.closedAt ? formatTimestamp(data.closedAt) : undefined,
              createdBy: data.createdBy,
              createdAt: formatTimestamp(data.createdAt),
              updatedAt: formatTimestamp(data.updatedAt),
            });
          },
          (err) => onError?.(err)
        );
      })
      .catch((err) => onError?.(err));

    return () => {
      isCancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }

  async createSession(input: CreateSessionInput, assistantId: string): Promise<PracticumSession> {
    const db = await this.getDb();
    const { addDoc, collection, serverTimestamp, Timestamp } = await import('firebase/firestore');

    const startDate = new Date(input.startsAt);
    const endDate = new Date(input.endsAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Format timestamp waktu mulai atau selesai tidak valid');
    }
    if (startDate >= endDate) {
      throw new Error('Waktu selesai harus lebih lambat dari waktu mulai');
    }

    const payload = {
      classId: input.classId,
      title: input.title,
      location: input.location,
      startsAt: Timestamp.fromDate(startDate),
      endsAt: Timestamp.fromDate(endDate),
      status: 'scheduled',
      createdBy: assistantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'sessions'), payload);

    return {
      id: docRef.id,
      classId: input.classId,
      title: input.title,
      location: input.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: 'scheduled',
      createdBy: assistantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateSession(sessionId: string, input: UpdateSessionInput): Promise<void> {
    const db = await this.getDb();
    const { doc, getDoc, serverTimestamp, Timestamp, updateDoc } = await import('firebase/firestore');

    const sessionRef = doc(db, 'sessions', sessionId);
    const updatePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.location !== undefined) updatePayload.location = input.location;

    if (input.startsAt !== undefined || input.endsAt !== undefined) {
      const snap = await getDoc(sessionRef);
      if (!snap.exists()) {
        throw new Error('Sesi tidak ditemukan');
      }
      const current = snap.data();
      const startDate =
        input.startsAt !== undefined ? new Date(input.startsAt) : parseSessionDate(current.startsAt);
      const endDate =
        input.endsAt !== undefined ? new Date(input.endsAt) : parseSessionDate(current.endsAt);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('Format timestamp waktu mulai atau selesai tidak valid');
      }
      if (startDate >= endDate) {
        throw new Error('Waktu selesai harus lebih lambat dari waktu mulai');
      }

      if (input.startsAt !== undefined) updatePayload.startsAt = Timestamp.fromDate(startDate);
      if (input.endsAt !== undefined) updatePayload.endsAt = Timestamp.fromDate(endDate);
    }

    await updateDoc(sessionRef, updatePayload);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.getDb();
    const { collection, deleteDoc, doc, getDoc, getDocs, limit, query, where } =
      await import('firebase/firestore');

    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) throw new Error('Sesi tidak ditemukan');

    const data = snap.data();
    if (data.status !== 'scheduled') {
      throw new Error('Hanya sesi berstatus "scheduled" (belum dibuka) yang boleh dihapus.');
    }

    // Periksa apakah sesi sudah memiliki data presensi
    const attSnap = await getDocs(
      query(collection(db, 'attendance'), where('sessionId', '==', sessionId), limit(1))
    );
    if (!attSnap.empty) {
      throw new Error('Sesi tidak dapat dihapus karena sudah memiliki data presensi.');
    }

    // Periksa apakah sesi sudah memiliki data pengajuan izin
    const leaveSnap = await getDocs(
      query(collection(db, 'leaveRequests'), where('sessionId', '==', sessionId), limit(1))
    );
    if (!leaveSnap.empty) {
      throw new Error('Sesi tidak dapat dihapus karena sudah memiliki data pengajuan izin.');
    }

    await deleteDoc(sessionRef);
  }

  // === LIFECYCLE SESI (BUKA & TUTUP) ===

  async openSession(sessionId: string, assistantId: string): Promise<void> {
    const db = await this.getDb();
    const { doc, getDoc, serverTimestamp, updateDoc } = await import('firebase/firestore');

    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) throw new Error('Sesi tidak ditemukan');

    const data = snap.data();
    if (data.status !== 'scheduled') {
      throw new Error(`Sesi tidak dapat dibuka dari status "${data.status}".`);
    }

    await updateDoc(sessionRef, {
      status: 'open',
      openedBy: assistantId,
      openedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async closeSession(sessionId: string, assistantId: string): Promise<void> {
    const db = await this.getDb();
    const { doc, getDoc, serverTimestamp, updateDoc } = await import('firebase/firestore');

    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) throw new Error('Sesi tidak ditemukan');

    const data = snap.data();
    if (data.status !== 'open') {
      throw new Error(`Sesi tidak dapat ditutup dari status "${data.status}".`);
    }

    await updateDoc(sessionRef, {
      status: 'closed',
      closedBy: assistantId,
      closedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
