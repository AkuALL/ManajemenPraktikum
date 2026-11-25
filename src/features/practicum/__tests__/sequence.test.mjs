import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPreviousSessionsClosed, compareSessions } from '../sequence.ts';

const first = { id: 'a', title: 'Pertemuan 1', startsAt: '2026-12-01T08:00:00Z', status: 'scheduled' };
const second = { id: 'b', title: 'Pertemuan 2', startsAt: '2026-12-08T08:00:00Z', status: 'scheduled' };

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
