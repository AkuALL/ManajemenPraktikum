import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const rulesText = fs.readFileSync(RULES_PATH, 'utf8');

function extractBlock(marker) {
  const start = rulesText.indexOf(marker);
  assert.notEqual(start, -1, `Missing rules block: ${marker}`);
  return rulesText.slice(start, start + 1200);
}

test('firestore.rules preserves all required users and attendance rule invariants', () => {
  const usersMatch = extractBlock('match /users/{userId}');
  assert.match(usersMatch, /allow get:\s*if signedIn\(\) && request\.auth\.uid == userId;/);
  assert.match(usersMatch, /allow list:\s*if false;/);
  assert.match(usersMatch, /allow create:\s*if signedIn\(\)[\s\S]*validProfileCreate\(userId\)/);
  assert.match(usersMatch, /allow update:\s*if signedIn\(\)[\s\S]*validProfileUpdate\(\)/);
  assert.match(usersMatch, /allow delete:\s*if false;/);

  const profileHelpers = extractBlock('function validText(');
  assert.match(profileHelpers, /validText\(request\.resource\.data\.displayName,\s*2,\s*100\)/);
  assert.match(profileHelpers, /validText\(request\.resource\.data\.identifier,\s*3,\s*40\)/);
  assert.match(profileHelpers, /request\.resource\.data\.email == request\.auth\.token\.email/);

  const attendanceMatch = extractBlock('match /attendance/{attendanceId}');
  assert.match(
    attendanceMatch,
    /allow get, list:\s*if signedIn\(\)[\s\S]*request\.auth\.uid == resource\.data\.studentId[\s\S]*isClassAssistant\(resource\.data\.classId\)/,
  );
  assert.match(
    attendanceMatch,
    /allow create:\s*if hasRole\('student'\) && validAttendanceCreate\(attendanceId\);/,
  );
  assert.match(attendanceMatch, /allow update, delete:\s*if false;/);

  const attendanceHelper = extractBlock('function validAttendanceCreate(');
  assert.match(
    attendanceHelper,
    /attendanceId == request\.resource\.data\.sessionId \+ '_' \+ request\.auth\.uid/,
  );
  assert.match(attendanceHelper, /isOpenStudentSession\(/);
});

// Pure predicate mirror of AL-owned firestore.rules sections for allow/deny matrix verification.
const SERVER_TIME = 1760000000000;
const VALID_TEXT = (v, min, max) => typeof v === 'string' && v.length >= min && v.length <= max;

function evalUsersRule(op, ctx) {
  const { auth, userId, reqData, existingData } = ctx;
  if (!auth) return false;
  if (op === 'get') return auth.uid === userId;
  if (op === 'list' || op === 'delete') return false;
  if (op === 'create') {
    const keys = Object.keys(reqData).sort();
    const expected = ['createdAt', 'displayName', 'email', 'identifier', 'role', 'uid'];
    return (
      auth.uid === userId &&
      JSON.stringify(keys) === JSON.stringify(expected) &&
      reqData.uid === userId &&
      reqData.email === auth.email &&
      ['student', 'assistant'].includes(reqData.role) &&
      VALID_TEXT(reqData.displayName, 2, 100) &&
      VALID_TEXT(reqData.identifier, 3, 40) &&
      reqData.createdAt === SERVER_TIME
    );
  }
  if (op === 'update') {
    if (auth.uid !== userId || !existingData) return false;
    const changed = Object.keys(reqData).filter((k) => reqData[k] !== existingData[k]);
    return (
      changed.every((k) => ['displayName', 'identifier', 'updatedAt'].includes(k)) &&
      VALID_TEXT(reqData.displayName, 2, 100) &&
      VALID_TEXT(reqData.identifier, 3, 40) &&
      reqData.updatedAt === SERVER_TIME
    );
  }
  return false;
}

function evalAttendanceRule(op, ctx) {
  const { auth, attendanceId, reqData, resourceData, db } = ctx;
  if (!auth) return false;
  const userProfile = db.users[auth.uid];
  const isClassAssistant = (classId) =>
    Boolean(db.classes[classId]?.assistantIds.includes(auth.uid));

  if (op === 'get' || op === 'list') {
    return auth.uid === resourceData.studentId || isClassAssistant(resourceData.classId);
  }
  if (op === 'update' || op === 'delete') return false;
  if (op === 'create') {
    if (userProfile?.role !== 'student') return false;
    const keys = Object.keys(reqData).sort();
    const expected = [
      'attendedAt',
      'classId',
      'sessionId',
      'studentId',
      'studentIdentifier',
      'studentName',
    ];
    const session = db.sessions[reqData.sessionId];
    const member = db.members[`${reqData.classId}:${auth.uid}`];
    return (
      JSON.stringify(keys) === JSON.stringify(expected) &&
      reqData.studentId === auth.uid &&
      attendanceId === `${reqData.sessionId}_${auth.uid}` &&
      reqData.studentName === userProfile.displayName &&
      reqData.studentIdentifier === userProfile.identifier &&
      reqData.attendedAt === SERVER_TIME &&
      member?.role === 'student' &&
      session?.classId === reqData.classId &&
      session?.status === 'open'
    );
  }
  return false;
}

test('users allow/deny matrix covers owner access, role escalation, and field validation', () => {
  const validProfile = {
    uid: 'u1',
    displayName: 'Alfi',
    email: 'alfi@kampus.ac.id',
    role: 'student',
    identifier: '23.11.0001',
    createdAt: SERVER_TIME,
  };

  assert.equal(evalUsersRule('create', { auth: { uid: 'u1', email: 'alfi@kampus.ac.id' }, userId: 'u1', reqData: validProfile }), true);
  assert.equal(evalUsersRule('get', { auth: { uid: 'u1' }, userId: 'u1' }), true);
  assert.equal(
    evalUsersRule('update', {
      auth: { uid: 'u1' },
      userId: 'u1',
      existingData: validProfile,
      reqData: { ...validProfile, displayName: 'Alfi Pratama', updatedAt: SERVER_TIME },
    }),
    true,
  );

  // Denies
  assert.equal(evalUsersRule('get', { auth: null, userId: 'u1' }), false);
  assert.equal(evalUsersRule('get', { auth: { uid: 'u2' }, userId: 'u1' }), false);
  assert.equal(evalUsersRule('list', { auth: { uid: 'u1' }, userId: 'u1' }), false);
  assert.equal(evalUsersRule('delete', { auth: { uid: 'u1' }, userId: 'u1' }), false);
  assert.equal(
    evalUsersRule('create', {
      auth: { uid: 'u1', email: 'alfi@kampus.ac.id' },
      userId: 'u1',
      reqData: { ...validProfile, displayName: 'A' },
    }),
    false,
  );
  assert.equal(
    evalUsersRule('update', {
      auth: { uid: 'u1' },
      userId: 'u1',
      existingData: validProfile,
      reqData: { ...validProfile, role: 'assistant', updatedAt: SERVER_TIME },
    }),
    false,
  );
});

test('attendance allow/deny matrix covers open-session check, membership, deterministic ID, and immutability', () => {
  const db = {
    users: {
      stu1: { role: 'student', displayName: 'Budi', identifier: '23.11.0101' },
      stu2: { role: 'student', displayName: 'Citra', identifier: '23.11.0102' },
      ast1: { role: 'assistant', displayName: 'Asisten', identifier: 'AS-01' },
    },
    classes: {
      c1: { assistantIds: ['ast1'] },
    },
    members: {
      'c1:stu1': { role: 'student' },
    },
    sessions: {
      sOpen: { classId: 'c1', status: 'open' },
      sClosed: { classId: 'c1', status: 'closed' },
    },
  };

  const validDoc = {
    sessionId: 'sOpen',
    classId: 'c1',
    studentId: 'stu1',
    studentName: 'Budi',
    studentIdentifier: '23.11.0101',
    attendedAt: SERVER_TIME,
  };

  // Allows
  assert.equal(
    evalAttendanceRule('create', { auth: { uid: 'stu1' }, attendanceId: 'sOpen_stu1', reqData: validDoc, db }),
    true,
  );
  assert.equal(
    evalAttendanceRule('get', { auth: { uid: 'stu1' }, resourceData: validDoc, db }),
    true,
  );
  assert.equal(
    evalAttendanceRule('list', { auth: { uid: 'ast1' }, resourceData: validDoc, db }),
    true,
  );

  // Denies
  assert.equal(evalAttendanceRule('get', { auth: null, resourceData: validDoc, db }), false);
  assert.equal(evalAttendanceRule('get', { auth: { uid: 'stu2' }, resourceData: validDoc, db }), false);
  assert.equal(evalAttendanceRule('update', { auth: { uid: 'stu1' }, resourceData: validDoc, db }), false);
  assert.equal(evalAttendanceRule('delete', { auth: { uid: 'ast1' }, resourceData: validDoc, db }), false);
  assert.equal(
    evalAttendanceRule('create', { auth: { uid: 'ast1' }, attendanceId: 'sOpen_ast1', reqData: { ...validDoc, studentId: 'ast1' }, db }),
    false,
  );
  assert.equal(
    evalAttendanceRule('create', { auth: { uid: 'stu1' }, attendanceId: 'custom-id', reqData: validDoc, db }),
    false,
  );
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu1' },
      attendanceId: 'sClosed_stu1',
      reqData: { ...validDoc, sessionId: 'sClosed' },
      db,
    }),
    false,
  );
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu2' },
      attendanceId: 'sOpen_stu2',
      reqData: { ...validDoc, studentId: 'stu2', studentName: 'Citra', studentIdentifier: '23.11.0102' },
      db,
    }),
    false,
  );
});
