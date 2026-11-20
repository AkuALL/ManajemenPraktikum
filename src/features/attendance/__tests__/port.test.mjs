import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAttendanceDocId } from '../../../types/contracts.ts';
import {
  formatServerTime,
  mapAttendanceError,
  sortAttendanceEntries,
  toSessionSummary,
  validateAttendanceLocationAudit,
} from '../port.ts';

test('buildAttendanceDocId enforces deterministic {sessionId}_{studentId} format', () => {
  assert.equal(buildAttendanceDocId('sesi-01', 'uid-abc'), 'sesi-01_uid-abc');
});

test('toSessionSummary maps both Sprint 1 LabSession and Sprint 2 SessionSummary', () => {
  const legacySession = {
    id: 'sesi-1',
    practicumName: 'Basis Data',
    courseClass: 'Kelas B',
    location: 'Lab 2',
    startsAt: '13.00',
    endsAt: '15.00',
    status: 'upcoming',
  };
  assert.deepEqual(toSessionSummary(legacySession), {
    id: 'sesi-1',
    classId: 'Kelas B',
    status: 'scheduled',
  });

  const withFirestoreClassId = toSessionSummary({
    ...legacySession,
    classId: 'cls-firestore-01',
  });
  assert.deepEqual(withFirestoreClassId, {
    id: 'sesi-1',
    classId: 'cls-firestore-01',
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

test('validateAttendanceLocationAudit requires valid GPS audit and within-radius status', () => {
  assert.equal(validateAttendanceLocationAudit(undefined).reason, 'location-required');
  assert.equal(
    validateAttendanceLocationAudit({
      latitude: 95,
      longitude: 110,
      accuracy: 10,
      distanceMeters: 15,
      isWithinRadius: true,
    }).reason,
    'location-required',
  );
  assert.equal(
    validateAttendanceLocationAudit({
      latitude: -7.7654,
      longitude: 110.3721,
      accuracy: 8,
      distanceMeters: 120,
      isWithinRadius: false,
    }).reason,
    'outside-radius',
  );

  const valid = validateAttendanceLocationAudit({
    latitude: -7.765432,
    longitude: 110.372101,
    accuracy: 8.46,
    distanceMeters: 12.34,
    isWithinRadius: true,
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.value.accuracy, 8.5);
    assert.equal(valid.value.distanceMeters, 12.3);
    assert.equal(valid.value.isWithinRadius, true);
  }
});
