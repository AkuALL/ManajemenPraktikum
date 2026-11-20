import type { PracticumSession } from '@/features/practicum/types';
import type { LabLocation, SessionLocationSummary } from '@/types';
import { FSM_UNDIP_LABS } from '@/features/labs/fsm-undip-labs';

/**
 * Koordinat fallback default laboratorium Informatika (SRS §8.1.1)
 * dipakai sementara bila dokumen sesi/lab dari Firestore belum menyimpan lat/lng.
 */
export const FALLBACK_LAB_LOCATIONS: LabLocation[] = FSM_UNDIP_LABS.map(
  ({ id, name, building, latitude, longitude, radiusMeters, isActive }) => ({
    id,
    name,
    building,
    latitude,
    longitude,
    radiusMeters,
    isActive,
  }),
);

export const DEFAULT_FALLBACK_LAB: LabLocation = FALLBACK_LAB_LOCATIONS[0];

function isFiniteCoordinatePair(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function matchFallbackLab(locationText: string | undefined): LabLocation {
  const normalized = (locationText ?? '').trim().toLowerCase();
  if (!normalized) return DEFAULT_FALLBACK_LAB;

  const exact = FALLBACK_LAB_LOCATIONS.find(
    (lab) => lab.name.toLowerCase() === normalized,
  );
  if (exact) return exact;

  const partial = FALLBACK_LAB_LOCATIONS.find(
    (lab) =>
      normalized.includes(lab.name.toLowerCase()) ||
      lab.name.toLowerCase().includes(normalized),
  );
  return partial ?? DEFAULT_FALLBACK_LAB;
}

export type ResolvedSessionLocation = {
  summary: SessionLocationSummary;
  isFallbackCoords: boolean;
  building: string;
};

/**
 * Mengambil koordinat dan radius lokasi sesi dari Firestore bila sudah tersedia,
 * atau memakai fallback koordinat lab sementara bila belum ada data dari Master Lab.
 */
export function resolveSessionLocationSummary(
  session: Pick<
    PracticumSession,
    | 'id'
    | 'classId'
    | 'title'
    | 'location'
    | 'status'
    | 'startsAt'
    | 'endsAt'
    | 'labId'
    | 'locationName'
    | 'latitude'
    | 'longitude'
    | 'radiusMeters'
  >,
): ResolvedSessionLocation {
  const matchedFallback = matchFallbackLab(session.locationName ?? session.location);
  const hasRealCoords = isFiniteCoordinatePair(session.latitude, session.longitude);
  const validRadius =
    typeof session.radiusMeters === 'number' &&
    Number.isFinite(session.radiusMeters) &&
    session.radiusMeters > 0
      ? session.radiusMeters
      : matchedFallback.radiusMeters;

  const resolvedName =
    session.locationName?.trim() || session.location?.trim() || matchedFallback.name;

  if (hasRealCoords) {
    return {
      summary: {
        sessionId: session.id,
        classId: session.classId,
        title: session.title,
        labId: session.labId ?? matchedFallback.id,
        locationName: resolvedName,
        latitude: session.latitude!,
        longitude: session.longitude!,
        radiusMeters: validRadius,
        status: session.status,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      },
      isFallbackCoords: false,
      building: matchedFallback.building,
    };
  }

  return {
    summary: {
      sessionId: session.id,
      classId: session.classId,
      title: session.title,
      labId: session.labId ?? matchedFallback.id,
      locationName: resolvedName,
      latitude: matchedFallback.latitude,
      longitude: matchedFallback.longitude,
      radiusMeters: validRadius,
      status: session.status,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
    },
    isFallbackCoords: true,
    building: matchedFallback.building,
  };
}
