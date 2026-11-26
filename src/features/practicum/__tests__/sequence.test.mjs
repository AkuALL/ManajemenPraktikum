import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoScheduleConflict,
  assertPreviousSessionsClosed,
  assertSessionWithinStartWindow,
  checkSessionStartWindow,
  compareSessions,
  findScheduleConflict,
} from '../sequence.ts';

const first = { id: 'a', classId: 'c1', title: 'Pertemuan 1', location: 'Lab B', labId: 'lab-b', startsAt: '2026-12-01T08:00:00Z', endsAt: '2026-12-01T10:00:00Z', status: 'scheduled' };
const second = { id: 'b', classId: 'c1', title: 'Pertemuan 2', location: 'Lab B', labId: 'lab-b', startsAt: '2026-12-08T08:00:00Z', endsAt: '2026-12-08T10:00:00Z', status: 'scheduled' };

test('pertemuan sebelumnya harus selesai sebelum pertemuan berikutnya dibuka', () => {
  assert.throws(() => assertPreviousSessionsClosed([second, first], 'b'), /Pertemuan 1/);
  assert.throws(() => assertPreviousSessionsClosed([second, { ...first, status: 'open' }], 'b'), /Pertemuan 1/);
  assert.doesNotThrow(() => assertPreviousSessionsClosed([second, { ...first, status: 'closed' }], 'b'));
  assert.doesNotThrow(() => assertPreviousSessionsClosed([second, first], 'a'));
});

test('urutan memakai tanggal dan jam, dengan ID sebagai penentu jika waktunya sama', () => {
  assert.ok(compareSessions({ ...first, date: '2026-12-01', startsAt: '08:00' }, { ...second, date: '2026-12-02', startsAt: '07:00' }) < 0);
  assert.ok(compareSessions(first, { ...second, startsAt: first.startsAt }) < 0);
});

test('checkSessionStartWindow hanya mengizinkan buka sesi saat berada di jam jadwalnya', () => {
  const before = checkSessionStartWindow(first, new Date('2026-12-01T07:59:59Z'));
  assert.equal(before.canOpen, false);
  assert.equal(before.state, 'before');
  assert.throws(() => assertSessionWithinStartWindow(first, new Date('2026-12-01T07:59:59Z')), /belum memasuki jamnya/);

  const atStart = checkSessionStartWindow(first, new Date('2026-12-01T08:00:00Z'));
  assert.equal(atStart.canOpen, true);
  assert.equal(atStart.state, 'within');

  const mid = checkSessionStartWindow(first, new Date('2026-12-01T09:00:00Z'));
  assert.equal(mid.canOpen, true);
  assert.doesNotThrow(() => assertSessionWithinStartWindow(first, new Date('2026-12-01T09:00:00Z')));

  const atEnd = checkSessionStartWindow(first, new Date('2026-12-01T10:00:00Z'));
  assert.equal(atEnd.canOpen, true);

  const after = checkSessionStartWindow(first, new Date('2026-12-01T10:00:01Z'));
  assert.equal(after.canOpen, false);
  assert.equal(after.state, 'after');
  assert.throws(() => assertSessionWithinStartWindow(first, new Date('2026-12-01T10:00:01Z')), /telah berakhir/);
});

test('findScheduleConflict menolak jadwal overlap di lab yang sama dan kelas yang sama', () => {
  const existing = [
    first,
    {
      id: 'c',
      classId: 'c2',
      title: 'Sesi Dibatalkan',
      location: 'Lab B',
      labId: 'lab-b',
      startsAt: '2026-12-02T08:00:00Z',
      endsAt: '2026-12-02T10:00:00Z',
      status: 'cancelled',
    },
  ];

  // Overlap di lab yang sama oleh kelas lain
  const labOverlap = findScheduleConflict(existing, {
    classId: 'c2',
    labId: 'lab-b',
    location: 'Lab B',
    startsAt: '2026-12-01T09:00:00Z',
    endsAt: '2026-12-01T11:00:00Z',
  });
  assert.equal(labOverlap.hasConflict, true);
  assert.equal(labOverlap.conflictType, 'lab');
  assert.throws(
    () =>
      assertNoScheduleConflict(existing, {
        classId: 'c2',
        labId: 'lab-b',
        location: 'Lab B',
        startsAt: '2026-12-01T09:00:00Z',
        endsAt: '2026-12-01T11:00:00Z',
      }),
    /Jadwal bentrok di Lab B/,
  );

  // Jam bersebelahan (10:00-12:00 setelah 08:00-10:00) tidak overlap
  const adjacent = findScheduleConflict(existing, {
    classId: 'c2',
    labId: 'lab-b',
    location: 'Lab B',
    startsAt: '2026-12-01T10:00:00Z',
    endsAt: '2026-12-01T12:00:00Z',
  });
  assert.equal(adjacent.hasConflict, false);

  // Lab berbeda di jam yang sama untuk kelas lain diizinkan
  const diffLabDiffClass = findScheduleConflict(existing, {
    classId: 'c2',
    labId: 'lab-c',
    location: 'Lab C',
    startsAt: '2026-12-01T08:00:00Z',
    endsAt: '2026-12-01T10:00:00Z',
  });
  assert.equal(diffLabDiffClass.hasConflict, false);

  // Kelas sama meski lab berbeda di jam overlap tetap bentrok (termasuk saat reschedule)
  const sameClassOverlap = findScheduleConflict(existing, {
    classId: 'c1',
    labId: 'lab-c',
    location: 'Lab C',
    startsAt: '2026-12-01T08:30:00Z',
    endsAt: '2026-12-01T10:30:00Z',
    excludeSessionId: 'b',
  });
  assert.equal(sameClassOverlap.hasConflict, true);
  assert.equal(sameClassOverlap.conflictType, 'class');

  // Reschedule sesi yang sama di jam yang sama tidak bentrok dengan dirinya sendiri
  const selfReschedule = findScheduleConflict(existing, {
    classId: 'c1',
    labId: 'lab-b',
    location: 'Lab B',
    startsAt: '2026-12-01T08:30:00Z',
    endsAt: '2026-12-01T10:00:00Z',
    excludeSessionId: 'a',
  });
  assert.equal(selfReschedule.hasConflict, false);

  // Sesi yang dibatalkan tidak menyebabkan bentrok
  const cancelledIgnored = findScheduleConflict(existing, {
    classId: 'c3',
    labId: 'lab-b',
    location: 'Lab B',
    startsAt: '2026-12-02T08:00:00Z',
    endsAt: '2026-12-02T10:00:00Z',
  });
  assert.equal(cancelledIgnored.hasConflict, false);
});
