import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAttendanceDocId } from '../../../types/contracts.ts';
import {
  formatServerTime,
  mapAttendanceError,
  sortAttendanceEntries,
  toSessionSummary,
} from '../port.ts';

test('buildAttendanceDocId enforces deterministic {sessionId}_{studentId} format', () => {
  assert.equal(buildAttendanceDocId('sesi-01', 'uid-abc'), 'sesi-01_uid-abc');
});

test('toSessionSummary maps both Sprint 1 LabSession and Sprint 2 SessionSummary', () => {
  const fromLegacy = toSessionSummary({
    id: 'sesi-1',
    practicumName: 'Basis Data',
    courseClass: 'Kelas B',
    location: 'Lab 2',
    startsAt: '13.00',
    endsAt: '15.00',
    status: 'upcoming',
  });
  assert.deepEqual(fromLegacy, {
    id: 'sesi-1',
    classId: 'Kelas B',
    status: 'scheduled',
  });

  const direct = { id: 'sesi-2', classId: 'cls-2', status: 'open' };
  assert.deepEqual(toSessionSummary(direct), direct);
});

test('formatServerTime handles null pending serverTimestamp and formatted timestamps', () => {
  assert.equal(formatServerTime(null), 'Menunggu waktu server');
  assert.notEqual(formatServerTime(1760000000000, 'time'), 'Menunggu waktu server');
});

test('sortAttendanceEntries orders deterministically by server timestamp', () => {
  const items = [
    {
      id: 'a',
      sessionId: 's1',
      classId: 'c1',
      studentId: 'u1',
      studentName: 'A',
      studentIdentifier: '1',
      attendedAt: 't1',
      attendedAtMs: 1000,
    },
    {
      id: 'b',
      sessionId: 's1',
      classId: 'c1',
      studentId: 'u2',
      studentName: 'B',
      studentIdentifier: '2',
      attendedAt: 't2',
      attendedAtMs: 2000,
    },
  ];

  assert.deepEqual(
    sortAttendanceEntries(items, false).map((item) => item.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    sortAttendanceEntries(items, true).map((item) => item.id),
    ['a', 'b'],
  );
});

test('mapAttendanceError maps Firestore codes cleanly', () => {
  assert.equal(mapAttendanceError({ code: 'already-exists' }).code, 'duplicate');
  assert.equal(mapAttendanceError({ code: 'permission-denied' }).code, 'forbidden');
  assert.equal(mapAttendanceError({ code: 'unavailable' }).code, 'network');
});
