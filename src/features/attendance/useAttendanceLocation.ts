import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

import type { Coordinates } from '@/types';

import type { AttendanceLocationStatus } from './eligibility';

export const DEFAULT_LOCATION_TIMEOUT_MS = 15_000;

export interface UseAttendanceLocationResult {
  status: AttendanceLocationStatus;
  coords: Coordinates | null;
  lastUpdatedAt: number | null;
  errorMessage: string | null;
  canAskAgain: boolean;
  isRefreshing: boolean;
  refreshLocation: () => Promise<void>;
}

class LocationTimeoutError extends Error {
  constructor(message = 'Waktu tunggu pembacaan GPS habis (timeout).') {
    super(message);
    this.name = 'LocationTimeoutError';
  }
}

function withLocationTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new LocationTimeoutError());
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof LocationTimeoutError) return true;
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 3
  ) {
    return true;
  }
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes('timeout') || msg.includes('timed out');
}

async function checkLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' && 'geolocation' in navigator;
    }
    return false;
  }
}

function toCoordinates(loc: Location.LocationObject): Coordinates {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ?? null,
  };
}

function readLocationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return fallback;
}

/**
 * Hook akuisisi koordinat GPS foreground khusus Halaman Presensi Mandiri (FR-02).
 * Membersihkan subscription watchPositionAsync secara otomatis saat unmount.
 */
export function useAttendanceLocation(
  enabled = true,
): UseAttendanceLocationResult {
  const [status, setStatus] = useState<AttendanceLocationStatus>(
    enabled ? 'requesting-permission' : 'idle',
  );
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watchEpoch, setWatchEpoch] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let activeSub: Location.LocationSubscription | null = null;
    let acquireTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let hasPositionFix = false;

    const clearAcquireTimer = () => {
      if (acquireTimeoutTimer !== null) {
        clearTimeout(acquireTimeoutTimer);
        acquireTimeoutTimer = null;
      }
    };

    async function startLocationTracking() {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        setCanAskAgain(perm.canAskAgain ?? true);
        if (perm.status !== 'granted') {
          setStatus('permission-denied');
          setErrorMessage(
            'Izin akses lokasi ditolak. Aktifkan izin lokasi di Pengaturan untuk melakukan presensi.',
          );
          return;
        }

        const servicesEnabled = await checkLocationServicesEnabled();
        if (cancelled) return;

        if (!servicesEnabled) {
          setStatus('services-disabled');
          setErrorMessage(
            'Layanan GPS/lokasi perangkat sedang tidak aktif. Aktifkan GPS lalu coba lagi.',
          );
          return;
        }

        setStatus((prev) => (prev === 'ready' ? prev : 'acquiring'));
        setErrorMessage(null);

        acquireTimeoutTimer = setTimeout(() => {
          if (cancelled || hasPositionFix) return;
          setStatus('timeout');
          setErrorMessage(
            'Sinyal GPS belum terkunci dalam 15 detik. Pindah ke area terbuka lalu tekan Coba Lagi GPS.',
          );
        }, DEFAULT_LOCATION_TIMEOUT_MS);

        try {
          const initial = await withLocationTimeout(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            }),
            DEFAULT_LOCATION_TIMEOUT_MS,
          );
          if (cancelled) return;
          hasPositionFix = true;
          clearAcquireTimer();
          setCoords(toCoordinates(initial));
          setLastUpdatedAt(initial.timestamp || Date.now());
          setStatus('ready');
          setErrorMessage(null);
        } catch {
          // Lanjutkan ke watchPositionAsync; bila timeout/error tetap terjadi, timer atau errorHandler menangani.
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 2,
          },
          (loc) => {
            if (cancelled) return;
            hasPositionFix = true;
            clearAcquireTimer();
            setCoords(toCoordinates(loc));
            setLastUpdatedAt(loc.timestamp || Date.now());
            setStatus('ready');
            setErrorMessage(null);
          },
          (reason) => {
            if (cancelled) return;
            clearAcquireTimer();
            const timedOut = isTimeoutError(reason);
            setStatus(timedOut ? 'timeout' : 'error');
            setErrorMessage(
              reason?.trim() || 'Gagal membaca pembaruan lokasi GPS.',
            );
          },
        );

        if (cancelled) {
          sub.remove();
          return;
        }
        activeSub = sub;
      } catch (error) {
        if (cancelled) return;
        clearAcquireTimer();
        setStatus(isTimeoutError(error) ? 'timeout' : 'error');
        setErrorMessage(
          readLocationErrorMessage(
            error,
            'Tidak dapat memulai pelacakan lokasi perangkat.',
          ),
        );
      }
    }

    void startLocationTracking();

    return () => {
      cancelled = true;
      clearAcquireTimer();
      activeSub?.remove();
      activeSub = null;
    };
  }, [enabled, watchEpoch]);

  const refreshLocation = useCallback(async () => {
    if (!enabled || isRefreshing) return;

    setIsRefreshing(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(perm.canAskAgain ?? true);
      if (perm.status !== 'granted') {
        setStatus('permission-denied');
        setErrorMessage(
          'Izin akses lokasi ditolak. Aktifkan izin lokasi untuk melakukan presensi.',
        );
        return;
      }

      const servicesEnabled = await checkLocationServicesEnabled();
      if (!servicesEnabled) {
        setStatus('services-disabled');
        setErrorMessage(
          'Layanan GPS/lokasi perangkat sedang tidak aktif. Aktifkan GPS lalu coba lagi.',
        );
        return;
      }

      const shouldRestartWatcher = status !== 'ready';
      setStatus((prev) => (prev === 'ready' ? prev : 'acquiring'));
      setErrorMessage(null);

      const current = await withLocationTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }),
        DEFAULT_LOCATION_TIMEOUT_MS,
      );
      setCoords(toCoordinates(current));
      setLastUpdatedAt(current.timestamp || Date.now());
      setStatus('ready');
      setErrorMessage(null);

      if (shouldRestartWatcher) {
        setWatchEpoch((epoch) => epoch + 1);
      }
    } catch (error) {
      const timedOut = isTimeoutError(error);
      setStatus(timedOut ? 'timeout' : 'error');
      setErrorMessage(
        timedOut
          ? 'Pembacaan GPS melewati batas waktu 15 detik. Pastikan sinyal GPS aktif lalu coba lagi.'
          : readLocationErrorMessage(
              error,
              'Gagal memperbarui koordinat lokasi. Pastikan sinyal GPS tersedia.',
            ),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, isRefreshing, status]);

  if (!enabled) {
    return {
      status: 'idle',
      coords: null,
      lastUpdatedAt: null,
      errorMessage: null,
      canAskAgain: true,
      isRefreshing: false,
      refreshLocation,
    };
  }

  return {
    status,
    coords,
    lastUpdatedAt,
    errorMessage,
    canAskAgain,
    isRefreshing,
    refreshLocation,
  };
}
