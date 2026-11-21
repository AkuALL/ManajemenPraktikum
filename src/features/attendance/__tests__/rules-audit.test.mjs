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
  assert.match(attendanceMatch, /hasRole\('assistant'\) && validAssistantAttendanceCreate\(attendanceId\)/);

  const attendanceHelper = extractBlock('function validAttendanceCreate(', 4000);
  assert.match(
    attendanceHelper,
    /attendanceId == request\.resource\.data\.sessionId \+ '_' \+ request\.auth\.uid/,
  );
  assert.match(attendanceHelper, /isOpenStudentSession\(/);
  assert.match(attendanceHelper, /withinSessionRadius\(request\.resource\.data\.sessionId\)/);
  assert.match(attendanceHelper, /request\.resource\.data\.isWithinRadius == true/);
  assert.match(attendanceHelper, /request\.resource\.data\.latitude is number/);
  assert.match(attendanceHelper, /request\.resource\.data\.longitude is number/);
  assert.match(attendanceHelper, /request\.resource\.data\.distanceMeters >= 0/);
  assert.match(attendanceHelper, /request\.resource\.data\.attendanceMethod == 'qr'/);
  assert.match(attendanceHelper, /data\.expiresAt > request\.time/);

  const withinRadiusHelper = extractBlock('function withinSessionCoords(', 1200);
  assert.match(withinRadiusHelper, /function withinSessionRadius\(sessionId\)/);
  assert.match(withinRadiusHelper, /dLat \* dLat \+ dLng \* dLng <= allowedRadius \* allowedRadius/);
  assert.match(withinRadiusHelper, /request\.resource\.data\.distanceMeters <= allowedRadius/);

  const sessionQrMatch = extractBlock('match /sessionQr/{sessionId}');
  assert.match(sessionQrMatch, /allow get: if hasRole\('assistant'\)/);
  assert.match(sessionQrMatch, /allow list: if hasRole\('assistant'\)/);
  assert.match(sessionQrMatch, /get\(sessionPath\(sessionId\)\)\.data\.status == 'open'/);

  const assistedAttendanceHelper = extractBlock('function validAssistantAttendanceCreate(', 2200);
  assert.match(assistedAttendanceHelper, /attendanceMethod == 'assistant_override'/);
  assert.match(assistedAttendanceHelper, /recordedBy == request\.auth\.uid/);
  assert.match(assistedAttendanceHelper, /assistanceReason/);

  const membersGroupMatch = extractBlock('match /{path=**}/members/{memberId}');
  assert.match(
    membersGroupMatch,
    /allow read:\s*if signedIn\(\)[\s\S]*resource\.data\.userId == currentUserIdentifier\(\)/,
  );

  const classesMatch = extractBlock('match /classes/{classId}', 1600);
  assert.match(
    classesMatch,
    /allow list:\s*if signedIn\(\)[\s\S]*request\.auth\.uid in resource\.data\.assistantIds[\s\S]*currentUserIdentifier\(\) in resource\.data\.memberUids/,
  );
  assert.match(classesMatch, /allow delete:\s*if false;/);
});

