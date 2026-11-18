import assert from 'node:assert/strict';
import test from 'node:test';

import {
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
