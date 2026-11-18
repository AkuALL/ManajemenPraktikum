import assert from 'node:assert/strict';
import test from 'node:test';

import { MockPracticumAdapter, SEED_PRACTICUM_COURSES } from '../mock-adapter.ts';
import { formatSessionDate, formatSessionTime } from '../port.ts';

test('GA-01 & GA-02: Asisten can create class, add members, and create session', async () => {
  const adapter = new MockPracticumAdapter();

  const newClass = await adapter.createClass(
    {
      courseName: 'Pemrograman Perangkat Bergerak',
      className: 'IF-3A',
      lab: 'Lab Software 1',
    },
    'asisten-1'
  );

  assert.equal(newClass.courseName, 'Pemrograman Perangkat Bergerak');
  assert.equal(newClass.className, 'IF-3A');
  assert.ok(newClass.assistantIds.includes('asisten-1'));

  const member = await adapter.addMember(newClass.id, {
    userId: '23.11.0001',
    displayName: 'Galang Bintang',
    identifier: '23.11.0001',
  });

  assert.equal(member.userId, '23.11.0001');
  assert.equal(member.role, 'student');

  const members = await adapter.getClassMembers(newClass.id);
  assert.equal(members.length, 1);
  assert.equal(members[0].userId, '23.11.0001');

  const session = await adapter.createSession(
    {
      classId: newClass.id,
      title: 'Pertemuan 1 - Pengenalan React Native',
      location: 'Lab 1',
      startsAt: '2026-11-20T08:00:00.000Z',
      endsAt: '2026-11-20T10:00:00.000Z',
    },
    'asisten-1'
  );

  assert.equal(session.title, 'Pertemuan 1 - Pengenalan React Native');
  assert.equal(session.status, 'scheduled');
  assert.equal(session.classId, newClass.id);
});

test('GA-03 & FR-06: Praktikan only sees sessions from classes they are enrolled in', async () => {
  const adapter = new MockPracticumAdapter();

  // Buat dua kelas berbeda
  const classA = await adapter.createClass(
    { courseName: 'Praktikum Basis Data', className: 'BD-A' },
    'asisten-1'
  );
  const classB = await adapter.createClass(
    { courseName: 'Praktikum Jaringan', className: 'JK-B' },
    'asisten-2'
  );

  // Daftarkan Galang ke Kelas A saja, bukan Kelas B
  await adapter.addMember(classA.id, {
    userId: '23.11.0001',
    displayName: 'Galang',
    identifier: '23.11.0001',
  });

  // Buat sesi untuk masing-masing kelas
  await adapter.createSession(
    {
      classId: classA.id,
      title: 'Sesi Query SQL Kelas A',
      location: 'Lab 1',
      startsAt: '2026-11-20T08:00:00.000Z',
      endsAt: '2026-11-20T10:00:00.000Z',
    },
    'asisten-1'
  );

  await adapter.createSession(
    {
      classId: classB.id,
      title: 'Sesi Routing Jaringan Kelas B',
      location: 'Lab 2',
      startsAt: '2026-11-21T08:00:00.000Z',
      endsAt: '2026-11-21T10:00:00.000Z',
    },
    'asisten-2'
  );

  // Verifikasi subscribeSessions untuk Praktikan Galang
  let studentSessions = [];
  let studentSessionsMeta = null;
  const unsubSessions = adapter.subscribeSessions(
    undefined,
    '23.11.0001',
    'student',
    (data, meta) => {
      studentSessions = data;
      studentSessionsMeta = meta;
    }
  );

  assert.equal(studentSessions.length, 1);
  assert.equal(studentSessions[0].title, 'Sesi Query SQL Kelas A');
  assert.equal(studentSessions[0].classId, classA.id);
  assert.equal(studentSessionsMeta?.fromCache, false);

  // Verifikasi subscribeClasses untuk Praktikan Galang
  let studentClasses = [];
  let studentClassesMeta = null;
  const unsubClasses = adapter.subscribeClasses(
    undefined,
    (data, meta) => {
      studentClasses = data;
      studentClassesMeta = meta;
    },
    undefined,
    '23.11.0001'
  );

  assert.equal(studentClasses.length, 1);
  assert.equal(studentClasses[0].id, classA.id);
  assert.equal(studentClassesMeta?.fromCache, false);

  unsubSessions();
  unsubClasses();
});

