import assert from 'node:assert/strict';
import test from 'node:test';

import { MockPracticumAdapter } from '../mock-adapter.ts';

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
    userId: 'student-galang',
    displayName: 'Galang Bintang',
    identifier: '23.11.0001',
  });

  assert.equal(member.userId, 'student-galang');
  assert.equal(member.role, 'student');

  const members = await adapter.getClassMembers(newClass.id);
  assert.equal(members.length, 1);
  assert.equal(members[0].userId, 'student-galang');

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
    userId: 'student-galang',
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
  const unsubSessions = adapter.subscribeSessions(
    undefined,
    'student-galang',
    'student',
    (data) => {
      studentSessions = data;
    }
  );

  assert.equal(studentSessions.length, 1);
  assert.equal(studentSessions[0].title, 'Sesi Query SQL Kelas A');
  assert.equal(studentSessions[0].classId, classA.id);

  // Verifikasi subscribeClasses untuk Praktikan Galang
  let studentClasses = [];
  const unsubClasses = adapter.subscribeClasses(
    undefined,
    (data) => {
      studentClasses = data;
    },
    undefined,
    'student-galang'
  );

  assert.equal(studentClasses.length, 1);
  assert.equal(studentClasses[0].id, classA.id);

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