test('firestore.rules validates practicum text, session timestamps, and requires a registered student member', () => {
  const classHelper = extractBlock('function validClassCreate()');
  const classUpdateHelper = extractBlock('function validClassUpdate()', 2000);
  const memberHelper = extractBlock('function validMemberCreate(memberId)');
  const memberUpdateHelper = extractBlock('function validMemberUpdate()');
  const sessionHelper = extractBlock('function validSessionCreate()', 1500);
  const masterLabHelper = extractBlock('function matchesMasterLabData(lab)', 1600);
  const sessionTransitionHelper = extractBlock('function validSessionStatusTransition()', 1200);
  const sessionUpdateHelper = extractBlock('function validSessionUpdate()', 3000);
  const sessionsMatch = extractBlock('match /sessions/{sessionId}', 1200);

  assert.match(rulesText, /function labPath\(labId\)/);
  assert.match(masterLabHelper, /lab\.isActive == true/);
  assert.match(masterLabHelper, /request\.resource\.data\.latitude == lab\.latitude/);
  assert.match(masterLabHelper, /request\.resource\.data\.longitude == lab\.longitude/);
  assert.match(masterLabHelper, /request\.resource\.data\.radiusMeters == lab\.radiusMeters/);
  assert.match(masterLabHelper, /function validMasterLabSnapshot\(\)/);
  assert.match(masterLabHelper, /request\.resource\.data\.radiusMeters >= 10/);
  assert.match(masterLabHelper, /exists\(labPath\(request\.resource\.data\.labId\)\)/);
  assert.match(masterLabHelper, /matchesMasterLabData\(get\(labPath\(request\.resource\.data\.labId\)\)\.data\)/);

  assert.match(classHelper, /validText\(request\.resource\.data\.practicumName, 2, 120\)/);
  assert.match(classHelper, /validText\(request\.resource\.data\.className, 2, 80\)/);
  assert.match(classUpdateHelper, /!resource\.data\.get\('archived', false\)/);
  assert.match(classUpdateHelper, /request\.resource\.data\.archived == true/);
  assert.match(classUpdateHelper, /request\.resource\.data\.archivedBy == request\.auth\.uid/);
  assert.match(classUpdateHelper, /request\.resource\.data\.archivedAt == request\.time/);
  assert.match(memberHelper, /request\.resource\.data\.userId == memberId/);
  assert.match(memberHelper, /request\.resource\.data\.identifier == memberId/);
  assert.match(memberHelper, /validText\(request\.resource\.data\.identifier, 3, 40\)/);
  assert.match(memberUpdateHelper, /request\.resource\.data\.identifier == resource\.data\.identifier/);
  assert.match(memberUpdateHelper, /validText\(request\.resource\.data\.identifier, 3, 40\)/);
  assert.match(sessionHelper, /validText\(request\.resource\.data\.title, 2, 140\)/);
  assert.match(sessionHelper, /validText\(request\.resource\.data\.location, 2, 120\)/);
  assert.match(sessionHelper, /request\.resource\.data\.startsAt is timestamp/);
  assert.match(sessionHelper, /request\.resource\.data\.endsAt is timestamp/);
  assert.match(
    sessionHelper,
    /request\.resource\.data\.startsAt >= request\.time - duration\.value\(5, 'm'\)/,
  );
  assert.match(sessionHelper, /validMasterLabSnapshot\(\)/);
  assert.match(
    sessionTransitionHelper,
    /resource\.data\.status == 'scheduled'[\s\S]*request\.resource\.data\.status == 'cancelled'[\s\S]*request\.resource\.data\.cancelledBy == request\.auth\.uid[\s\S]*request\.resource\.data\.cancelledAt == request\.time/,
  );
  assert.match(sessionUpdateHelper, /resource\.data\.status != 'cancelled'/);
  assert.match(sessionUpdateHelper, /request\.resource\.data\.startsAt is timestamp/);
  assert.match(sessionUpdateHelper, /request\.resource\.data\.endsAt is timestamp/);
  assert.match(sessionUpdateHelper, /validMasterLabSnapshot\(\)/);
  assert.match(sessionUpdateHelper, /resource\.data\.status == 'scheduled'/);
  assert.match(
    sessionUpdateHelper,
    /affectedKeys\(\)\.hasOnly\(\[\s*'status',\s*'openedBy',\s*'openedAt',\s*'closedBy',\s*'closedAt',\s*'updatedAt'\s*\]\)/,
  );
  assert.match(sessionsMatch, /allow delete:\s*if false;/);
  assert.match(
    sessionsMatch,
    /!get\(classPath\(request\.resource\.data\.classId\)\)\.data\.get\('archived', false\)/,
  );
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
    const hasValidSessionGeo =
      Boolean(session) &&
      typeof session.latitude === 'number' &&
      typeof session.longitude === 'number' &&
      typeof session.radiusMeters === 'number' &&
      session.radiusMeters > 0;
    let withinRadius = false;
    if (
      hasValidSessionGeo &&
      typeof reqData.latitude === 'number' &&
      typeof reqData.longitude === 'number' &&
      typeof reqData.distanceMeters === 'number'
    ) {
      const dLat = (reqData.latitude - session.latitude) * 111195;
      const dLng = (reqData.longitude - session.longitude) * 111195 * 0.9924;
      const allowedRadius = session.radiusMeters + 1;
      withinRadius =
        dLat * dLat + dLng * dLng <= allowedRadius * allowedRadius &&
        reqData.distanceMeters <= allowedRadius;
    }
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
      session?.status === 'open' &&
      withinRadius
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
      sOpen: {
        classId: 'c1',
        status: 'open',
        latitude: -7.0482375,
        longitude: 110.440765625,
        radiusMeters: 20,
      },
      sNoGeo: { classId: 'c1', status: 'open' },
      sClosed: {
        classId: 'c1',
        status: 'closed',
        latitude: -7.0482375,
        longitude: 110.440765625,
        radiusMeters: 20,
      },
    },
  };

  const validDoc = {
    sessionId: 'sOpen',
    classId: 'c1',
    studentId: 'stu1',
    studentName: 'Budi',
    studentIdentifier: '23.11.0101',
    attendedAt: SERVER_TIME,
    latitude: -7.0482375,
    longitude: 110.440765625,
    accuracy: 8.5,
    distanceMeters: 0,
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
  // Denies spoofed isWithinRadius/distanceMeters when coordinates are ~111m outside lab
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu1' },
      attendanceId: 'sOpen_stu1',
      reqData: {
        ...validDoc,
        latitude: -7.0472375,
        distanceMeters: 5,
        isWithinRadius: true,
      },
      db,
    }),
    false,
  );
  // Denies attendance on session missing server-side geo coordinates/radius
  assert.equal(
    evalAttendanceRule('create', {
      auth: { uid: 'stu1' },
      attendanceId: 'sNoGeo_stu1',
      reqData: { ...validDoc, sessionId: 'sNoGeo' },
      db,
    }),
    false,
  );
});

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function evalClassRule(op, ctx) {
  const { auth, reqData, existingData } = ctx;
  if (!auth) return false;
  if (op === 'delete') return false;
  if (op === 'update') {
    if (!existingData || !existingData.assistantIds?.includes(auth.uid)) return false;
    if (existingData.archived === true) return false;
    const changed = Object.keys(reqData).filter((k) => reqData[k] !== existingData[k]);
    const allowedKeys = [
      'practicumName',
      'className',
      'lab',
      'assistantIds',
      'memberUids',
      'archived',
      'archivedBy',
      'archivedAt',
      'updatedAt',
    ];
    if (!changed.every((k) => allowedKeys.includes(k))) return false;
    const isArchiving = reqData.archived === true;
    const archiveCheck = isArchiving
      ? reqData.archived === true &&
        reqData.archivedBy === auth.uid &&
        reqData.archivedAt === SERVER_TIME &&
        changed.every((k) => ['archived', 'archivedBy', 'archivedAt', 'updatedAt'].includes(k))
      : !changed.some((k) => ['archived', 'archivedBy', 'archivedAt'].includes(k)) &&
        reqData.archivedBy === undefined &&
        reqData.archivedAt === undefined &&
        (reqData.archived === undefined || reqData.archived === false);

    return (
      reqData.createdBy === existingData.createdBy &&
      reqData.createdAt === existingData.createdAt &&
      JSON.stringify(reqData.assistantIds) === JSON.stringify(existingData.assistantIds) &&
      VALID_TEXT(reqData.practicumName, 2, 120) &&
      VALID_TEXT(reqData.className, 2, 80) &&
      archiveCheck &&
      reqData.updatedAt === SERVER_TIME
    );
  }
  return false;
}

