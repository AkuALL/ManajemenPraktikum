import type { PracticumSession } from '@/features/practicum/types';
import type { LabLocation, SessionLocationSummary } from '@/types';

/**
 * Koordinat fallback default laboratorium FSM UNDIP (selaras dengan fsm-undip-labs.ts)
 * dipakai sementara bila dokumen sesi/lab dari Firestore belum tersedia atau belum punya koordinat.
 */
export const FALLBACK_LAB_LOCATIONS: LabLocation[] = [
  {
    id: 'lab-informatika-b',
    name: 'Lab Informatika B',
    building: 'Gedung E FSM UNDIP',
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 10,
    isActive: true,
  },
  {
    id: 'lab-informatika-c',
    name: 'Lab Informatika C',
    building: 'Gedung E FSM UNDIP',
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 10,
    isActive: true,
  },
  {
    id: 'lab-informatika-d',
    name: 'Lab Informatika D',
    building: 'Gedung E FSM UNDIP',
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 10,
    isActive: true,
  },
  {
    id: 'dekanat-fsm',
    name: 'Dekanat FSM UNDIP',
    building: 'Gedung Dekanat FSM UNDIP',
    latitude: -7.0490375,
    longitude: 110.441484375,
    radiusMeters: 10,
    isActive: true,
  },
];

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

function findMatchingLab(
  labs: readonly LabLocation[],
  labId: string | undefined,
  locationText: string | undefined,
): LabLocation | undefined {
  if (labId) {
    const byId = labs.find((lab) => lab.id === labId);
    if (byId) return byId;
  }

  const normalized = (locationText ?? '').trim().toLowerCase();
  if (!normalized) return undefined;

  const exact = labs.find((lab) => lab.name.toLowerCase() === normalized);
  if (exact) return exact;

  return labs.find(
    (lab) =>
      normalized.includes(lab.name.toLowerCase()) ||
      lab.name.toLowerCase().includes(normalized),
  );
}

export type ResolvedSessionLocation = {
  summary: SessionLocationSummary;
  isFallbackCoords: boolean;
  building: string;
};

/**
 * Mengambil koordinat dan radius lokasi sesi dengan urutan prioritas:
 * 1) Master data koleksi `labs` Firestore (real-time bila tersedia),
 * 2) Koordinat yang tersimpan pada dokumen `sessions/{sessionId}`,
 * 3) Koordinat fallback lokal sementara.
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
  liveLabs?: readonly LabLocation[],
): ResolvedSessionLocation {
  const locationQuery = session.locationName ?? session.location;
  const matchedLiveLab = liveLabs?.length
    ? findMatchingLab(liveLabs, session.labId, locationQuery)
    : undefined;
  const matchedFallback =
    findMatchingLab(FALLBACK_LAB_LOCATIONS, session.labId, locationQuery) ??
    DEFAULT_FALLBACK_LAB;

  const resolvedName =
    matchedLiveLab?.name ??
    (session.locationName?.trim() || session.location?.trim() || matchedFallback.name);

  if (matchedLiveLab && isFiniteCoordinatePair(matchedLiveLab.latitude, matchedLiveLab.longitude)) {
    const liveRadius =
      typeof matchedLiveLab.radiusMeters === 'number' &&
      Number.isFinite(matchedLiveLab.radiusMeters) &&
      matchedLiveLab.radiusMeters > 0
        ? matchedLiveLab.radiusMeters
        : matchedFallback.radiusMeters;

    return {
      summary: {
        sessionId: session.id,
        classId: session.classId,
        title: session.title,
        labId: matchedLiveLab.id,
        locationName: resolvedName,
        latitude: matchedLiveLab.latitude,
        longitude: matchedLiveLab.longitude,
        radiusMeters: liveRadius,
        status: session.status,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      },
      isFallbackCoords: false,
      building: matchedLiveLab.building,
    };
  }

  const hasSessionCoords = isFiniteCoordinatePair(session.latitude, session.longitude);
  const validRadius =
    typeof session.radiusMeters === 'number' &&
    Number.isFinite(session.radiusMeters) &&
    session.radiusMeters > 0
      ? session.radiusMeters
      : matchedFallback.radiusMeters;

  if (hasSessionCoords) {
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
