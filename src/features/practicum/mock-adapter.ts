import type {
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
import type { PracticumPort } from './port';

type Listener<T> = (data: T) => void;

let mockIdSeq = 1000;

export const SEED_PRACTICUM_COURSES = [
  { courseName: 'Sistem Operasi', className: 'Kelas A', lab: 'Lab Sistem & Jaringan' },
  { courseName: 'Pengembangan Platform Khusus', className: 'Kelas A', lab: 'Lab Mobile & IoT' },
  { courseName: 'Pembelajaran Mesin', className: 'Kelas A', lab: 'Lab Kecerdasan Buatan' },
  { courseName: 'Struktur Data', className: 'Kelas A', lab: 'Lab Pemrograman 1' },
  { courseName: 'Basis Data', className: 'Kelas A', lab: 'Lab Basis Data' },
  { courseName: 'Algoritma Pemrograman', className: 'Kelas A', lab: 'Lab Pemrograman 2' },
  { courseName: 'Dasar Sistem', className: 'Kelas A', lab: 'Lab Arsitektur Komputer' },
  { courseName: 'Dasar Pemrograman', className: 'Kelas A', lab: 'Lab Dasar Komputasi' },
] as const;

const SEED_STUDENT_ACCOUNTS: StudentCandidate[] = [
  { userId: '2402030201', displayName: 'Anintya Putri', identifier: '2402030201' },
  { userId: '2402030202', displayName: 'Dimas Saputra', identifier: '2402030202' },
];

export class MockPracticumAdapter implements PracticumPort {
  private classes: PracticumClass[] = SEED_PRACTICUM_COURSES.map((course, idx) => ({
    id: `class-${idx + 1}`,
    courseName: course.courseName,
    className: course.className,
    lab: course.lab,
    assistantIds: ['AS-202401', 'AS-202402', 'assistant-demo', 'ast-001', 'assistant-test-uid'],
    memberUids: SEED_STUDENT_ACCOUNTS.map((student) => student.identifier),
    createdBy: 'AS-202401',
    createdAt: new Date(Date.now() - (8 - idx) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - (8 - idx) * 86400000).toISOString(),
    memberCount: SEED_STUDENT_ACCOUNTS.length,
  }));

  private registeredStudents: StudentCandidate[] = [
    ...SEED_STUDENT_ACCOUNTS,
    { userId: '210480003', displayName: 'Ahmad Fauzan', identifier: '210480003' },
    { userId: '220500001', displayName: 'Budi Santoso', identifier: '220500001' },
    { userId: '230510005', displayName: 'Dewi Lestari', identifier: '230510005' },
    { userId: '250550006', displayName: 'Rafi Pratama', identifier: '250550006' },
  ];

  private members: Record<string, ClassMember[]> = Object.fromEntries(
    SEED_PRACTICUM_COURSES.map((_, idx) => [
      `class-${idx + 1}`,
      SEED_STUDENT_ACCOUNTS.map((student) => ({
        userId: student.identifier,
        role: 'student' as const,
        displayName: student.displayName,
        identifier: student.identifier,
        joinedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      })),
    ]),
  );

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

  private attendanceRecords: { id: string; sessionId: string; classId?: string; studentId: string }[] = [];
  private leaveRequests: { id: string; sessionId: string; classId?: string; studentId: string }[] = [];

  addMockAttendance(record: { id?: string; sessionId: string; classId?: string; studentId: string }): void {
    this.attendanceRecords.push({
      id: record.id ?? `att-${Date.now()}`,
      sessionId: record.sessionId,
      classId: record.classId,
      studentId: record.studentId,
    });
  }

  addMockLeaveRequest(request: { id?: string; sessionId: string; classId?: string; studentId: string }): void {
    this.leaveRequests.push({
      id: request.id ?? `leave-${Date.now()}`,
      sessionId: request.sessionId,
      classId: request.classId,
      studentId: request.studentId,
    });
  }

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
    onData: (classes: PracticumClass[], meta: { fromCache: boolean }) => void,
    onError?: (err: Error) => void,
    studentId?: string
  ): () => void {
    const handler = (classes: PracticumClass[]) => {
      if (assistantId) {
        onData(
          classes.filter(
            (c) => c.assistantIds.includes(assistantId) || c.createdBy === assistantId
          ),
          { fromCache: false },
        );
      } else if (studentId) {
        const enrolledClassIds = Object.entries(this.members)
          .filter(([, memberList]) => memberList.some((m) => m.userId === studentId))
          .map(([cId]) => cId);
        onData(classes.filter((c) => enrolledClassIds.includes(c.id)), { fromCache: false });
      } else {
        onData(classes, { fromCache: false });
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
      memberUids: [],
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
    const cls = this.classes.find((c) => c.id === classId);
    if (!cls) throw new Error('Kelas tidak ditemukan');

    const classSessions = this.sessions.filter((s) => s.classId === classId);

    // Pastikan tidak ada sesi yang statusnya bukan scheduled (misal open atau closed)
    const nonScheduled = classSessions.find((s) => s.status !== 'scheduled');
    if (nonScheduled) {
      throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sedang berjalan atau sudah selesai.');
    }

    // Pastikan tidak ada sesi yang memiliki presensi
    const hasAttendance = classSessions.some((s) =>
      this.attendanceRecords.some((a) => a.sessionId === s.id || a.classId === classId)
    );
    if (hasAttendance) {
      throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sudah memiliki data presensi.');
    }

    // Pastikan tidak ada sesi yang memiliki pengajuan izin
    const hasLeave = classSessions.some((s) =>
      this.leaveRequests.some((l) => l.sessionId === s.id || l.classId === classId)
    );
    if (hasLeave) {
      throw new Error('Kelas tidak dapat dihapus karena terdapat sesi yang sudah memiliki data izin.');
    }

    // Hapus sesi dan anggota agar tidak menjadi yatim
    this.classes = this.classes.filter((c) => c.id !== classId);
    delete this.members[classId];
    this.sessions = this.sessions.filter((s) => s.classId !== classId);
    this.notifyClasses();
    this.notifySessions();
  }

  // === ANGGOTA KELAS ===

  async getRegisteredStudents(): Promise<StudentCandidate[]> {
    return [...this.registeredStudents].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'id'),
    );
  }

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
    const memberNim = input.identifier.trim() || input.userId.trim();
    const existing = this.members[classId].find(
      (m) => m.userId === memberNim || m.identifier === memberNim,
    );
    if (existing) {
      throw new Error('Praktikan sudah terdaftar di kelas ini');
    }

    const newMember: ClassMember = {
      userId: memberNim,
      role: 'student',
      displayName: input.displayName,
      identifier: memberNim,
      joinedAt: new Date().toISOString(),
    };

    this.members[classId].push(newMember);
    if (!this.registeredStudents.some((s) => s.userId === memberNim)) {
      this.registeredStudents.push({
        userId: memberNim,
        displayName: input.displayName,
        identifier: memberNim,
      });
    }
    const cls = this.classes.find((c) => c.id === classId);
    if (cls) {
      cls.memberUids = Array.from(new Set([...(cls.memberUids ?? []), memberNim]));
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
      cls.memberUids = (cls.memberUids ?? []).filter((id) => id !== memberId);
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
    onData: (sessions: PracticumSession[], meta: { fromCache: boolean }) => void,
    _onError?: (err: Error) => void,
    knownClassIds?: string[]
  ): () => void {
    const filterSessions = () => {
      let result = [...this.sessions];
      if (classId) {
        result = result.filter((s) => s.classId === classId);
      } else if (knownClassIds !== undefined) {
        result = result.filter((s) => knownClassIds.includes(s.classId));
      } else if (role === 'student' && studentId) {
        // Praktikan hanya melihat sesi dari kelas yang diikutinya (FR-06)
        const enrolledClassIds = Object.entries(this.members)
          .filter(([, memberList]) => memberList.some((m) => m.userId === studentId))
          .map(([cId]) => cId);
        result = result.filter((s) => enrolledClassIds.includes(s.classId));
      }
      return result;
    };

    const handler = () => {
      onData(filterSessions(), { fromCache: false });
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
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new Error('Format timestamp waktu mulai atau selesai tidak valid');
    }
    if (startDate >= endDate) {
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

    if (input.startsAt !== undefined || input.endsAt !== undefined) {
      const current = this.sessions[idx];
      const startDate = new Date(input.startsAt ?? current.startsAt);
      const endDate = new Date(input.endsAt ?? current.endsAt);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error('Format timestamp waktu mulai atau selesai tidak valid');
      }
      if (startDate >= endDate) {
        throw new Error('Waktu selesai harus lebih lambat dari waktu mulai');
      }
    }

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

    const hasAttendance = this.attendanceRecords.some((a) => a.sessionId === sessionId);
    if (hasAttendance) {
      throw new Error('Sesi tidak dapat dihapus karena sudah memiliki data presensi.');
    }

    const hasLeave = this.leaveRequests.some((l) => l.sessionId === sessionId);
    if (hasLeave) {
      throw new Error('Sesi tidak dapat dihapus karena sudah memiliki data pengajuan izin.');
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