function validSessionLocationSnapshotMock(reqData) {
  const keys = ['labId', 'locationName', 'latitude', 'longitude', 'radiusMeters'];
  const hasAny = keys.some((k) => reqData[k] !== undefined);
  if (!hasAny) return true;
  return (
    keys.every((k) => reqData[k] !== undefined) &&
    VALID_TEXT(reqData.labId, 1, 160) &&
    VALID_TEXT(reqData.locationName, 2, 120) &&
    reqData.location === reqData.locationName &&
    typeof reqData.latitude === 'number' &&
    reqData.latitude >= -90 &&
    reqData.latitude <= 90 &&
    typeof reqData.longitude === 'number' &&
    reqData.longitude >= -180 &&
    reqData.longitude <= 180 &&
    typeof reqData.radiusMeters === 'number' &&
    reqData.radiusMeters >= 1 &&
    reqData.radiusMeters <= 500
  );
}

function validMasterLabSnapshotMock(reqData, db) {
  const keys = ['labId', 'locationName', 'latitude', 'longitude', 'radiusMeters'];
  if (!keys.every((k) => reqData[k] !== undefined)) return false;
  if (
    !VALID_TEXT(reqData.labId, 1, 160) ||
    !/^[^/]+$/.test(reqData.labId) ||
    reqData.labId === '.' ||
    reqData.labId === '..' ||
    !VALID_TEXT(reqData.locationName, 2, 120) ||
    reqData.location !== reqData.locationName ||
    typeof reqData.latitude !== 'number' ||
    reqData.latitude < -90 ||
    reqData.latitude > 90 ||
    typeof reqData.longitude !== 'number' ||
    reqData.longitude < -180 ||
    reqData.longitude > 180 ||
    typeof reqData.radiusMeters !== 'number' ||
    reqData.radiusMeters < 10 ||
    reqData.radiusMeters > 500
  ) {
    return false;
  }
  const lab = db?.labs?.[reqData.labId];
  return (
    Boolean(lab) &&
    lab.isActive === true &&
    reqData.locationName === lab.name &&
    reqData.location === lab.name &&
    reqData.latitude === lab.latitude &&
    reqData.longitude === lab.longitude &&
    reqData.radiusMeters === lab.radiusMeters
  );
}

