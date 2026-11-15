import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAttendanceDocId } from '../../../types/contracts.ts';
import {
  AttendancePortError,
  toSessionSummary,
} from '../port.ts';
import { AuthPortError, validateLoginInput, validateRegisterInput } from '../../auth/port.ts';

function createInMemoryBackend() {
  const users = new Map();
  const memberships = new Set(); // `${classId}:${uid}`
  const attendance = new Map(); // `${sessionId}_${uid}` -> record
  const listeners = new Set();
  let currentUser = null;
  let seq = 0;

  function notify() {
    const all = Array.from(attendance.values());
    for (const sub of listeners) sub(all);
  }

  const authPort = {
    async login(input) {
      const err = validateLoginInput(input);
      if (err) throw new AuthPortError('invalid-credentials', err);
      const user = Array.from(users.values()).find((u) => u.email === input.email);
      if (!user) throw new AuthPortError('invalid-credentials', 'Email atau kata sandi salah.');
      if (!user.profileReady) {
        throw new AuthPortError('profile-missing', 'Profil akun tidak ditemukan.');
      }
      currentUser = user;
      return user;
    },
    async register(input) {
      const err = validateRegisterInput(input);
      if (err) throw new AuthPortError('unknown', err);
      const exists = Array.from(users.values()).some((u) => u.email === input.email);
      if (exists) throw new AuthPortError('email-in-use', 'Email sudah terdaftar.');
      const user = {
        uid: `uid-${++seq}`,
        displayName: input.displayName.trim(),
        email: input.email.trim(),
        role: input.role,
        identifier: input.identifier.trim(),
        profileReady: true,
      };
      users.set(user.uid, user);
      currentUser = user;
      return user;
    },
    async logout() {
      currentUser = null;
    },
    getCurrentUser() {
      return currentUser;
    },
    seedBrokenProfile(email) {
      users.set(`uid-${++seq}`, { uid: `uid-${seq}`, email, profileReady: false });
    },
  };

  const attendancePort = {
    addMember(classId, uid) {
      memberships.add(`${classId}:${uid}`);
    },
    async submitAttendance({ session, user }) {
      const summary = toSessionSummary(session);
      if (summary.status !== 'open') {
        return { ok: false, reason: 'session-closed', message: 'Sesi presensi tidak sedang dibuka.' };
      }
      if (user.role !== 'student' || !memberships.has(`${summary.classId}:${user.uid}`)) {
        return { ok: false, reason: 'forbidden', message: 'Akses ditolak.' };
      }
      const id = buildAttendanceDocId(summary.id, user.uid);
      if (attendance.has(id)) {
        return { ok: false, reason: 'duplicate', message: 'Kehadiran sudah tercatat.' };
      }
      const record = {
        id,
        sessionId: summary.id,
        classId: summary.classId,
        studentId: user.uid,
        studentName: user.displayName,
        studentIdentifier: user.identifier,
        attendedAt: '13.05',
        attendedAtMs: 1760000000000 + ++seq,
      };
      attendance.set(id, record);
      notify();
      return { ok: true, record };
    },
    subscribeSessionAttendance(sessionId, onData, _onError, options) {
      const push = (all) => {
        const filtered = all.filter(
          (r) => r.sessionId === sessionId && (!options?.classId || r.classId === options.classId),
        );
        onData(filtered, { fromCache: false });
      };
      listeners.add(push);
      push(Array.from(attendance.values()));
      return () => {
        listeners.delete(push);
      };
    },
    getListenerCount() {
      return listeners.size;
    },
  };

  return { authPort, attendancePort, attendance };
}

test('AL-01..03 QA: register, login, logout, and missing-profile handling', async () => {
  const { authPort } = createInMemoryBackend();

  const student = await authPort.register({
    displayName: 'Budi Santoso',
    email: 'budi@kampus.ac.id',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'student',
    identifier: '23.11.0123',
  });
  assert.equal(student.role, 'student');
  assert.equal(authPort.getCurrentUser()?.uid, student.uid);

  await authPort.logout();
  assert.equal(authPort.getCurrentUser(), null);

  const loggedIn = await authPort.login({ email: 'budi@kampus.ac.id', password: 'password123' });
  assert.equal(loggedIn.identifier, '23.11.0123');

  authPort.seedBrokenProfile('orphan@kampus.ac.id');
  await assert.rejects(
    () => authPort.login({ email: 'orphan@kampus.ac.id', password: 'password123' }),
    (err) => err instanceof AuthPortError && err.code === 'profile-missing',
  );
});

test('AL-04..06 QA: session state, non-member deny, duplicate immutability, and listener cleanup', async () => {
  const { authPort, attendancePort, attendance } = createInMemoryBackend();
  const student = await authPort.register({
    displayName: 'Siti Aminah',
    email: 'siti@kampus.ac.id',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'student',
    identifier: '23.11.0456',
  });

  const closedRes = await attendancePort.submitAttendance({
    session: { id: 'sesi-closed', classId: 'cls-1', status: 'closed' },
    user: student,
  });
  assert.equal(closedRes.ok, false);
  assert.equal(closedRes.reason, 'session-closed');

  const scheduledRes = await attendancePort.submitAttendance({
    session: { id: 'sesi-sched', classId: 'cls-1', status: 'scheduled' },
    user: student,
  });
  assert.equal(scheduledRes.ok, false);
  assert.equal(scheduledRes.reason, 'session-closed');

  const nonMemberRes = await attendancePort.submitAttendance({
    session: { id: 'sesi-open', classId: 'cls-1', status: 'open' },
    user: student,
  });
  assert.equal(nonMemberRes.ok, false);
  assert.equal(nonMemberRes.reason, 'forbidden');

  attendancePort.addMember('cls-1', student.uid);

  const recapUpdates = [];
  const unsubscribe = attendancePort.subscribeSessionAttendance(
    'sesi-open',
    (rows) => recapUpdates.push(rows.map((r) => r.id)),
    () => {
      throw new AttendancePortError('unknown', 'unexpected listener error');
    },
    { classId: 'cls-1' },
  );
  assert.equal(attendancePort.getListenerCount(), 1);

  const first = await attendancePort.submitAttendance({
    session: { id: 'sesi-open', classId: 'cls-1', status: 'open' },
    user: student,
  });
  assert.equal(first.ok, true);
  assert.equal(first.record.id, `sesi-open_${student.uid}`);

  const duplicate = await attendancePort.submitAttendance({
    session: { id: 'sesi-open', classId: 'cls-1', status: 'open' },
    user: { ...student, displayName: 'Nama Berubah' },
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, 'duplicate');
  assert.equal(attendance.get(`sesi-open_${student.uid}`)?.studentName, 'Siti Aminah');
  assert.deepEqual(recapUpdates.at(-1), [`sesi-open_${student.uid}`]);

  unsubscribe();
  assert.equal(attendancePort.getListenerCount(), 0);
});
