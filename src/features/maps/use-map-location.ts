import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export const MAP_LOCATION_TIMEOUT_MS = 15_000;

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export type MapLocationState =
  | { status: 'checking'; coordinates: null; message: string }
  | { status: 'ready'; coordinates: MapCoordinates; message: string }
  | { status: 'denied'; coordinates: null; message: string }
  | { status: 'disabled'; coordinates: null; message: string }
  | { status: 'timeout'; coordinates: null; message: string }
  | { status: 'error'; coordinates: null; message: string }
  | { status: 'unsupported'; coordinates: null; message: string };

class MapLocationTimeoutError extends Error {
  constructor() {
    super('Pembacaan GPS melewati batas waktu 15 detik.');
    this.name = 'MapLocationTimeoutError';
  }
}

function withLocationTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new MapLocationTimeoutError());
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
  if (error instanceof MapLocationTimeoutError) return true;
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

const INITIAL_STATE: MapLocationState = {
  status: 'checking',
  coordinates: null,
  message: 'Menyiapkan lokasi perangkat…',
};

/**
 * Memantau lokasi hanya selama layar peta terbuka. Subscription selalu dihentikan
 * saat layar dilepas agar tidak membebani baterai atau meninggalkan listener.
 */
export function useMapLocation() {
  const [state, setState] = useState<MapLocationState>(INITIAL_STATE);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const update = (next: MapLocationState) => {
      if (active) setState(next);
    };

    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        update({
          status: 'unsupported',
          coordinates: null,
          message: 'Browser ini tidak mendukung layanan lokasi.',
        });
        return;
      }

      update(INITIAL_STATE);
      let watchId: number | null = null;

      const handleWebSuccess = (pos: GeolocationPosition) => {
        update({
          status: 'ready',
          coordinates: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
          message: 'Lokasi browser diperbarui saat peta terbuka.',
        });
      };

      const handleWebError = (error: GeolocationPositionError) => {
        if (error.code === 1) {
          update({
            status: 'denied',
            coordinates: null,
            message: 'Izin lokasi browser ditolak. Izinkan akses lokasi di browser lalu coba lagi.',
          });
          return;
        }
        if (error.code === 3) {
          update({
            status: 'timeout',
            coordinates: null,
            message: 'Pembacaan lokasi melewati batas waktu 15 detik. Coba lagi.',
          });
          return;
        }
        update({
          status: 'error',
          coordinates: null,
          message: 'Lokasi browser tidak tersedia saat ini. Coba lagi.',
        });
      };

      const geoOptions: PositionOptions = {
        enableHighAccuracy: false,
        timeout: MAP_LOCATION_TIMEOUT_MS,
        maximumAge: 10_000,
      };

      navigator.geolocation.getCurrentPosition(handleWebSuccess, handleWebError, geoOptions);
      watchId = navigator.geolocation.watchPosition(handleWebSuccess, handleWebError, geoOptions);

      return () => {
        active = false;
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    }

    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      update(INITIAL_STATE);

      try {
        const permission = await Location.getForegroundPermissionsAsync();
        const granted =
          permission.status === 'granted'
            ? permission
            : await Location.requestForegroundPermissionsAsync();

        if (granted.status !== 'granted') {
          update({
            status: 'denied',
            coordinates: null,
            message: 'Izin lokasi diperlukan untuk menampilkan posisi kamu di peta.',
          });
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          update({
            status: 'disabled',
            coordinates: null,
            message: 'Aktifkan GPS atau layanan lokasi perangkat, lalu coba lagi.',
          });
          return;
        }

        const initialLocation = await withLocationTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          MAP_LOCATION_TIMEOUT_MS,
        );
        update({
          status: 'ready',
          coordinates: initialLocation.coords,
          message: 'Lokasi perangkat diperbarui saat peta terbuka.',
        });

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 3,
            timeInterval: 1500,
          },
          (location) => {
            update({
              status: 'ready',
              coordinates: location.coords,
              message: 'Lokasi perangkat diperbarui saat peta terbuka.',
            });
          },
          (reason) => {
            update({
              status: isTimeoutError(reason) ? 'timeout' : 'error',
              coordinates: null,
              message: isTimeoutError(reason)
                ? 'Pembacaan GPS melewati batas waktu 15 detik. Pastikan GPS aktif lalu coba lagi.'
                : 'Lokasi tidak dapat diperbarui. Periksa GPS lalu coba lagi.',
            });
          },
        );
      } catch (error) {
        if (isTimeoutError(error)) {
          update({
            status: 'timeout',
            coordinates: null,
            message: 'Pembacaan GPS melewati batas waktu 15 detik. Pastikan GPS aktif lalu coba lagi.',
          });
          return;
        }
        update({
          status: 'error',
          coordinates: null,
          message: 'Lokasi tidak dapat diambil. Periksa GPS dan koneksi perangkat.',
        });
      }
    };

    void startWatching();
    return () => {
      active = false;
      subscription?.remove();
    };
  }, [retryVersion]);

  return {
    ...state,
    retry: useCallback(() => setRetryVersion((version) => version + 1), []),
    openSettings: useCallback(() => void Linking.openSettings(), []),
  };
}