test('GA-04 & FR-07: Session lifecycle transition scheduled -> open -> closed and delete restrictions', async () => {
  const adapter = new MockPracticumAdapter();

  const cls = await adapter.createClass(
    { courseName: 'Sistem Operasi', className: 'SO-1' },
    'asisten-1'
  );

  const session = await adapter.createSession(
    {
      classId: cls.id,
      title: 'Sesi Linux Shell',
      location: 'Lab 3',
      startsAt: '2026-11-22T08:00:00.000Z',
      endsAt: '2026-11-22T10:00:00.000Z',
    },
    'asisten-1'
  );

  assert.equal(session.status, 'scheduled');

  // Buka sesi
  await adapter.openSession(session.id, 'asisten-1');
  let current = await adapter.getSession(session.id);
  assert.equal(current?.status, 'open');
  assert.equal(current?.openedBy, 'asisten-1');

  // Mencoba buka sesi yang sudah 'open' harus gagal
  await assert.rejects(
    async () => {
      await adapter.openSession(session.id, 'asisten-1');
    },
    { message: /tidak dapat dibuka/ }
  );

  // Mencoba hapus sesi yang sudah open harus ditolak
  await assert.rejects(
    async () => {
      await adapter.deleteSession(session.id);
    },
    { message: /Hanya sesi berstatus "scheduled"/ }
  );

  // Tutup sesi
  await adapter.closeSession(session.id, 'asisten-1');
  current = await adapter.getSession(session.id);
  assert.equal(current?.status, 'closed');
  assert.equal(current?.closedBy, 'asisten-1');

  // Mencoba buka kembali sesi yang sudah closed harus gagal
  await assert.rejects(
    async () => {
      await adapter.openSession(session.id, 'asisten-1');
    },
    { message: /tidak dapat dibuka/ }
  );
});

test('GA-02 & FR-14: Validate session startsAt before endsAt', async () => {
  const adapter = new MockPracticumAdapter();
  const cls = await adapter.createClass(
    { courseName: 'Basis Data', className: 'BD-1' },
    'asisten-1'
  );

  // Invalid: startsAt > endsAt
  await assert.rejects(
    async () => {
      await adapter.createSession(
        {
          classId: cls.id,
          title: 'Sesi Tidak Valid',
          location: 'Lab 1',
          startsAt: '2026-11-20T12:00:00.000Z',
          endsAt: '2026-11-20T10:00:00.000Z',
        },
        'asisten-1'
      );
    },
    { message: /Waktu selesai harus lebih lambat dari waktu mulai/ }
  );
});

test('formatSessionTime and formatSessionDate normalize ISO timestamps and preserve plain clock strings', () => {
  assert.equal(formatSessionTime('08:00'), '08:00');
  const formattedTime = formatSessionTime('2026-11-20T08:00:00.000Z');
  assert.doesNotMatch(formattedTime, /2026-11-20T/);

  assert.equal(formatSessionDate('Senin, 25 Nov 2026', '2026-11-20T08:00:00.000Z'), 'Senin, 25 Nov 2026');
  assert.notEqual(formatSessionDate(undefined, '2026-11-20T08:00:00.000Z'), 'Belum ditentukan');
  assert.equal(formatSessionDate(undefined, '08:00'), 'Belum ditentukan');
});

