import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateHaversineDistance,
  EARTH_RADIUS_METERS,
  evaluateGeofence,
  formatDistanceMeters,
  isValidCoordinates,
} from '../../../utils/haversine.ts';
import { deriveAttendanceEligibility } from '../eligibility.ts';
import {
  DEFAULT_FALLBACK_LAB,
  resolveSessionLocationSummary,
} from '../lab-location-fallback.ts';

const LAB_COORDS = {
  latitude: -7.765432,
  longitude: 110.372101,
};

test('isValidCoordinates validates WGS 84 bounds and rejects non-finite inputs', () => {
  assert.equal(isValidCoordinates(LAB_COORDS), true);
  assert.equal(isValidCoordinates({ latitude: 90, longitude: -180 }), true);
  assert.equal(isValidCoordinates({ latitude: 90.001, longitude: 110 }), false);
  assert.equal(isValidCoordinates({ latitude: -7.7, longitude: 180.1 }), false);
  assert.equal(isValidCoordinates({ latitude: Number.NaN, longitude: 110 }), false);
  assert.equal(isValidCoordinates(null), false);
});

test('calculateHaversineDistance computes 0 for identical points, short distances, 1-degree meridian, and NaN for invalid', () => {
  assert.equal(calculateHaversineDistance(LAB_COORDS, LAB_COORDS), 0);

  // ~24 meter north of LAB_COORDS
  const nearPoint = { latitude: -7.765216, longitude: 110.372101 };
  const nearDist = calculateHaversineDistance(LAB_COORDS, nearPoint);
  assert.ok(nearDist >= 23 && nearDist <= 25, `Expected ~24m, got ${nearDist}`);

  // ~120 meter north of LAB_COORDS
  const farPoint = { latitude: -7.764353, longitude: 110.372101 };
  const farDist = calculateHaversineDistance(LAB_COORDS, farPoint);
  assert.ok(farDist >= 118 && farDist <= 122, `Expected ~120m, got ${farDist}`);

  // 1 degree along equator/meridian = pi * R / 180 ≈ 111,194.9 m
  const oneDegreeDist = calculateHaversineDistance(
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  );
  const expectedOneDeg = (Math.PI / 180) * EARTH_RADIUS_METERS;
  const relError = Math.abs(oneDegreeDist - expectedOneDeg) / expectedOneDeg;
  assert.ok(relError < 0.005, `Expected <0.5% error, got ${relError}`);

  assert.equal(
    Number.isNaN(
      calculateHaversineDistance(LAB_COORDS, { latitude: 120, longitude: 110 }),
    ),
    true,
  );
});

