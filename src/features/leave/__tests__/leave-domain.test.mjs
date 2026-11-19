import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildLeaveRequestDocId } from '../../../types/contracts.ts';
import { parseGeminiClassificationPayload } from '../../../services/classify-leave-reason.ts';
import {
  aiStatusLabel,
  isLeaveEligibleStatus,
  sortLeaveRequests,
  validateLeaveReason,
} from '../port.ts';

test('leave request uses deterministic {sessionId}_{studentId} IDs and validates reasons', () => {
  assert.equal(buildLeaveRequestDocId('sesi-01', 'student-01'), 'sesi-01_student-01');
  assert.equal(validateLeaveReason('izin'), 'Alasan izin minimal 5 karakter.');
  assert.equal(validateLeaveReason('x'.repeat(1001)), 'Alasan izin maksimal 1000 karakter.');
  assert.equal(validateLeaveReason('Sakit demam.'), null);
});

test('only scheduled and open sessions are eligible for leave requests', () => {
  assert.equal(isLeaveEligibleStatus('scheduled'), true);
  assert.equal(isLeaveEligibleStatus('open'), true);
  assert.equal(isLeaveEligibleStatus('closed'), false);
});

test('leave requests sort newest first and AI labels remain informational', () => {
  const entries = [
    { id: 'old', createdAtMs: 100, sessionId: 's1', classId: 'c1', studentId: 'u1', reason: 'Sakit', status: 'pending', aiStatus: 'pending', aiClassifiedAtMs: null, reviewedAtMs: null, updatedAtMs: 100 },
    { id: 'new', createdAtMs: 200, sessionId: 's2', classId: 'c1', studentId: 'u1', reason: 'Keluarga', status: 'pending', aiStatus: 'success', aiClassifiedAtMs: 200, reviewedAtMs: null, updatedAtMs: 200 },
  ];
  assert.deepEqual(sortLeaveRequests(entries).map((entry) => entry.id), ['new', 'old']);
  assert.equal(aiStatusLabel('success'), 'Klasifikasi AI tersedia');
});

test('leave rules preserve owner-only AI updates and assistant-only decisions', () => {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const leaveMatch = rules.slice(rules.indexOf('match /leaveRequests/{leaveId}'), rules.indexOf('match /{document=**}'));
  const failureHelper = rules.slice(rules.indexOf('function validLeaveClassificationFailure()'), rules.indexOf('match /users/{userId}'));

  assert.match(leaveMatch, /allow create:\s*if hasRole\('student'\) && validLeaveCreate\(leaveId\);/);
  assert.match(leaveMatch, /isClassAssistant\(resource\.data\.classId\)[\s\S]*validLeaveDecision\(\)/);
  assert.match(leaveMatch, /request\.auth\.uid == resource\.data\.studentId[\s\S]*validLeaveClassificationFailure\(\)[\s\S]*validLeaveClassificationSuccess\(\)/);
  assert.match(failureHelper, /resource\.data\.aiStatus == 'pending'/);
  assert.match(failureHelper, /request\.resource\.data\.aiStatus == 'failed'/);
  assert.match(failureHelper, /function validLeaveClassificationSuccess\(\)/);
  assert.match(failureHelper, /request\.resource\.data\.aiStatus == 'success'/);
  assert.match(failureHelper, /request\.resource\.data\.aiConfidence >= 0/);
});

test('parseGeminiClassificationPayload validates category, clamps confidence, and rejects bad JSON', () => {
  assert.deepEqual(
    parseGeminiClassificationPayload('{"category":"sakit","confidence":0.95}'),
    { category: 'sakit', confidence: 0.95 },
  );
  assert.deepEqual(
    parseGeminiClassificationPayload('{"category":"akademik","confidence":1.4}'),
    { category: 'akademik', confidence: 1 },
  );
  assert.equal(parseGeminiClassificationPayload('{"category":"invalid","confidence":0.5}'), null);
  assert.equal(parseGeminiClassificationPayload('not-json'), null);
});
