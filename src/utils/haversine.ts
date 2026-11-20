import type { Coordinates, GeofenceResult } from '@/types';

export const EARTH_RADIUS_METERS = 6_371_000;
export const DEFAULT_ACCURACY_TOLERANCE_METERS = 0;

/**
 * Mengonversi derajat desimal ke radian.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Memvalidasi apakah objek koordinat WGS 84 berisi nilai lintang dan bujur yang sah.
 */
export function isValidCoordinates(
  coords: Pick<Coordinates, 'latitude' | 'longitude'> | null | undefined,
): coords is Coordinates {
  if (!coords) return false;
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    Number.isFinite(coords.latitude) &&
    Number.isFinite(coords.longitude) &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Menghitung jarak lingkaran besar (great-circle distance) antar dua koordinat
 * menggunakan formula Haversine sesuai SRS §9 dalam satuan meter.
 */
export function calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
  if (!isValidCoordinates(from) || !isValidCoordinates(to)) {
    return Number.NaN;
  }

  const phi1 = toRadians(from.latitude);
  const phi2 = toRadians(to.latitude);
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);
  const a =
    sinHalfLat * sinHalfLat +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfLon * sinHalfLon;
  const clampedA = Math.min(1, Math.max(0, a));

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(clampedA));
}

/**
 * Mengevaluasi apakah posisi pengguna berada di dalam radius presensi laboratorium.
 */
export function evaluateGeofence(params: {
  userCoords: Coordinates | null;
  labCoords: Coordinates;
  radiusMeters: number;
  accuracyToleranceMeters?: number;
}): GeofenceResult {
  const { userCoords, labCoords, radiusMeters, accuracyToleranceMeters } = params;

  if (!isValidCoordinates(labCoords)) {
    return {
      isWithinRadius: false,
      distanceMeters: Number.POSITIVE_INFINITY,
      radiusMeters,
      userCoords: null,
      labCoords,
      error: 'Koordinat laboratorium tidak valid.',
    };
  }

  if (typeof radiusMeters !== 'number' || !Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return {
      isWithinRadius: false,
      distanceMeters: Number.POSITIVE_INFINITY,
      radiusMeters,
      userCoords: isValidCoordinates(userCoords) ? userCoords : null,
      labCoords,
      error: 'Radius presensi laboratorium tidak valid.',
    };
  }

  if (!isValidCoordinates(userCoords)) {
    return {
      isWithinRadius: false,
      distanceMeters: Number.POSITIVE_INFINITY,
      radiusMeters,
      userCoords: null,
      labCoords,
      error: 'Koordinat perangkat belum tersedia.',
    };
  }

  const rawDistance = calculateHaversineDistance(userCoords, labCoords);
  if (!Number.isFinite(rawDistance)) {
    return {
      isWithinRadius: false,
      distanceMeters: Number.POSITIVE_INFINITY,
      radiusMeters,
      userCoords,
      labCoords,
      error: 'Gagal menghitung jarak ke laboratorium.',
    };
  }

  const distanceMeters = Math.round(rawDistance * 10) / 10;
  const tolerance =
    typeof accuracyToleranceMeters === 'number' && Number.isFinite(accuracyToleranceMeters)
      ? Math.max(0, accuracyToleranceMeters)
      : DEFAULT_ACCURACY_TOLERANCE_METERS;

  return {
    isWithinRadius: distanceMeters <= radiusMeters + tolerance,
    distanceMeters,
    radiusMeters,
    userCoords,
    labCoords,
    error: null,
  };
}

/**
 * Memformat jarak meter ke teks yang mudah dibaca (meter atau kilometer).
 */
export function formatDistanceMeters(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return '-';
  }
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} meter`;
  }
  return `${(distanceMeters / 1000).toFixed(2).replace('.', ',')} km`;
}
