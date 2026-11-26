import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';

import { buildLeaveRequestDocId } from '../../../types/contracts.ts';
import { parseGeminiClassificationPayload } from '../classify-leave-reason.ts';
import {
  aiStatusLabel,
  isLeaveEligibleStatus,
  sortLeaveRequests,
  validateLeaveReason,
} from '../port.ts';
import {
  formatLeaveSentiment,
  needsLeaveSentimentAnalysis,
  parseLeaveSentiment,
  tryAnalyzeLeaveWithEdom,
} from '../sentiment.ts';

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

test('unrecognized leave sentiment stays distinct from neutral and legacy categories', () => {
  assert.equal(formatLeaveSentiment(parseLeaveSentiment({ model: 'edom-v1', label: 'netral' })), 'Netral');
  assert.equal(formatLeaveSentiment(parseLeaveSentiment({ model: 'edom-v1', label: null })), 'Tidak dapat ditentukan');
  assert.equal(formatLeaveSentiment(parseLeaveSentiment({ model: 'edom-v1', label: 'sakit' })), 'Belum dianalisis');
  assert.equal(parseLeaveSentiment({ model: 'unknown-model', label: 'netral' }), undefined);
});

test('EDOM returns a valid label within its budget and stops at one second', (t) => {
  const originalRequire = Object.getOwnPropertyDescriptor(globalThis, 'require');
  Object.defineProperty(globalThis, 'require', {
    configurable: true,
    value: createRequire(new URL('../sentiment.ts', import.meta.url)),
  });
  t.after(() => {
    if (originalRequire) Object.defineProperty(globalThis, 'require', originalRequire);
    else delete globalThis.require;
  });

  let reads = 0;
  let timeAtCheck = 999;
  t.mock.method(performance, 'now', () => ++reads < 5 ? 0 : timeAtCheck);

  const reason = 'Saya izin karena sakit demam.';
  assert.deepEqual(tryAnalyzeLeaveWithEdom(reason), { model: 'edom-v1', label: 'negatif' });

  reads = 0;
  timeAtCheck = 1_000;
  assert.equal(tryAnalyzeLeaveWithEdom(reason), undefined);
  assert.equal(reads, 5);

  reads = 0;
  timeAtCheck = 999;
  assert.equal(tryAnalyzeLeaveWithEdom('qzxqz qwzxq'), undefined);
});

test('Gemini analysis is needed for missing or unresolved EDOM results', () => {
  assert.equal(needsLeaveSentimentAnalysis(undefined), true);
  assert.equal(needsLeaveSentimentAnalysis(parseLeaveSentiment({ model: 'edom-v1', label: null })), true);
  assert.equal(needsLeaveSentimentAnalysis(parseLeaveSentiment({ model: 'edom-v1', label: 'netral' })), false);
  const gemini = parseLeaveSentiment({ model: 'gemini', label: 'negatif' });
  assert.deepEqual(gemini, { model: 'gemini', label: 'negatif' });
  assert.equal(formatLeaveSentiment(gemini), 'Negatif');
  const geminiUndetermined = parseLeaveSentiment({ model: 'gemini', label: null });
  assert.equal(needsLeaveSentimentAnalysis(geminiUndetermined), false);
  assert.equal(formatLeaveSentiment(geminiUndetermined), 'Tidak dapat ditentukan');
});

test('leave rules restrict decisions to class assistants and limit student updates to AI classification', () => {
  const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
  const leaveMatch = rules.slice(rules.indexOf('match /leaveRequests/{leaveId}'), rules.indexOf('match /{document=**}'));
  const failureHelper = rules.slice(rules.indexOf('function validLeaveClassificationFailure()'), rules.indexOf('match /users/{userId}'));
  const updateStart = leaveMatch.indexOf('allow update:');
  const updateEnd = leaveMatch.indexOf('allow delete:', updateStart);
  assert.notEqual(updateStart, -1);
  assert.notEqual(updateEnd, -1);
  const updateRule = leaveMatch.slice(updateStart, updateEnd);

  assert.match(leaveMatch, /allow create:\s*if hasRole\('student'\) && validLeaveCreate\(leaveId\);/);
  assert.match(
    updateRule,
    /isClassAssistant\(resource\.data\.classId\)[\s\S]*validLeaveDecision\(\)[\s\S]*validLeaveClassificationFailure\(\)[\s\S]*validLeaveClassificationSuccess\(\)/,
  );
  assert.match(
    updateRule,
    /hasRole\('student'\)[\s\S]*request\.auth\.uid == resource\.data\.studentId[\s\S]*validLeaveClassificationFailure\(\)[\s\S]*validLeaveClassificationSuccess\(\)/,
  );
  assert.doesNotMatch(
    updateRule,
    /request\.auth\.uid == resource\.data\.studentId[\s\S]*validLeaveDecision\(\)/,
  );
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

test('classifyLeaveReason runs strictly through Cloud Function without client-side Gemini API key', () => {
  const serviceSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/features/leave/classify-leave-reason.ts'),
    'utf8',
  );
  assert.doesNotMatch(serviceSource, /EXPO_PUBLIC_AI_API_KEY/);
  assert.doesNotMatch(serviceSource, /generativelanguage\.googleapis\.com/);
});
