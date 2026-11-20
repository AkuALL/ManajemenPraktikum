import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveNotificationTargetRoute } from '../../../services/notification/deep-linking-resolver.ts';
import {
  buildLeaveDecisionNotificationPayload,
  executeLeaveNotificationDispatch,
} from '../leave-notification-payload.ts';

test('FR-14: buildLeaveDecisionNotificationPayload creates approved and rejected payloads', () => {
  const approved = buildLeaveDecisionNotificationPayload({
    leaveRequestId: 'sesi-1_stu-1',
    studentId: 'stu-1',
    sessionId: 'sesi-1',
    classId: 'cls-1',
    decision: 'approved',
    sessionTitle: 'Sistem Operasi',
    reviewNote: 'Surat dokter valid',
  });

  assert.equal(approved.type, 'LEAVE_APPROVED');
  assert.deepEqual(approved.recipientUids, ['stu-1']);
  assert.equal(approved.title, 'Pengajuan Izin Disetujui');
  assert.match(approved.body, /Sistem Operasi/);
  assert.match(approved.body, /telah disetujui/);
  assert.match(approved.body, /Surat dokter valid/);
  assert.equal(approved.data.route, '/kehadiran');

  const rejected = buildLeaveDecisionNotificationPayload({
    leaveRequestId: 'sesi-1_stu-1',
    studentId: 'stu-1',
    sessionId: 'sesi-1',
    classId: 'cls-1',
    decision: 'rejected',
  });

  assert.equal(rejected.type, 'LEAVE_REJECTED');
  assert.equal(rejected.title, 'Pengajuan Izin Ditolak');
  assert.match(rejected.body, /ditolak/);
});

test('FR-14 & NFR-05: executeLeaveNotificationDispatch delegates to sender and absorbs delivery errors', async () => {
  let captured = null;
  const okResult = await executeLeaveNotificationDispatch(
    {
      leaveRequestId: 'sesi-1_stu-1',
      studentId: 'stu-1',
      sessionId: 'sesi-1',
      classId: 'cls-1',
      decision: 'approved',
    },
    async (payload) => {
      captured = payload;
      return { ok: true, sentCount: 1 };
    },
  );
  assert.equal(okResult.ok, true);
  assert.equal(okResult.sentCount, 1);
  assert.equal(captured?.type, 'LEAVE_APPROVED');

  const failedResult = await executeLeaveNotificationDispatch(
    {
      leaveRequestId: 'sesi-1_stu-1',
      studentId: 'stu-1',
      sessionId: 'sesi-1',
      classId: 'cls-1',
      decision: 'rejected',
    },
    async () => {
      throw new Error('FCM gateway timeout');
    },
  );
  assert.equal(failedResult.ok, false);
  assert.equal(failedResult.sentCount, 0);
  assert.equal(failedResult.skippedReason, 'FCM gateway timeout');
});

test('FR-15: resolveNotificationTargetRoute maps notification types and roles accurately', () => {
  assert.deepEqual(
    resolveNotificationTargetRoute(
      { type: 'SESSION_OPENED', sessionId: 'sesi-42' },
      'student',
    ),
    { pathname: '/presensi', params: { sessionId: 'sesi-42' } },
  );

  assert.deepEqual(
    resolveNotificationTargetRoute(
      { type: 'LEAVE_APPROVED', leaveRequestId: 'sesi-42_stu-1' },
      'student',
    ),
    { pathname: '/kehadiran' },
  );

  assert.deepEqual(
    resolveNotificationTargetRoute(
      { type: 'LEAVE_REJECTED', leaveRequestId: 'sesi-42_stu-1' },
      'student',
    ),
    { pathname: '/kehadiran' },
  );

  assert.deepEqual(
    resolveNotificationTargetRoute(
      { type: 'SCHEDULE_CHANGED', sessionId: 'sesi-42' },
      'student',
    ),
    { pathname: '/schedule/[sessionId]', params: { sessionId: 'sesi-42' } },
  );

  assert.deepEqual(
    resolveNotificationTargetRoute({ route: '/presensi', sessionId: 'sesi-7' }),
    { pathname: '/presensi', params: { sessionId: 'sesi-7' } },
  );

  assert.equal(resolveNotificationTargetRoute({ route: '/unknown-evil' }), null);
  assert.equal(resolveNotificationTargetRoute(null), null);
});
