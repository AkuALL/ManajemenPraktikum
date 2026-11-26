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
import { formatLeaveSentiment, parseLeaveSentiment } from '../sentiment.ts';

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
  assert.deepEqual(parseLeaveSentiment({ model: 'gemini', label: 'netral' }), { model: 'gemini', label: 'netral' });
  assert.equal(formatLeaveSentiment(parseLeaveSentiment({ model: 'edom-v1', label: 'sakit' })), 'Belum dianalisis');
  assert.equal(parseLeaveSentiment({ model: 'unknown-model', label: 'netral' }), undefined);
});

test('Gemini fallback sends the reason as text and accepts only sentiment labels', async (t) => {
  const originalKey = process.env.EXPO_PUBLIC_AI_API_KEY;
  process.env.EXPO_PUBLIC_AI_API_KEY = 'fixture-key';
  t.after(() => {
    if (originalKey === undefined) delete process.env.EXPO_PUBLIC_AI_API_KEY;
    else process.env.EXPO_PUBLIC_AI_API_KEY = originalKey;
  });

  const { classifyLeaveSentimentWithGemini } = await import('../../../services/classify-leave-reason.ts?sentiment-fixture');
  let label = 'netral';
  const fetch = t.mock.method(globalThis, 'fetch', async (url, request) => {
    assert.match(url, /:generateContent$/);
    assert.equal(request.headers['x-goog-api-key'], 'fixture-key');
    assert.deepEqual(JSON.parse(request.body).contents, [
      { role: 'user', parts: [{ text: 'Alasan contoh.' }] },
    ]);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ label }) }] } }] });
  });

  assert.deepEqual(await classifyLeaveSentimentWithGemini('  Alasan contoh.  '), { label: 'netral' });
  label = 'tidak_dapat_ditentukan';
  assert.deepEqual(await classifyLeaveSentimentWithGemini('Alasan contoh.'), { label: null });
  label = 'sakit';
  await assert.rejects(classifyLeaveSentimentWithGemini('Alasan contoh.'), /kontrak klasifikasi/);
  assert.equal(fetch.mock.callCount(), 3);
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
    path.resolve(process.cwd(), 'src/services/classify-leave-reason.ts'),
    'utf8',
  );
  assert.doesNotMatch(serviceSource, /EXPO_PUBLIC_AI_API_KEY/);
  assert.doesNotMatch(serviceSource, /generativelanguage\.googleapis\.com/);
});