test('FR-05: Sesi tidak boleh dapat dihapus jika sudah memiliki presensi atau izin', async () => {
  const adapter = new MockPracticumAdapter();
  const cls = await adapter.createClass(
    { courseName: 'Jaringan Komputer', className: 'JK-1' },
    'asisten-1'
  );

  // Buat sesi 1 untuk tes presensi
  const sessAttendance = await adapter.createSession(
    {
      classId: cls.id,
      title: 'Sesi Topologi Jaringan',
      location: 'Lab Jaringan',
      startsAt: '2026-11-25T08:00:00.000Z',
      endsAt: '2026-11-25T10:00:00.000Z',
    },
    'asisten-1'
  );

  // Buat sesi 2 untuk tes izin
  const sessLeave = await adapter.createSession(
    {
      classId: cls.id,
      title: 'Sesi Subnetting',
      location: 'Lab Jaringan',
      startsAt: '2026-11-26T08:00:00.000Z',
      endsAt: '2026-11-26T10:00:00.000Z',
    },
    'asisten-1'
  );

  // Buat sesi 3 tanpa presensi/izin
  const sessClean = await adapter.createSession(
    {
      classId: cls.id,
      title: 'Sesi Routing Dinamis',
      location: 'Lab Jaringan',
      startsAt: '2026-11-27T08:00:00.000Z',
      endsAt: '2026-11-27T10:00:00.000Z',
    },
    'asisten-1'
  );

  // Daftarkan presensi ke sesi 1
  adapter.addMockAttendance({
    sessionId: sessAttendance.id,
    studentId: 'student-galang',
    classId: cls.id,
  });

  // Daftarkan izin ke sesi 2
  adapter.addMockLeaveRequest({
    sessionId: sessLeave.id,
    studentId: 'student-budi',
    classId: cls.id,
  });

  // Verifikasi penghapusan sesi 1 ditolak karena memiliki presensi
  await assert.rejects(
    async () => {
      await adapter.deleteSession(sessAttendance.id);
    },
    { message: /sudah memiliki data presensi/ }
  );

  // Verifikasi penghapusan sesi 2 ditolak karena memiliki izin
  await assert.rejects(
    async () => {
      await adapter.deleteSession(sessLeave.id);
    },
    { message: /sudah memiliki data pengajuan izin/ }
  );

  // Verifikasi sesi 3 (bersih) berhasil dihapus
  await adapter.deleteSession(sessClean.id);
  const deletedSess = await adapter.getSession(sessClean.id);
  assert.equal(deletedSess, null);
});

test('FR-04: Kelas tidak boleh meninggalkan sesi atau member yatim', async () => {
  const adapter = new MockPracticumAdapter();
  const cls = await adapter.createClass(
    { courseName: 'Algoritma Pemrograman', className: 'AP-1' },
    'asisten-1'
  );

  // Tambah anggota ke kelas
  const member = await adapter.addMember(cls.id, {
    userId: '23.11.0005',
    displayName: 'Andi',
    identifier: '23.11.0005',
  });

  // Tambah sesi scheduled bersih ke kelas
  const session = await adapter.createSession(
    {
      classId: cls.id,
      title: 'Modul Pointer & Rekursi',
      location: 'Lab 2',
      startsAt: '2026-11-28T08:00:00.000Z',
      endsAt: '2026-11-28T10:00:00.000Z',
    },
    'asisten-1'
  );

  let initialMembers = await adapter.getClassMembers(cls.id);
  assert.equal(initialMembers.length, 1);
  assert.equal(initialMembers[0].userId, member.userId);

  let initialSession = await adapter.getSession(session.id);
  assert.ok(initialSession !== null);

  // Hapus kelas
  await adapter.deleteClass(cls.id);

  // Verifikasi kelas sudah terhapus
  const classes = await adapter.getClasses();
  assert.equal(classes.find((c) => c.id === cls.id), undefined);

  // Verifikasi anggota kelas tidak yatim (sudah bersih/terhapus)
  const remainingMembers = await adapter.getClassMembers(cls.id);
  assert.equal(remainingMembers.length, 0);

  // Verifikasi sesi kelas tidak yatim (sudah bersih/terhapus)
  const remainingSession = await adapter.getSession(session.id);
  assert.equal(remainingSession, null);
  const allSessions = await adapter.getSessions(cls.id);
  assert.equal(allSessions.length, 0);
});