function evalSessionRule(op, ctx) {
  const { auth, reqData, existingData, db } = ctx;
  if (!auth) return false;
  if (op === 'delete') return false;
  const callerRole = db?.users?.[auth.uid]?.role;
  const classDoc = db?.classes?.[reqData?.classId];
  const isClassAssistant = Boolean(classDoc?.assistantIds?.includes(auth.uid));

  if (op === 'create') {
    if (callerRole !== 'assistant' || !isClassAssistant || classDoc?.archived === true) {
      return false;
    }
    return (
      reqData.status === 'scheduled' &&
      reqData.createdBy === auth.uid &&
      VALID_TEXT(reqData.title, 2, 140) &&
      VALID_TEXT(reqData.location, 2, 120) &&
      typeof reqData.startsAt === 'number' &&
      typeof reqData.endsAt === 'number' &&
      reqData.startsAt < reqData.endsAt &&
      reqData.startsAt >= SERVER_TIME - FIVE_MINUTES_MS &&
      reqData.createdAt === SERVER_TIME &&
      reqData.updatedAt === SERVER_TIME &&
      validMasterLabSnapshotMock(reqData, db)
    );
  }

  if (op === 'update') {
    if (!existingData || !db?.classes?.[existingData.classId]?.assistantIds?.includes(auth.uid)) {
      return false;
    }
    if (existingData.status === 'cancelled') return false;
    const changed = Object.keys(reqData).filter((k) => reqData[k] !== existingData[k]);
    const locationChanged = changed.some((k) =>
      ['location', 'labId', 'locationName', 'latitude', 'longitude', 'radiusMeters'].includes(k),
    );
    const lifecycleOnly = changed.every((k) =>
      ['status', 'openedBy', 'openedAt', 'closedBy', 'closedAt', 'updatedAt'].includes(k),
    );
    const cancelOnly =
      reqData.status !== 'cancelled'
        ? reqData.cancelledBy === undefined && reqData.cancelledAt === undefined
        : changed.every((k) => ['status', 'cancelledBy', 'cancelledAt', 'updatedAt'].includes(k));
    const validStatusTransition =
      reqData.status === existingData.status ||
      (existingData.status === 'scheduled' &&
        reqData.status === 'open' &&
        reqData.openedBy === auth.uid &&
        reqData.openedAt === SERVER_TIME) ||
      (existingData.status === 'open' &&
        reqData.status === 'closed' &&
        reqData.closedBy === auth.uid &&
        reqData.closedAt === SERVER_TIME) ||
      (existingData.status === 'scheduled' &&
        reqData.status === 'cancelled' &&
        reqData.cancelledBy === auth.uid &&
        reqData.cancelledAt === SERVER_TIME);

    return (
      reqData.classId === existingData.classId &&
      reqData.createdBy === existingData.createdBy &&
      reqData.createdAt === existingData.createdAt &&
      VALID_TEXT(reqData.title, 2, 140) &&
      VALID_TEXT(reqData.location, 2, 120) &&
      typeof reqData.startsAt === 'number' &&
      typeof reqData.endsAt === 'number' &&
      reqData.startsAt < reqData.endsAt &&
      reqData.updatedAt === SERVER_TIME &&
      ((!locationChanged && validSessionLocationSnapshotMock(reqData)) ||
        validMasterLabSnapshotMock(reqData, db)) &&
      (existingData.status === 'scheduled' || lifecycleOnly) &&
      cancelOnly &&
      validStatusTransition
    );
  }

  return false;
}

