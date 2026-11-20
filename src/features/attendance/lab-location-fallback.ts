import type { PracticumSession } from '@/features/practicum/types';
import type { LabLocation, SessionLocationSummary } from '@/types';

/**
 * Koordinat fallback default laboratorium Informatika (SRS §8.1.1)
 * dipakai sementara bila dokumen sesi/lab dari Firestore belum menyimpan lat/lng.
 */
export const DEFAULT_FALLBACK_LAB: LabLocation = {
  id: 'lab_informatika_default',
  name: 'Laboratorium Informatika',
  building: 'Gedung Informatika',
  latitude: -7.765432,
  longitude: 110.372101,
  radiusMeters: 50,
  isActive: true,
};

export const FALLBACK_LAB_LOCATIONS: LabLocation[] = [
  {
    id: 'lab_sistem_jaringan',
    name: 'Lab Sistem & Jaringan',
    building: 'Gedung Informatika Lt. 3',
    latitude: -7.76538,
    longitude: 110.37214,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_mobile_iot',
    name: 'Lab Mobile & IoT',
    building: 'Gedung Informatika Lt. 2',
    latitude: -7.765432,
    longitude: 110.372101,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_kecerdasan_buatan',
    name: 'Lab Kecerdasan Buatan',
    building: 'Gedung Informatika Lt. 3',
    latitude: -7.76546,
    longitude: 110.37218,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_pemrograman_1',
    name: 'Lab Pemrograman 1',
    building: 'Gedung Informatika Lt. 2',
    latitude: -7.76541,
    longitude: 110.37206,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_basis_data',
    name: 'Lab Basis Data',
    building: 'Gedung Informatika Lt. 2',
    latitude: -7.76549,
    longitude: 110.37209,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_pemrograman_2',
    name: 'Lab Pemrograman 2',
    building: 'Gedung Informatika Lt. 2',
    latitude: -7.76552,
    longitude: 110.37213,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_arsitektur_komputer',
    name: 'Lab Arsitektur Komputer',
    building: 'Gedung Informatika Lt. 1',
    latitude: -7.76539,
    longitude: 110.37202,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_dasar_komputasi',
    name: 'Lab Dasar Komputasi',
    building: 'Gedung Informatika Lt. 1',
    latitude: -7.76547,
    longitude: 110.37204,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_rpl',
    name: 'Lab RPL',
    building: 'Gedung Informatika Lt. 2',
    latitude: -7.765432,
    longitude: 110.372101,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_jarkom_302',
    name: 'Lab Jarkom 302',
    building: 'Gedung Laboratorium Lt. 3',
    latitude: -7.76538,
    longitude: 110.37214,
    radiusMeters: 50,
    isActive: true,
  },
  {
    id: 'lab_komp_2',
    name: 'Lab Komp 2',
    building: 'Gedung Laboratorium Lt. 3',
    latitude: -7.76544,
    longitude: 110.37212,
    radiusMeters: 50,
    isActive: true,
  },
];

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