test('FR-04: Kelas tidak dapat dihapus jika memiliki sesi aktif, sesi dengan presensi, atau izin', async () => {
  const adapter = new MockPracticumAdapter();

  // Kasus 1: Kelas dengan sesi yang sudah 'open'
  const clsActive = await adapter.createClass(
    { courseName: 'Grafika Komputer', className: 'GK-1' },
    'asisten-1'
  );
  const sessOpen = await adapter.createSession(
    {
      classId: clsActive.id,
      title: 'Sesi Blender 3D',
      location: 'Lab Grafika',
      startsAt: '2026-11-29T08:00:00.000Z',
      endsAt: '2026-11-29T10:00:00.000Z',
    },
    'asisten-1'
  );
  await adapter.openSession(sessOpen.id, 'asisten-1');

  await assert.rejects(
    async () => {
      await adapter.deleteClass(clsActive.id);
    },
    { message: /sedang berjalan atau sudah selesai/ }
  );

  // Kasus 2: Kelas dengan sesi yang memiliki presensi
  const clsAtt = await adapter.createClass(
    { courseName: 'Sistem Informasi', className: 'SI-1' },
    'asisten-1'
  );
  const sessAtt = await adapter.createSession(
    {
      classId: clsAtt.id,
      title: 'Sesi Analisis Sistem',
      location: 'Lab SI',
      startsAt: '2026-11-30T08:00:00.000Z',
      endsAt: '2026-11-30T10:00:00.000Z',
    },
    'asisten-1'
  );
  adapter.addMockAttendance({
    sessionId: sessAtt.id,
    studentId: 'student-galang',
    classId: clsAtt.id,
  });

  await assert.rejects(
    async () => {
      await adapter.deleteClass(clsAtt.id);
    },
    { message: /sudah memiliki data presensi/ }
  );

  // Kasus 3: Kelas dengan sesi yang memiliki izin
  const clsLeave = await adapter.createClass(
    { courseName: 'Kecerdasan Buatan', className: 'KB-1' },
    'asisten-1'
  );
  const sessLeave = await adapter.createSession(
    {
      classId: clsLeave.id,
      title: 'Sesi Prompt Engineering',
      location: 'Lab AI',
      startsAt: '2026-12-01T08:00:00.000Z',
      endsAt: '2026-12-01T10:00:00.000Z',
    },
    'asisten-1'
  );
  adapter.addMockLeaveRequest({
    sessionId: sessLeave.id,
    studentId: 'student-galang',
    classId: clsLeave.id,
  });

  await assert.rejects(
    async () => {
      await adapter.deleteClass(clsLeave.id);
    },
    { message: /sudah memiliki data izin/ }
  );
});

test('memberUids stays synced on addMember/removeMember, getRegisteredStudents returns candidates, and updateSession validates timestamps', async () => {
  const adapter = new MockPracticumAdapter();
  const cls = await adapter.createClass(
    { courseName: 'Pemrograman Web', className: 'PW-A' },
    'asisten-1',
  );
  assert.deepEqual(cls.memberUids, []);

  await adapter.addMember(cls.id, {
    userId: '2402030202',
    displayName: 'Anintya Putri',
    identifier: '2402030202',
  });

  let classes = await adapter.getClasses('asisten-1');
  assert.ok(classes.find((c) => c.id === cls.id)?.memberUids?.includes('2402030202'));

  const candidates = await adapter.getRegisteredStudents();
  assert.ok(candidates.some((s) => s.userId === '2402030202'));

  await adapter.removeMember(cls.id, '2402030202');
  classes = await adapter.getClasses('asisten-1');
  assert.equal(classes.find((c) => c.id === cls.id)?.memberUids?.includes('2402030202'), false);

  const session = await adapter.createSession(
    {
      classId: cls.id,
      title: 'Pertemuan 1',
      location: 'Lab 1',
      startsAt: '2026-11-25T08:00:00.000Z',
      endsAt: '2026-11-25T10:00:00.000Z',
    },
    'asisten-1',
  );

  await assert.rejects(
    async () => {
      await adapter.updateSession(session.id, { startsAt: 'not-a-timestamp' });
    },
    { message: /tidak valid/ },
  );

  await assert.rejects(
    async () => {
      await adapter.updateSession(session.id, {
        startsAt: '2026-11-25T11:00:00.000Z',
        endsAt: '2026-11-25T10:00:00.000Z',
      });
    },
    { message: /Waktu selesai harus lebih lambat dari waktu mulai/ },
  );
});

test('Seeder provides all 8 practicum courses and 2 student/assistant accounts', async () => {
  const expectedCourses = [
    'Sistem Operasi',
    'Pengembangan Platform Khusus',
    'Pembelajaran Mesin',
    'Struktur Data',
    'Basis Data',
    'Algoritma Pemrograman',
    'Dasar Sistem',
    'Dasar Pemrograman',
  ];

  assert.deepEqual(
    SEED_PRACTICUM_COURSES.map((c) => c.courseName),
    expectedCourses,
  );

  const adapter = new MockPracticumAdapter();
  const classes = await adapter.getClasses();
  for (const name of expectedCourses) {
    assert.ok(
      classes.some((c) => c.courseName === name),
      `Missing seeded course: ${name}`,
    );
  }

  const students = await adapter.getRegisteredStudents();
  assert.ok(students.some((s) => s.identifier === '2402030201'));
  assert.ok(students.some((s) => s.identifier === '2402030202'));
});
