import type {
  AddMemberInput,
  ClassMember,
  CreateClassInput,
  CreateSessionInput,
  PracticumClass,
  PracticumSession,
  UpdateClassInput,
  UpdateSessionInput,
} from './types';
import type { PracticumPort } from './port';

type Listener<T> = (data: T) => void;

let mockIdSeq = 1000;

export class MockPracticumAdapter implements PracticumPort {
  private classes: PracticumClass[] = [
    {
      id: 'class-1',
      courseName: 'Pemrograman Perangkat Bergerak',
      className: 'Kelas A',
      lab: 'Lab Komputer 3',
      assistantIds: ['assistant-demo', 'ast-001', 'assistant-test-uid'],
      createdBy: 'assistant-demo',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      memberCount: 2,
    },
    {
      id: 'class-2',
      courseName: 'Basis Data Lanjut',
      className: 'Kelas B',
      lab: 'Lab Software 1',
      assistantIds: ['assistant-demo', 'ast-001', 'assistant-test-uid'],
      createdBy: 'assistant-demo',
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      memberCount: 1,
    },
  ];

  private members: Record<string, ClassMember[]> = {
    'class-1': [
      {
        userId: 'std-001',
        role: 'student',
        displayName: 'Budi Santoso',
        identifier: '22/500001/TK/50001',
        joinedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        userId: 'std-002',
        role: 'student',
        displayName: 'Siti Rahma',
        identifier: '22/500002/TK/50002',
        joinedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
    ],
    'class-2': [
      {
        userId: 'std-001',
        role: 'student',
        displayName: 'Budi Santoso',
        identifier: '22/500001/TK/50001',
        joinedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ],
  };

  private sessions: PracticumSession[] = [
    {
      id: 'sess-1',
      classId: 'class-1',
      className: 'Kelas A',
      courseName: 'Pemrograman Perangkat Bergerak',
      title: 'Modul 4: State Management & Offline Cache',
      location: 'Lab Komputer 3',
      startsAt: '08:00',
      endsAt: '10:30',
      date: 'Senin, 18 Nov 2026',
      status: 'scheduled',
      createdBy: 'assistant-demo',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      assistantName: 'Asisten Demo',
    },
    {
      id: 'sess-2',
      classId: 'class-1',
      className: 'Kelas A',
      courseName: 'Pemrograman Perangkat Bergerak',
      title: 'Modul 5: Firebase Integration & Realtime Sync',
      location: 'Lab Komputer 3',
      startsAt: '13:00',
      endsAt: '15:30',
      date: 'Rabu, 20 Nov 2026',
      status: 'open',
      openedBy: 'assistant-demo',
      openedAt: new Date().toISOString(),
      createdBy: 'assistant-demo',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      assistantName: 'Asisten Demo',
    },
    {
      id: 'sess-3',
      classId: 'class-2',
      className: 'Kelas B',
      courseName: 'Basis Data Lanjut',
      title: 'Modul 3: Indeks & Query Optimization',
      location: 'Lab Software 1',
      startsAt: '10:00',
      endsAt: '12:00',
      date: 'Kamis, 21 Nov 2026',
      status: 'closed',
      openedBy: 'assistant-demo',
      openedAt: new Date(Date.now() - 86400000).toISOString(),
      closedBy: 'assistant-demo',
      closedAt: new Date().toISOString(),
      createdBy: 'assistant-demo',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      assistantName: 'Asisten Demo',
    },
  ];

  private classListeners: Set<Listener<PracticumClass[]>> = new Set();
  private sessionListeners: Set<Listener<PracticumSession[]>> = new Set();
  private sessionDetailListeners: Map<string, Set<Listener<PracticumSession | null>>> = new Map();
  private memberListeners: Map<string, Set<Listener<ClassMember[]>>> = new Map();

  private notifyClasses(): void {
    const list = [...this.classes];
    this.classListeners.forEach((cb) => cb(list));
  }

  private notifySessions(): void {
    const list = [...this.sessions];
    this.sessionListeners.forEach((cb) => cb(list));
    this.sessionDetailListeners.forEach((listeners, sessionId) => {
      const found = this.sessions.find((s) => s.id === sessionId) ?? null;
      listeners.forEach((cb) => cb(found));
    });
  }

  private notifyMembers(classId: string): void {
    const list = [...(this.members[classId] || [])];
    const listeners = this.memberListeners.get(classId);
    if (listeners) {
      listeners.forEach((cb) => cb(list));
    }
  }

  // === KELAS ===

  async getClasses(assistantId?: string): Promise<PracticumClass[]> {
    if (!assistantId) return [...this.classes];
    return this.classes.filter(
      (c) => c.assistantIds.includes(assistantId) || c.createdBy === assistantId
    );
  }

  subscribeClasses(
    assistantId: string | undefined,
    onData: (classes: PracticumClass[]) => void,
    onError?: (err: Error) => void,
    studentId?: string
  ): () => void {
    const handler = (classes: PracticumClass[]) => {
      if (assistantId) {
        onData(
          classes.filter(
            (c) => c.assistantIds.includes(assistantId) || c.createdBy === assistantId
          )
        );
      } else if (studentId) {
        const enrolledClassIds = Object.entries(this.members)
          .filter(([, memberList]) => memberList.some((m) => m.userId === studentId))
          .map(([cId]) => cId);
        onData(classes.filter((c) => enrolledClassIds.includes(c.id)));
      } else {
        onData(classes);
      }
    };

    this.classListeners.add(handler);
    handler(this.classes);

    return () => {
      this.classListeners.delete(handler);
    };
  }

  async createClass(input: CreateClassInput, assistantId: string): Promise<PracticumClass> {
    const newClass: PracticumClass = {
      id: `class-${Date.now()}-${++mockIdSeq}`,
      courseName: input.courseName,
      className: input.className,
      lab: input.lab,
      assistantIds: input.assistantIds?.length
        ? Array.from(new Set([...input.assistantIds, assistantId]))
        : [assistantId],
      createdBy: assistantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 0,
    };

    this.classes.unshift(newClass);
    this.members[newClass.id] = [];
    this.notifyClasses();
    return newClass;
  }

  async updateClass(classId: string, input: UpdateClassInput): Promise<void> {
    const idx = this.classes.findIndex((c) => c.id === classId);
    if (idx === -1) throw new Error('Kelas tidak ditemukan');

    this.classes[idx] = {
      ...this.classes[idx],
      ...(input.courseName ? { courseName: input.courseName } : {}),
      ...(input.className ? { className: input.className } : {}),
      ...(input.lab !== undefined ? { lab: input.lab } : {}),
      ...(input.assistantIds ? { assistantIds: input.assistantIds } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.notifyClasses();
  }

  async deleteClass(classId: string): Promise<void> {
    this.classes = this.classes.filter((c) => c.id !== classId);
    delete this.members[classId];
    this.sessions = this.sessions.filter((s) => s.classId !== classId);
    this.notifyClasses();
    this.notifySessions();
  }

  // === ANGGOTA KELAS ===

  async getClassMembers(classId: string): Promise<ClassMember[]> {
    return [...(this.members[classId] || [])];
  }

  subscribeClassMembers(
    classId: string,
    onData: (members: ClassMember[]) => void
  ): () => void {
    if (!this.memberListeners.has(classId)) {
      this.memberListeners.set(classId, new Set());
    }
    const listeners = this.memberListeners.get(classId)!;
    listeners.add(onData);
    onData(this.members[classId] || []);

    return () => {
      listeners.delete(onData);
    };
  }

  async addMember(classId: string, input: AddMemberInput): Promise<ClassMember> {
    if (!this.members[classId]) {
      this.members[classId] = [];
    }
    const existing = this.members[classId].find((m) => m.userId === input.userId);
    if (existing) {
      throw new Error('Praktikan sudah terdaftar di kelas ini');
    }

    const newMember: ClassMember = {
      userId: input.userId,
      role: 'student',
      displayName: input.displayName,
      identifier: input.identifier,
      joinedAt: new Date().toISOString(),
    };

    this.members[classId].push(newMember);
    const cls = this.classes.find((c) => c.id === classId);
    if (cls) {
      cls.memberCount = this.members[classId].length;
      this.notifyClasses();
    }
    this.notifyMembers(classId);
    return newMember;
  }

  async removeMember(classId: string, memberId: string): Promise<void> {
    if (!this.members[classId]) return;
    this.members[classId] = this.members[classId].filter((m) => m.userId !== memberId);
    const cls = this.classes.find((c) => c.id === classId);
    if (cls) {
      cls.memberCount = this.members[classId].length;
      this.notifyClasses();
    }
    this.notifyMembers(classId);
  }

  // === SESI & JADWAL ===

  async getSessions(classId?: string): Promise<PracticumSession[]> {
    if (!classId) return [...this.sessions];
    return this.sessions.filter((s) => s.classId === classId);
  }

  subscribeSessions(
    classId: string | undefined,
    studentId: string | undefined,
    role: 'assistant' | 'student',
    onData: (sessions: PracticumSession[]) => void
  ): () => void {
    const filterSessions = () => {
      let result = [...this.sessions];
      if (classId) {
        result = result.filter((s) => s.classId === classId);
      }
      if (role === 'student' && studentId) {
        // Praktikan hanya melihat sesi dari kelas yang diikutinya (FR-06)
        const enrolledClassIds = Object.entries(this.members)
          .filter(([, memberList]) => memberList.some((m) => m.userId === studentId))
          .map(([cId]) => cId);
        result = result.filter((s) => enrolledClassIds.includes(s.classId));
      }
      return result;
    };

    const handler = () => {
      onData(filterSessions());
    };

    this.sessionListeners.add(handler);
    handler();

    return () => {
      this.sessionListeners.delete(handler);
    };
  }

  async getSession(sessionId: string): Promise<PracticumSession | null> {
    return this.sessions.find((s) => s.id === sessionId) ?? null;
  }

  subscribeSession(
    sessionId: string,
    onData: (session: PracticumSession | null) => void
  ): () => void {
    if (!this.sessionDetailListeners.has(sessionId)) {
      this.sessionDetailListeners.set(sessionId, new Set());
    }
    const listeners = this.sessionDetailListeners.get(sessionId)!;
    listeners.add(onData);
    onData(this.sessions.find((s) => s.id === sessionId) ?? null);

    return () => {
      listeners.delete(onData);
    };
  }

  async createSession(
    input: CreateSessionInput,
    assistantId: string
  ): Promise<PracticumSession> {
    const parentClass = this.classes.find((c) => c.id === input.classId);
    if (!parentClass) throw new Error('Kelas praktikum tidak ditemukan');

    const startDate = new Date(input.startsAt);
    const endDate = new Date(input.endsAt);
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
      throw new Error('Waktu selesai harus lebih lambat dari waktu mulai');
    }

    const newSession: PracticumSession = {
      id: `sess-${Date.now()}-${++mockIdSeq}`,
      classId: input.classId,
      className: parentClass.className,
      courseName: parentClass.courseName,
      title: input.title,
      location: input.location,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      date: input.date ?? 'Hari ini',
      status: 'scheduled',
      createdBy: assistantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assistantName: 'Asisten Aktif',
    };

    this.sessions.unshift(newSession);
    this.notifySessions();
    return newSession;
  }

  async updateSession(sessionId: string, input: UpdateSessionInput): Promise<void> {
    const idx = this.sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) throw new Error('Sesi tidak ditemukan');

    this.sessions[idx] = {
      ...this.sessions[idx],
      ...(input.title ? { title: input.title } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.startsAt ? { startsAt: input.startsAt } : {}),
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      ...(input.date ? { date: input.date } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.notifySessions();
  }

  async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Sesi tidak ditemukan');
    if (session.status !== 'scheduled') {
      throw new Error('Hanya sesi berstatus "scheduled" (belum dibuka) yang boleh dihapus.');
    }

    this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    this.notifySessions();
  }

  // === LIFECYCLE SESI (BUKA & TUTUP) ===

  async openSession(sessionId: string, assistantId: string): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Sesi tidak ditemukan');
    if (session.status !== 'scheduled') {
      throw new Error(`Sesi tidak dapat dibuka dari status "${session.status}". Hanya sesi "scheduled" yang dapat dibuka.`);
    }

    session.status = 'open';
    session.openedBy = assistantId;
    session.openedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.notifySessions();
  }

  async closeSession(sessionId: string, assistantId: string): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Sesi tidak ditemukan');
    if (session.status !== 'open') {
      throw new Error(`Sesi tidak dapat ditutup dari status "${session.status}". Hanya sesi "open" yang dapat ditutup.`);
    }

    session.status = 'closed';
    session.closedBy = assistantId;
    session.closedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.notifySessions();
  }
}
