import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export type MapLocationState =
  | { status: 'checking'; coordinates: null; message: string }
  | { status: 'ready'; coordinates: MapCoordinates; message: string }
  | { status: 'denied'; coordinates: null; message: string }
  | { status: 'disabled'; coordinates: null; message: string }
  | { status: 'error'; coordinates: null; message: string }
  | { status: 'unsupported'; coordinates: null; message: string };

const INITIAL_STATE: MapLocationState = {
  status: 'checking',
  coordinates: null,
  message: 'Menyiapkan lokasi perangkat…',
};

const WEB_STATE: MapLocationState = {
  status: 'unsupported',
  coordinates: null,
  message: 'Peta interaktif tersedia saat aplikasi dibuka di Android atau iPhone.',
};

/**
 * Memantau lokasi hanya selama layar peta terbuka. Subscription selalu dihentikan
 * saat layar dilepas agar tidak membebani baterai atau meninggalkan listener.
 */
export function useMapLocation() {
  const [state, setState] = useState<MapLocationState>(() =>
    Platform.OS === 'web' ? WEB_STATE : INITIAL_STATE,
  );
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const update = (next: MapLocationState) => {
      if (active) setState(next);
    };

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

        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
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
          () => {
            update({
              status: 'error',
              coordinates: null,
              message: 'Lokasi tidak dapat diperbarui. Periksa GPS lalu coba lagi.',
            });
          },
        );
      } catch {
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
