import type { GeofenceResult, SessionStatusV2 } from '@/types';

export type AttendanceLocationStatus =
  | 'idle'
  | 'requesting-permission'
  | 'acquiring'
  | 'ready'
  | 'permission-denied'
  | 'services-disabled'
  | 'timeout'
  | 'error';

export type AttendanceEligibilityStatus =
  | 'already-attended'
  | 'session-scheduled'
  | 'session-closed'
  | 'gps-permission-denied'
  | 'gps-disabled'
  | 'gps-timeout'
  | 'gps-acquiring'
  | 'gps-error'
  | 'within-radius'
  | 'outside-radius';

export type EligibilityTone = 'success' | 'danger' | 'warning' | 'neutral';

export type AttendanceEligibility = {
  status: AttendanceEligibilityStatus;
  canSubmit: boolean;
  badgeLabel: string;
  headline: string;
  reason: string;
  tone: EligibilityTone;
};

export type DeriveEligibilityInput = {
  alreadyAttended: boolean;
  sessionStatus: SessionStatusV2;
  locationStatus: AttendanceLocationStatus;
  locationError?: string | null;
  geofence: GeofenceResult;
  labName: string;
};

function formatMetersText(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return '-';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} meter`;
  return `${(distanceMeters / 1000).toFixed(2).replace('.', ',')} km`;
}

/**
 * Menurunkan status kelayakan presensi deterministik berdasarkan status kehadiran,
 * status sesi, kondisi sensor GPS, dan hasil validasi geofence.
 */
export function deriveAttendanceEligibility(
  input: DeriveEligibilityInput,
): AttendanceEligibility {
  const {
    alreadyAttended,
    sessionStatus,
    locationStatus,
    locationError,
    geofence,
    labName,
  } = input;

  if (alreadyAttended) {
    return {
      status: 'already-attended',
      canSubmit: false,
      badgeLabel: 'Sudah Presensi',
      headline: 'Kehadiran Anda sudah tercatat',
      reason: 'Presensi hanya dapat dikirim satu kali untuk setiap sesi praktikum.',
      tone: 'success',
    };
  }

  if (sessionStatus === 'scheduled') {
    return {
      status: 'session-scheduled',
      canSubmit: false,
      badgeLabel: 'Sesi Belum Dibuka',
      headline: 'Menunggu sesi dibuka',
      reason:
        'Asisten belum membuka sesi praktikum ini. Presensi hanya dapat dikirim saat sesi berstatus Berlangsung.',
      tone: 'warning',
    };
  }

  if (sessionStatus === 'closed') {
    return {
      status: 'session-closed',
      canSubmit: false,
      badgeLabel: 'Sesi Ditutup',
      headline: 'Sesi praktikum telah selesai',
      reason:
        'Sesi ini sudah ditutup oleh Asisten sehingga presensi baru tidak lagi diterima.',
      tone: 'neutral',
    };
  }

  if (locationStatus === 'permission-denied') {
    return {
      status: 'gps-permission-denied',
      canSubmit: false,
      badgeLabel: 'Izin GPS Ditolak',
      headline: 'Izin lokasi diperlukan untuk presensi',
      reason:
        locationError?.trim() ||
        'Aktifkan izin lokasi aplikasi agar sistem dapat memverifikasi posisi Anda di laboratorium.',
      tone: 'danger',
    };
  }

  if (locationStatus === 'services-disabled') {
    return {
      status: 'gps-disabled',
      canSubmit: false,
      badgeLabel: 'GPS Tidak Aktif',
      headline: 'Layanan lokasi perangkat dimatikan',
      reason:
        locationError?.trim() ||
        'Nyalakan layanan GPS/lokasi di perangkat Anda, lalu tekan Perbarui Koordinat.',
      tone: 'danger',
    };
  }

  if (locationStatus === 'timeout') {
    return {
      status: 'gps-timeout',
      canSubmit: false,
      badgeLabel: 'Sinyal GPS Timeout',
      headline: 'Pembacaan lokasi melewati batas waktu',
      reason:
        locationError?.trim() ||
        'Sinyal GPS lemah atau terhalang gedung. Pindah ke area terbuka lalu tekan Coba Lagi GPS.',
      tone: 'danger',
    };
  }

  if (locationStatus === 'error') {
    return {
      status: 'gps-error',
      canSubmit: false,
      badgeLabel: 'Sinyal GPS Bermasalah',
      headline: 'Koordinat gagal diperoleh',
      reason:
        locationError?.trim() ||
        'Terjadi gangguan saat membaca posisi perangkat. Coba perbarui koordinat.',
      tone: 'danger',
    };
  }

  if (
    locationStatus === 'idle' ||
    locationStatus === 'requesting-permission' ||
    locationStatus === 'acquiring' ||
    !geofence.userCoords
  ) {
    return {
      status: 'gps-acquiring',
      canSubmit: false,
      badgeLabel: 'Mencari Sinyal GPS',
      headline: 'Memperoleh lokasi perangkat...',
      reason:
        'Tunggu sejenak hingga koordinat GPS terkunci untuk memeriksa radius presensi.',
      tone: 'neutral',
    };
  }

  const formattedDist = formatMetersText(geofence.distanceMeters);

  if (geofence.isWithinRadius) {
    return {
      status: 'within-radius',
      canSubmit: true,
      badgeLabel: 'Dalam Radius',
      headline: 'Lokasi terverifikasi, siap presensi',
      reason: `Jarak Anda: ${formattedDist} (Maks: ${geofence.radiusMeters} meter).`,
      tone: 'success',
    };
  }

  const shortage = Math.max(
    1,
    Math.ceil(geofence.distanceMeters - geofence.radiusMeters),
  );

  return {
    status: 'outside-radius',
    canSubmit: false,
    badgeLabel: 'Di Luar Radius',
    headline: 'Posisi Anda di luar radius lab',
    reason: `Jarak Anda: ${formattedDist} (Maks: ${geofence.radiusMeters} meter). Mendekatlah sekitar ${shortage} meter lagi ke ${labName}.`,
    tone: 'danger',
  };
}
