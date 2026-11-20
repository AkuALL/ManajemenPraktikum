import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');
const rulesText = fs.readFileSync(RULES_PATH, 'utf8');

function extractBlock(marker, length = 1200) {
  const start = rulesText.indexOf(marker);
  assert.notEqual(start, -1, `Missing rules block: ${marker}`);
  return rulesText.slice(start, start + length);
}

test('firestore.rules preserves all required users and attendance rule invariants', () => {
  const usersMatch = extractBlock('match /users/{userId}');
  assert.match(
    usersMatch,
    /allow get:\s*if signedIn\(\)[\s\S]*request\.auth\.uid == userId[\s\S]*hasRole\('assistant'\) && resource\.data\.role == 'student'/,
  );
  assert.match(usersMatch, /allow list:\s*if hasRole\('assistant'\) && resource\.data\.role == 'student';/);
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

  const attendanceHelper = extractBlock('function validAttendanceCreate(', 2200);
  assert.match(
    attendanceHelper,
    /attendanceId == request\.resource\.data\.sessionId \+ '_' \+ request\.auth\.uid/,
  );
  assert.match(attendanceHelper, /isOpenStudentSession\(/);
  assert.match(attendanceHelper, /request\.resource\.data\.isWithinRadius == true/);
  assert.match(attendanceHelper, /request\.resource\.data\.latitude is number/);
  assert.match(attendanceHelper, /request\.resource\.data\.longitude is number/);
  assert.match(attendanceHelper, /request\.resource\.data\.distanceMeters >= 0/);

  const membersGroupMatch = extractBlock('match /{path=**}/members/{memberId}');
  assert.match(
    membersGroupMatch,
    /allow read:\s*if signedIn\(\)[\s\S]*resource\.data\.userId == currentUserIdentifier\(\)/,
  );

  const classesMatch = extractBlock('match /classes/{classId}');
  assert.match(
    classesMatch,
    /allow list:\s*if signedIn\(\)[\s\S]*request\.auth\.uid in resource\.data\.assistantIds[\s\S]*currentUserIdentifier\(\) in resource\.data\.memberUids/,
  );
});

test('firestore.rules validates practicum text, session timestamps, and requires a registered student member', () => {
  const classHelper = extractBlock('function validClassCreate()');
  const memberHelper = extractBlock('function validMemberCreate(memberId)');
  const memberUpdateHelper = extractBlock('function validMemberUpdate()');
  const sessionHelper = extractBlock('function validSessionCreate()');
  const sessionUpdateHelper = extractBlock('function validSessionUpdate()');

  assert.match(classHelper, /validText\(request\.resource\.data\.practicumName, 2, 120\)/);
  assert.match(classHelper, /validText\(request\.resource\.data\.className, 2, 80\)/);
  assert.match(memberHelper, /request\.resource\.data\.userId == memberId/);
  assert.match(memberHelper, /request\.resource\.data\.identifier == memberId/);
  assert.match(memberHelper, /validText\(request\.resource\.data\.identifier, 3, 40\)/);
  assert.match(memberUpdateHelper, /request\.resource\.data\.identifier == resource\.data\.identifier/);
  assert.match(memberUpdateHelper, /validText\(request\.resource\.data\.identifier, 3, 40\)/);
  assert.match(sessionHelper, /validText\(request\.resource\.data\.title, 2, 140\)/);
  assert.match(sessionHelper, /validText\(request\.resource\.data\.location, 2, 120\)/);
  assert.match(sessionHelper, /request\.resource\.data\.startsAt is timestamp/);
  assert.match(sessionHelper, /request\.resource\.data\.endsAt is timestamp/);
  assert.match(sessionUpdateHelper, /request\.resource\.data\.startsAt is timestamp/);
  assert.match(sessionUpdateHelper, /request\.resource\.data\.endsAt is timestamp/);
});

// Pure predicate mirror of AL-owned firestore.rules sections for allow/deny matrix verification.
const SERVER_TIME = 1760000000000;
const VALID_TEXT = (v, min, max) => typeof v === 'string' && v.length >= min && v.length <= max;

function evalUsersRule(op, ctx) {
  const { auth, userId, reqData, existingData, resourceData, db } = ctx;
  if (!auth) return false;
  const callerRole = db?.users?.[auth.uid]?.role;
  if (op === 'get') {
    return (
      auth.uid === userId ||
      (callerRole === 'assistant' && resourceData?.role === 'student')
    );
  }
  if (op === 'list') {
    return callerRole === 'assistant' && resourceData?.role === 'student';
  }
  if (op === 'delete') return false;
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
      'accuracy',
      'attendedAt',
      'classId',
      'distanceMeters',
      'isWithinRadius',
      'latitude',
      'longitude',
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
      typeof reqData.latitude === 'number' &&
      reqData.latitude >= -90 &&
      reqData.latitude <= 90 &&
      typeof reqData.longitude === 'number' &&
      reqData.longitude >= -180 &&
      reqData.longitude <= 180 &&
      typeof reqData.accuracy === 'number' &&
      reqData.accuracy >= 0 &&
      typeof reqData.distanceMeters === 'number' &&
      reqData.distanceMeters >= 0 &&
      reqData.isWithinRadius === true &&
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

  // Denies & assistant list student checks
  assert.equal(evalUsersRule('get', { auth: null, userId: 'u1' }), false);
  assert.equal(evalUsersRule('get', { auth: { uid: 'u2' }, userId: 'u1' }), false);
  assert.equal(
    evalUsersRule('list', {
      auth: { uid: 'u1' },
      userId: 'u1',
      resourceData: validProfile,
      db: { users: { u1: { role: 'student' } } },
    }),
    false,
  );
  assert.equal(
    evalUsersRule('list', {
      auth: { uid: 'ast1' },
      userId: 'u1',
      resourceData: validProfile,
      db: { users: { ast1: { role: 'assistant' } } },
    }),
    true,
  );
  assert.equal(
    evalUsersRule('list', {
      auth: { uid: 'ast1' },
      userId: 'ast2',
      resourceData: { ...validProfile, role: 'assistant' },
      db: { users: { ast1: { role: 'assistant' } } },
    }),
    false,
  );
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
    latitude: -7.765432,
    longitude: 110.372101,
    accuracy: 8.5,
    distanceMeters: 12.4,
    isWithinRadius: true,
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
  // Denies missing location audit, outside-radius submission, and invalid coordinates
  const { latitude: _lat, longitude: _lng, ...docWithoutCoords } = validDoc;
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu1' },
      attendanceId: 'sOpen_stu1',
      reqData: docWithoutCoords,
      db,
    }),
    false,
  );
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu1' },
      attendanceId: 'sOpen_stu1',
      reqData: { ...validDoc, isWithinRadius: false, distanceMeters: 120 },
      db,
    }),
    false,
  );
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu1' },
      attendanceId: 'sOpen_stu1',
      reqData: { ...validDoc, latitude: 91 },
      db,
    }),
    false,
  );
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu1' },
      attendanceId: 'sOpen_stu1',
      reqData: { ...validDoc, distanceMeters: -1 },
      db,
    }),
    false,
  );
});

test('firebase.json and firestore.indexes.json configure members.userId COLLECTION_GROUP exemption', () => {
  const firebaseConfig = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'firebase.json'), 'utf8'),
  );
  assert.equal(firebaseConfig.firestore?.indexes, 'firestore.indexes.json');

  const indexesConfig = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'firestore.indexes.json'), 'utf8'),
  );
  const membersOverride = indexesConfig.fieldOverrides?.find(
    (entry) => entry.collectionGroup === 'members' && entry.fieldPath === 'userId',
  );
  assert.ok(membersOverride, 'Missing fieldOverrides entry for members.userId');
  assert.ok(
    membersOverride.indexes?.some(
      (idx) => idx.order === 'ASCENDING' && idx.queryScope === 'COLLECTION_GROUP',
    ),
    'Missing ASCENDING COLLECTION_GROUP index on members.userId',
  );
});
