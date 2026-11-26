import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dismissForegroundEvent,
  FOREGROUND_NOTIFICATION_DURATION_MS,
  getLeaveEvents,
  getSessionEvents,
} from '../foreground-events.ts';

const session = { id: 's1', title: 'Pertemuan 1', location: 'Lab B', status: 'scheduled' };
const leave = { id: 'l1', status: 'pending' };

test('sesi baru dan sesi dibuka menghasilkan notifikasi satu kali per perubahan', () => {
  assert.equal(getSessionEvents([], [session])[0].title, 'Sesi Praktikum Baru');
  assert.equal(getSessionEvents([session], [{ ...session, status: 'open' }])[0].title, 'Sesi Praktikum Dibuka');
  assert.deepEqual(getSessionEvents([session], [session]), []);
  assert.equal(getSessionEvents([], [{ ...session, status: 'open' }])[0].title, 'Sesi Praktikum Dibuka');
  assert.equal(getSessionEvents([session], [{ ...session, location: 'Lab C' }])[0].title, 'Jadwal Praktikum Diperbarui');
});

test('izin baru untuk asisten dan keputusan untuk praktikan', () => {
  assert.equal(getLeaveEvents([], [leave], 'assistant')[0].route, '/review-izin');
  assert.deepEqual(getLeaveEvents([], [leave], 'student'), []);
  assert.match(getLeaveEvents([leave], [{ ...leave, status: 'approved' }], 'student')[0].title, /Disetujui/);
  assert.match(getLeaveEvents([leave], [{ ...leave, status: 'rejected' }], 'student')[0].title, /Ditolak/);
  assert.deepEqual(getLeaveEvents([leave], [leave], 'assistant'), []);
});

test('notifikasi foreground menutup otomatis dalam 3 detik dan dismiss hanya menghapus event aktif', () => {
  assert.equal(FOREGROUND_NOTIFICATION_DURATION_MS, 3000);
  const first = { id: 'n1', title: 'Satu', body: 'Pertama', route: '/schedule' };
  const second = { id: 'n2', title: 'Dua', body: 'Kedua', route: '/review-izin' };
  assert.deepEqual(dismissForegroundEvent([first, second], first), [second]);
  assert.deepEqual(dismissForegroundEvent([second], first), [second]);
});