test('evaluateGeofence checks inside, boundary, outside, null userCoords, tolerance, and invalid lab/radius', () => {
  const inside = evaluateGeofence({
    userCoords: { latitude: -7.765216, longitude: 110.372101, accuracy: 8 },
    labCoords: LAB_COORDS,
    radiusMeters: 50,
  });
  assert.equal(inside.isWithinRadius, true);
  assert.equal(inside.error, null);
  assert.ok(inside.distanceMeters <= 25);

  // Exact boundary check: distance ≈ 50.0 m (0.00044966 deg ≈ 50.0m)
  const exact50Delta = (50 / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const boundary = evaluateGeofence({
    userCoords: { latitude: LAB_COORDS.latitude + exact50Delta, longitude: LAB_COORDS.longitude },
    labCoords: LAB_COORDS,
    radiusMeters: 50,
  });
  assert.equal(boundary.distanceMeters, 50);
  assert.equal(boundary.isWithinRadius, true);

  const outside = evaluateGeofence({
    userCoords: { latitude: -7.764353, longitude: 110.372101 },
    labCoords: LAB_COORDS,
    radiusMeters: 50,
  });
  assert.equal(outside.isWithinRadius, false);
  assert.ok(outside.distanceMeters > 100);
  assert.equal(outside.error, null);

  // Tolerance allows slightly outside coordinates when configured per SRS §9
  const tolerated = evaluateGeofence({
    userCoords: { latitude: -7.76489, longitude: 110.372101 }, // ~60.3m
    labCoords: LAB_COORDS,
    radiusMeters: 50,
    accuracyToleranceMeters: 15,
  });
  assert.equal(tolerated.isWithinRadius, true);

  const nullUser = evaluateGeofence({
    userCoords: null,
    labCoords: LAB_COORDS,
    radiusMeters: 50,
  });
  assert.equal(nullUser.isWithinRadius, false);
  assert.equal(nullUser.distanceMeters, Number.POSITIVE_INFINITY);
  assert.ok(nullUser.error);

  const badRadius = evaluateGeofence({
    userCoords: LAB_COORDS,
    labCoords: LAB_COORDS,
    radiusMeters: 0,
  });
  assert.equal(badRadius.isWithinRadius, false);
  assert.ok(badRadius.error);
});

test('formatDistanceMeters formats meters, kilometers, and non-finite inputs', () => {
  assert.equal(formatDistanceMeters(24.4), '24 meter');
  assert.equal(formatDistanceMeters(1250), '1,25 km');
  assert.equal(formatDistanceMeters(Number.POSITIVE_INFINITY), '-');
  assert.equal(formatDistanceMeters(-5), '-');
});

test('resolveSessionLocationSummary prefers live labs, then session coords, then FSM fallback', () => {
  const liveLabs = [
    {
      id: 'lab-informatika-b',
      name: 'Lab Informatika B',
      building: 'Gedung E FSM UNDIP',
      latitude: -7.0485,
      longitude: 110.4409,
      radiusMeters: 25,
      isActive: true,
    },
  ];

  const withLiveLab = resolveSessionLocationSummary(
    {
      id: 'sess-live',
      classId: 'cls-1',
      title: 'Modul 1',
      location: 'Lab Informatika B',
      status: 'open',
      startsAt: '2026-11-20T08:00:00.000Z',
      endsAt: '2026-11-20T10:00:00.000Z',
    },
    liveLabs,
  );
  assert.equal(withLiveLab.isFallbackCoords, false);
  assert.equal(withLiveLab.summary.latitude, -7.0485);
  assert.equal(withLiveLab.summary.radiusMeters, 25);

  const withRealCoords = resolveSessionLocationSummary({
    id: 'sess-1',
    classId: 'cls-1',
    title: 'Modul 3',
    location: 'Lab RPL',
    labId: 'lab_rpl_custom',
    locationName: 'Lab RPL Gedung C',
    latitude: -7.7701,
    longitude: 110.3802,
    radiusMeters: 35,
    status: 'open',
    startsAt: '2026-11-20T08:00:00.000Z',
    endsAt: '2026-11-20T10:00:00.000Z',
  });
  assert.equal(withRealCoords.isFallbackCoords, false);
  assert.equal(withRealCoords.summary.latitude, -7.7701);
  assert.equal(withRealCoords.summary.longitude, 110.3802);
  assert.equal(withRealCoords.summary.radiusMeters, 35);
  assert.equal(withRealCoords.summary.locationName, 'Lab RPL Gedung C');

  const withNamedFallback = resolveSessionLocationSummary({
    id: 'sess-2',
    classId: 'cls-2',
    title: 'Modul 1',
    location: 'Lab Informatika C',
    status: 'open',
    startsAt: '2026-11-20T08:00:00.000Z',
    endsAt: '2026-11-20T10:00:00.000Z',
  });
  assert.equal(withNamedFallback.isFallbackCoords, true);
  assert.equal(withNamedFallback.summary.labId, 'lab-informatika-c');
  assert.equal(withNamedFallback.summary.radiusMeters, 10);

  const withDefaultFallback = resolveSessionLocationSummary({
    id: 'sess-3',
    classId: 'cls-3',
    title: 'Modul 2',
    location: 'Ruang Baru XYZ',
    status: 'scheduled',
    startsAt: '2026-11-20T08:00:00.000Z',
    endsAt: '2026-11-20T10:00:00.000Z',
  });
  assert.equal(withDefaultFallback.isFallbackCoords, true);
  assert.equal(withDefaultFallback.summary.latitude, DEFAULT_FALLBACK_LAB.latitude);
  assert.equal(withDefaultFallback.summary.longitude, DEFAULT_FALLBACK_LAB.longitude);
  assert.equal(withDefaultFallback.summary.locationName, 'Ruang Baru XYZ');
});

test('deriveAttendanceEligibility handles full 9-state matrix and enables submit only when within radius on open session', () => {
  const insideGeofence = evaluateGeofence({
    userCoords: { latitude: -7.765216, longitude: 110.372101, accuracy: 8 },
    labCoords: LAB_COORDS,
    radiusMeters: 50,
  });
  const outsideGeofence = evaluateGeofence({
    userCoords: { latitude: -7.764353, longitude: 110.372101, accuracy: 8 },
    labCoords: LAB_COORDS,
    radiusMeters: 50,
  });
  const emptyGeofence = evaluateGeofence({
    userCoords: null,
    labCoords: LAB_COORDS,
    radiusMeters: 50,
  });

  const base = {
    alreadyAttended: false,
    sessionStatus: 'open',
    locationStatus: 'ready',
    locationError: null,
    geofence: insideGeofence,
    labName: 'Lab RPL',
  };

  const cases = [
    {
      name: 'already-attended',
      input: { ...base, alreadyAttended: true },
      expectedStatus: 'already-attended',
      expectedCanSubmit: false,
    },
    {
      name: 'session-scheduled',
      input: { ...base, sessionStatus: 'scheduled' },
      expectedStatus: 'session-scheduled',
      expectedCanSubmit: false,
    },
    {
      name: 'session-closed',
      input: { ...base, sessionStatus: 'closed' },
      expectedStatus: 'session-closed',
      expectedCanSubmit: false,
    },
    {
      name: 'gps-permission-denied',
      input: { ...base, locationStatus: 'permission-denied', geofence: emptyGeofence },
      expectedStatus: 'gps-permission-denied',
      expectedCanSubmit: false,
    },
    {
      name: 'gps-disabled',
      input: { ...base, locationStatus: 'services-disabled', geofence: emptyGeofence },
      expectedStatus: 'gps-disabled',
      expectedCanSubmit: false,
    },
    {
      name: 'gps-timeout',
      input: { ...base, locationStatus: 'timeout', geofence: emptyGeofence },
      expectedStatus: 'gps-timeout',
      expectedCanSubmit: false,
    },
    {
      name: 'gps-error',
      input: { ...base, locationStatus: 'error', geofence: emptyGeofence },
      expectedStatus: 'gps-error',
      expectedCanSubmit: false,
    },
    {
      name: 'gps-acquiring',
      input: { ...base, locationStatus: 'acquiring', geofence: emptyGeofence },
      expectedStatus: 'gps-acquiring',
      expectedCanSubmit: false,
    },
    {
      name: 'outside-radius',
      input: { ...base, geofence: outsideGeofence },
      expectedStatus: 'outside-radius',
      expectedCanSubmit: false,
    },
    {
      name: 'within-radius',
      input: { ...base },
      expectedStatus: 'within-radius',
      expectedCanSubmit: true,
    },
  ];

  for (const item of cases) {
    const result = deriveAttendanceEligibility(item.input);
    assert.equal(result.status, item.expectedStatus, `Failed status for ${item.name}`);
    assert.equal(result.canSubmit, item.expectedCanSubmit, `Failed canSubmit for ${item.name}`);
  }
});
