import {
  AddMemberInput,
  ClassMember,
  CreateClassInput,
  CreateSessionInput,
  PracticumClass,
  PracticumSession,
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

function mapSessionDoc(id: string, data: Record<string, any>): PracticumSession {
  return {
    id,
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
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        courseName: data.practicumName ?? '',
        className: data.className ?? '',
        lab: data.lab,
        assistantIds: data.assistantIds ?? [],
        createdBy: data.createdBy ?? '',
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: formatTimestamp(data.updatedAt),
      };
    });
  }

  subscribeClasses(
    assistantId: string | undefined,
    onData: (classes: PracticumClass[]) => void,
    onError?: (err: Error) => void,
    studentId?: string
  ): () => void {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    this.getDb()
      .then(async (db) => {
        if (isCancelled) return;
        const { collection, collectionGroup, doc, onSnapshot, query, where } = await import('firebase/firestore');

        if (assistantId) {
          const classesRef = collection(db, 'classes');
          const q = query(classesRef, where('assistantIds', 'array-contains', assistantId));

          unsubscribe = onSnapshot(
            q,
            (snapshot) => {
              const list: PracticumClass[] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                  id: docSnap.id,
                  courseName: data.practicumName ?? '',
                  className: data.className ?? '',
                  lab: data.lab,
                  assistantIds: data.assistantIds ?? [],
                  createdBy: data.createdBy ?? '',
                  createdAt: formatTimestamp(data.createdAt),
                  updatedAt: formatTimestamp(data.updatedAt),
                };
              });
              onData(list);
            },
            (err) => {
              onError?.(err);
            }
          );
        } else if (studentId) {
          // Praktikan (FR-06): temukan kelas yang diikutinya melalui subkoleksi members
          const membersGroup = collectionGroup(db, 'members');
          const qMembers = query(membersGroup, where('userId', '==', studentId));

          let classUnsubs: (() => void)[] = [];

          unsubscribe = onSnapshot(
            qMembers,
            (memberSnap) => {
              classUnsubs.forEach((unsub) => unsub());
              classUnsubs = [];

              const classIds = Array.from(
                new Set(
                  memberSnap.docs
                    .map((d) => d.ref.parent?.parent?.id)
                    .filter((id): id is string => Boolean(id))
                )
              );

              if (classIds.length === 0) {
                onData([]);
                return;
              }

              const classMap = new Map<string, PracticumClass>();
              let remaining = classIds.length;

              classIds.forEach((cId) => {
                const unsub = onSnapshot(
                  doc(db, 'classes', cId),
                  (docSnap) => {
                    if (docSnap.exists()) {
                      const data = docSnap.data();
                      classMap.set(cId, {
                        id: docSnap.id,
                        courseName: data.practicumName ?? '',
                        className: data.className ?? '',
                        lab: data.lab,
                        assistantIds: data.assistantIds ?? [],
                        createdBy: data.createdBy ?? '',
                        createdAt: formatTimestamp(data.createdAt),
                        updatedAt: formatTimestamp(data.updatedAt),
                      });
                    } else {
                      classMap.delete(cId);
                    }
                    remaining = Math.max(0, remaining - 1);
                    if (remaining === 0) {
                      onData(Array.from(classMap.values()));
                    }
                  },
                  (err) => onError?.(err)
                );
                classUnsubs.push(unsub);
              });
            },
            (err) => onError?.(err)
          );

          const origUnsub = unsubscribe;
          unsubscribe = () => {
            origUnsub();
            classUnsubs.forEach((unsub) => unsub());
          };
        } else {
          onData([]);
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
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'classes', classId));
  }

  // === ANGGOTA KELAS ===

  async getClassMembers(classId: string): Promise<ClassMember[]> {
    const db = await this.getDb();
    const { collection, getDocs } = await import('firebase/firestore');
    const membersRef = collection(db, 'classes', classId, 'members');
    const snapshot = await getDocs(membersRef);

    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        userId: data.userId ?? d.id,
        role: 'student',
        displayName: data.displayName ?? '',
        identifier: data.identifier ?? '',
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
              return {
                userId: data.userId ?? d.id,
                role: 'student',
                displayName: data.displayName ?? '',
                identifier: data.identifier ?? '',
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
    const { doc, serverTimestamp, setDoc } = await import('firebase/firestore');

    const memberDocRef = doc(db, 'classes', classId, 'members', input.userId);
    const payload = {
      userId: input.userId,
      role: 'student',
      displayName: input.displayName,
      identifier: input.identifier,
      joinedAt: serverTimestamp(),
    };

    await setDoc(memberDocRef, payload);

    return {
      userId: input.userId,
      role: 'student',
      displayName: input.displayName,
      identifier: input.identifier,
      joinedAt: new Date().toISOString(),
    };
  }

  async removeMember(classId: string, memberId: string): Promise<void> {
    const db = await this.getDb();
    const { deleteDoc, doc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'classes', classId, 'members', memberId));
  }

  // === SESI PRAKTIKUM & JADWAL ===

  async getSessions(classId?: string): Promise<PracticumSession[]> {
    const db = await this.getDb();
    const { collection, getDocs, query, where, orderBy } = await import('firebase/firestore');

    const sessionsRef = collection(db, 'sessions');
    const q = classId
      ? query(sessionsRef, where('classId', '==', classId), orderBy('startsAt', 'asc'))
      : query(sessionsRef, orderBy('startsAt', 'asc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
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
    });
  }

  subscribeSessions(
    classId: string | undefined,
    studentId: string | undefined,
    role: 'assistant' | 'student',
    onData: (sessions: PracticumSession[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false;

    this.getDb()
      .then(async (db) => {
        if (isCancelled) return;
        const { collection, collectionGroup, onSnapshot, query, where } = await import('firebase/firestore');
        const sessionsRef = collection(db, 'sessions');

        const subscribeForClassIds = (targetClassIds: string[]): (() => void) => {
          if (targetClassIds.length === 0) {
            onData([]);
            return () => {};
          }

          const byClass = new Map<string, PracticumSession[]>();
          const resolved = new Set<string>();
          const unsubs = targetClassIds.map((cId) =>
            onSnapshot(
              query(sessionsRef, where('classId', '==', cId)),
              (snapshot) => {
                byClass.set(
                  cId,
                  snapshot.docs.map((docSnap) => mapSessionDoc(docSnap.id, docSnap.data())),
                );
                resolved.add(cId);
                if (resolved.size >= targetClassIds.length) {
                  onData(sortSessionsByStart(Array.from(byClass.values()).flat()));
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
        } else if (role === 'student' && studentId) {
          // Praktikan (FR-06): cari kelas terdaftar lewat collectionGroup members, lalu subscribe per classId
          const qMembers = query(collectionGroup(db, 'members'), where('userId', '==', studentId));
          let sessionsUnsub: (() => void) | null = null;

          const origUnsub = onSnapshot(
            qMembers,
            (memberSnap) => {
              if (sessionsUnsub) {
                sessionsUnsub();
                sessionsUnsub = null;
              }
              const classIds = Array.from(
                new Set(
                  memberSnap.docs
                    .map((d) => d.ref.parent?.parent?.id)
                    .filter((id): id is string => Boolean(id)),
                ),
              );
              sessionsUnsub = subscribeForClassIds(classIds);
            },
            (err) => onError?.(err),
          );

          unsubscribe = () => {
            origUnsub();
            if (sessionsUnsub) sessionsUnsub();
          };
        } else if (role === 'assistant') {
          // Asisten: ambil kelas yang dikelola lalu subscribe sesi per classId (hindari query 'in' + index komposit)
          const classesRef = collection(db, 'classes');
          const qClasses = studentId
            ? query(classesRef, where('assistantIds', 'array-contains', studentId))
            : classesRef;
          let sessionsUnsub: (() => void) | null = null;

          const origUnsub = onSnapshot(
            qClasses,
            (classSnap) => {
              if (sessionsUnsub) {
                sessionsUnsub();
                sessionsUnsub = null;
              }
              const classIds = classSnap.docs.map((d) => d.id);
              sessionsUnsub = subscribeForClassIds(classIds);
            },
            (err) => onError?.(err),
          );

          unsubscribe = () => {
            origUnsub();
            if (sessionsUnsub) sessionsUnsub();
          };
        } else {
          onData([]);
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
    const { doc, serverTimestamp, Timestamp, updateDoc } = await import('firebase/firestore');

    const updatePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.location !== undefined) updatePayload.location = input.location;
    if (input.startsAt) updatePayload.startsAt = Timestamp.fromDate(new Date(input.startsAt));
    if (input.endsAt) updatePayload.endsAt = Timestamp.fromDate(new Date(input.endsAt));

    await updateDoc(doc(db, 'sessions', sessionId), updatePayload);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const db = await this.getDb();
    const { deleteDoc, doc, getDoc } = await import('firebase/firestore');

    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) throw new Error('Sesi tidak ditemukan');

    const data = snap.data();
    if (data.status !== 'scheduled') {
      throw new Error('Hanya sesi berstatus "scheduled" (belum dibuka) yang boleh dihapus.');
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