test('session create/update rules enforce future startsAt, post-open lock, and Master Lab matching', () => {
  const db = {
    users: { ast1: { role: 'assistant' } },
    classes: { c1: { assistantIds: ['ast1'] } },
    labs: {
      'lab-b': {
        name: 'Lab Informatika B',
        latitude: -7.0482375,
        longitude: 110.440765625,
        radiusMeters: 20,
        isActive: true,
      },
      'lab-c': {
        name: 'Lab Informatika C',
        latitude: -7.0485,
        longitude: 110.441,
        radiusMeters: 25,
        isActive: true,
      },
      'lab-off': {
        name: 'Lab Nonaktif',
        latitude: -7.049,
        longitude: 110.4415,
        radiusMeters: 15,
        isActive: false,
      },
    },
  };
  const baseSession = {
    classId: 'c1',
    title: 'Pertemuan 1',
    location: 'Lab Informatika B',
    labId: 'lab-b',
    locationName: 'Lab Informatika B',
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 20,
    startsAt: SERVER_TIME + 60 * 60 * 1000,
    endsAt: SERVER_TIME + 3 * 60 * 60 * 1000,
    status: 'scheduled',
    createdBy: 'ast1',
    createdAt: SERVER_TIME,
    updatedAt: SERVER_TIME,
  };

  assert.equal(evalSessionRule('create', { auth: { uid: 'ast1' }, reqData: baseSession, db }), true);
  assert.equal(
    evalSessionRule('create', {
      auth: { uid: 'ast1' },
      reqData: { ...baseSession, startsAt: SERVER_TIME - 2 * 60 * 1000 },
      db,
    }),
    true,
  );
  assert.equal(
    evalSessionRule('create', {
      auth: { uid: 'ast1' },
      reqData: { ...baseSession, startsAt: SERVER_TIME - 6 * 60 * 1000 },
      db,
    }),
    false,
  );

  // Master Lab validation on create
  const { labId: _missingLabId, ...sessionWithoutLab } = baseSession;
  assert.equal(
    evalSessionRule('create', { auth: { uid: 'ast1' }, reqData: sessionWithoutLab, db }),
    false,
  );
  assert.equal(
    evalSessionRule('create', {
      auth: { uid: 'ast1' },
      reqData: { ...baseSession, labId: 'lab-unknown' },
      db,
    }),
    false,
  );
  assert.equal(
    evalSessionRule('create', {
      auth: { uid: 'ast1' },
      reqData: { ...baseSession, radiusMeters: 200 },
      db,
    }),
    false,
  );
  assert.equal(
    evalSessionRule('create', {
      auth: { uid: 'ast1' },
      reqData: {
        ...baseSession,
        labId: 'lab-off',
        location: 'Lab Nonaktif',
        locationName: 'Lab Nonaktif',
        latitude: -7.049,
        longitude: 110.4415,
        radiusMeters: 15,
      },
      db,
    }),
    false,
  );

  // Scheduled session permits metadata edit, valid Master Lab switch, and opening
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: baseSession,
      reqData: { ...baseSession, title: 'Pertemuan 1 (Revisi)', updatedAt: SERVER_TIME },
      db,
    }),
    true,
  );
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: baseSession,
      reqData: {
        ...baseSession,
        labId: 'lab-c',
        location: 'Lab Informatika C',
        locationName: 'Lab Informatika C',
        latitude: -7.0485,
        longitude: 110.441,
        radiusMeters: 25,
        updatedAt: SERVER_TIME,
      },
      db,
    }),
    true,
  );
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: baseSession,
      reqData: { ...baseSession, latitude: -7.05, updatedAt: SERVER_TIME },
      db,
    }),
    false,
  );
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: baseSession,
      reqData: {
        ...baseSession,
        status: 'open',
        openedBy: 'ast1',
        openedAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      },
      db,
    }),
    true,
  );

  // Lifecycle transition remains allowed even if Master Lab was later deactivated
  const sessionWithInactiveLab = {
    ...baseSession,
    labId: 'lab-off',
    location: 'Lab Nonaktif',
    locationName: 'Lab Nonaktif',
    latitude: -7.049,
    longitude: 110.4415,
    radiusMeters: 15,
  };
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: sessionWithInactiveLab,
      reqData: {
        ...sessionWithInactiveLab,
        status: 'open',
        openedBy: 'ast1',
        openedAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      },
      db,
    }),
    true,
  );

  // Open session rejects metadata edit, allows closing
  const openSession = {
    ...baseSession,
    status: 'open',
    openedBy: 'ast1',
    openedAt: SERVER_TIME - 1000,
  };
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: openSession,
      reqData: { ...openSession, title: 'Judul Diubah Saat Open', updatedAt: SERVER_TIME },
      db,
    }),
    false,
  );
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: openSession,
      reqData: {
        ...openSession,
        status: 'closed',
        closedBy: 'ast1',
        closedAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      },
      db,
    }),
    true,
  );
});

