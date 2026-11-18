import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectSessionSlotId,
  extractCohortYear,
  filterStudentCandidates,
  SESSION_TIME_SLOTS,
  sessionDateInput,
  sessionTimeInput,
  validateClassInput,
  validateSessionInput,
} from '../validation.ts';

test('FR-14: class input is trimmed and requires meaningful values', () => {
  const valid = validateClassInput({
    courseName: '  Pemrograman Mobile  ',
    className: '  IF-3A ',
    lab: ' Lab Software ',
  });

  assert.deepEqual(valid, {
    value: {
      courseName: 'Pemrograman Mobile',
      className: 'IF-3A',
      lab: 'Lab Software',
    },
  });
  assert.deepEqual(validateClassInput({ courseName: 'A', className: 'IF-3A' }), {
    error: 'Nama praktikum minimal 2 karakter',
  });
});

test('FR-14: session input rejects malformed dates, times, and reversed ranges', () => {
  const baseInput = {
    classId: 'class-1',
    title: 'Modul State Management',
    location: 'Lab 1',
    date: '2026-11-25',
    startsAt: '08:00',
    endsAt: '10:30',
  };

  assert.deepEqual(validateSessionInput({ ...baseInput, date: '2026-02-30' }), {
    error: 'Tanggal harus berformat YYYY-MM-DD dan valid',
  });
  assert.deepEqual(validateSessionInput({ ...baseInput, startsAt: '8:00' }), {
    error: 'Waktu mulai dan selesai harus berformat HH:mm',
  });
  assert.deepEqual(validateSessionInput({ ...baseInput, startsAt: '11:00', endsAt: '10:30' }), {
    error: 'Waktu selesai harus setelah waktu mulai',
  });
});

test('FR-14: valid session input creates Firebase-compatible ISO timestamps', () => {
  const result = validateSessionInput({
    classId: ' class-1 ',
    title: ' Modul 1 ',
    location: ' Lab 1 ',
    date: '2026-11-25',
    startsAt: '08:00',
    endsAt: '10:30',
  });

  assert.ok('value' in result);
  assert.equal(result.value.classId, 'class-1');
  assert.equal(result.value.title, 'Modul 1');
  assert.equal(result.value.location, 'Lab 1');
  assert.ok(Number.isFinite(new Date(result.value.startsAt).getTime()));
  assert.ok(Number.isFinite(new Date(result.value.endsAt).getTime()));
  assert.ok(new Date(result.value.startsAt) < new Date(result.value.endsAt));
});

test('FR-14: editing an ISO session displays local date and time fields', () => {
  assert.equal(sessionDateInput('2026-11-25'), '2026-11-25');
  assert.match(sessionDateInput('2026-11-25T08:00:00.000Z'), /^2026-11-\d{2}$/);
  assert.match(sessionDateInput('tanggal tidak valid', '2026-11-25T08:00:00.000Z'), /^2026-11-\d{2}$/);
  assert.match(sessionTimeInput('2026-11-25T08:00:00.000Z', '08:00'), /^\d{2}:\d{2}$/);
  assert.equal(sessionTimeInput('08:00', '10:30'), '08:00');
});

test('extractCohortYear and filterStudentCandidates filter by name, NIM, cohort, and existing members', () => {
  assert.equal(extractCohortYear('22/500001/TK/50001'), '2022');
  assert.equal(extractCohortYear('2402030202'), '2024');
  assert.equal(extractCohortYear('202512345'), '2025');
  assert.equal(extractCohortYear('invalid'), null);

  const candidates = [
    { userId: 'u1', displayName: 'Budi Santoso', identifier: '22/500001/TK/50001' },
    { userId: 'u2', displayName: 'Anintya Putri', identifier: '2402030202' },
    { userId: 'u3', displayName: 'Dewi Lestari', identifier: '23/510005/PA/21005' },
  ];

  assert.deepEqual(
    filterStudentCandidates(candidates, ['u1'], {}).map((s) => s.userId),
    ['u2', 'u3'],
  );
  assert.deepEqual(
    filterStudentCandidates(candidates, [], { name: 'anin' }).map((s) => s.userId),
    ['u2'],
  );
  assert.deepEqual(
    filterStudentCandidates(candidates, [], { nim: '510005' }).map((s) => s.userId),
    ['u3'],
  );
  assert.deepEqual(
    filterStudentCandidates(candidates, [], { cohort: '2022' }).map((s) => s.userId),
    ['u1'],
  );
});

test('SESSION_TIME_SLOTS, detectSessionSlotId, and past timestamp validation enforce session rules', () => {
  assert.equal(SESSION_TIME_SLOTS.length, 6);
  assert.equal(detectSessionSlotId('08:00', '10:00'), 'slot-1');
  assert.equal(detectSessionSlotId('18.15', '20.15'), 'slot-5');
  assert.equal(detectSessionSlotId('09:00', '11:30'), 'custom');

  const pastInput = {
    classId: 'class-1',
    title: 'Modul Lampau',
    location: 'Lab 1',
    date: '2026-11-10',
    startsAt: '08:00',
    endsAt: '10:00',
  };
  const nowRef = new Date('2026-11-18T12:00:00');
  assert.deepEqual(validateSessionInput(pastInput, { allowPast: false, now: nowRef }), {
    error: 'Waktu mulai sesi baru tidak boleh berada di masa lalu',
  });
  assert.ok('value' in validateSessionInput(pastInput, { allowPast: true, now: nowRef }));
});