test('soft-delete rules deny hard deletes and enforce immutable class archive and session cancellation', () => {
  const db = {
    users: { ast1: { role: 'assistant' } },
    labs: {
      'lab-b': {
        name: 'Lab B',
        latitude: -7.0482375,
        longitude: 110.440765625,
        radiusMeters: 20,
        isActive: true,
      },
    },
    classes: {
      cActive: {
        practicumName: 'Sistem Operasi',
        className: 'A1',
        assistantIds: ['ast1'],
        createdBy: 'ast1',
        createdAt: SERVER_TIME - 10000,
        updatedAt: SERVER_TIME - 10000,
      },
      cArchived: {
        practicumName: 'Basis Data',
        className: 'A2',
        assistantIds: ['ast1'],
        archived: true,
        archivedBy: 'ast1',
        archivedAt: SERVER_TIME - 5000,
        createdBy: 'ast1',
        createdAt: SERVER_TIME - 10000,
        updatedAt: SERVER_TIME - 5000,
      },
    },
  };

  // Hard deletes are denied
  assert.equal(evalClassRule('delete', { auth: { uid: 'ast1' }, existingData: db.classes.cActive }), false);
  assert.equal(evalSessionRule('delete', { auth: { uid: 'ast1' }, db }), false);

  // Archiving an active class is allowed when only archive fields + updatedAt change
  assert.equal(
    evalClassRule('update', {
      auth: { uid: 'ast1' },
      existingData: db.classes.cActive,
      reqData: {
        ...db.classes.cActive,
        archived: true,
        archivedBy: 'ast1',
        archivedAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      },
    }),
    true,
  );

  // Archiving while tampering with className is denied
  assert.equal(
    evalClassRule('update', {
      auth: { uid: 'ast1' },
      existingData: db.classes.cActive,
      reqData: {
        ...db.classes.cActive,
        className: 'A1-Tampered',
        archived: true,
        archivedBy: 'ast1',
        archivedAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      },
    }),
    false,
  );

  // Editing or unarchiving an already-archived class is denied
  assert.equal(
    evalClassRule('update', {
      auth: { uid: 'ast1' },
      existingData: db.classes.cArchived,
      reqData: { ...db.classes.cArchived, archived: false, updatedAt: SERVER_TIME },
    }),
    false,
  );

  const scheduledSession = {
    classId: 'cActive',
    title: 'Pertemuan 1',
    location: 'Lab B',
    labId: 'lab-b',
    locationName: 'Lab B',
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 20,
    startsAt: SERVER_TIME + 60 * 60 * 1000,
    endsAt: SERVER_TIME + 2 * 60 * 60 * 1000,
    status: 'scheduled',
    createdBy: 'ast1',
    createdAt: SERVER_TIME - 1000,
    updatedAt: SERVER_TIME - 1000,
  };

  // Creating a session inside an archived class is denied
  assert.equal(
    evalSessionRule('create', {
      auth: { uid: 'ast1' },
      reqData: { ...scheduledSession, classId: 'cArchived', createdAt: SERVER_TIME, updatedAt: SERVER_TIME },
      db,
    }),
    false,
  );

  // Cancelling a scheduled session is allowed
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: scheduledSession,
      reqData: {
        ...scheduledSession,
        status: 'cancelled',
        cancelledBy: 'ast1',
        cancelledAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      },
      db,
    }),
    true,
  );

  // Cancelling an open session is denied
  const openSession = { ...scheduledSession, status: 'open', openedBy: 'ast1', openedAt: SERVER_TIME - 500 };
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: openSession,
      reqData: {
        ...openSession,
        status: 'cancelled',
        cancelledBy: 'ast1',
        cancelledAt: SERVER_TIME,
        updatedAt: SERVER_TIME,
      },
      db,
    }),
    false,
  );

  // Updating an already-cancelled session is denied
  const cancelledSession = {
    ...scheduledSession,
    status: 'cancelled',
    cancelledBy: 'ast1',
    cancelledAt: SERVER_TIME - 500,
  };
  assert.equal(
    evalSessionRule('update', {
      auth: { uid: 'ast1' },
      existingData: cancelledSession,
      reqData: { ...cancelledSession, status: 'scheduled', updatedAt: SERVER_TIME },
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
