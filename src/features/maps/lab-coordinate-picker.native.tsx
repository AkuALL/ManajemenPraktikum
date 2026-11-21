import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import { LocateFixed, MapPin, RefreshCw, Settings } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LabCoordinatePickerProps } from './lab-coordinate-picker';
import {
  createLabRadiusFeatureCollection,
  createUserLocationFeatureCollection,
} from './lab-map-geojson';
import { useMapLocation } from './use-map-location';

const OPENFREEMAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

/**
 * Pemilih titik koordinat laboratorium interaktif berbasis MapLibre untuk Master Lab.
 */
export function LabCoordinatePicker({
  latitude,
  longitude,
  radiusMeters,
  onSelectCoordinate,
}: LabCoordinatePickerProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const mapStyleUrl =
    colorScheme === 'dark' ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.light;
  const cameraRef = useRef<CameraRef>(null);
  const location = useMapLocation();

  const radiusGeoJson = useMemo(
    () =>
      createLabRadiusFeatureCollection(
        [
          {
            id: 'draft-lab',
            name: 'Titik Lab',
            building: '',
            latitude,
            longitude,
            radiusMeters,
            isActiveNow: false,
          },
        ],
        'draft-lab',
      ),
    [latitude, longitude, radiusMeters],
  );

  const userLocationGeoJson = useMemo(
    () => createUserLocationFeatureCollection(location.coordinates),
    [location.coordinates],
  );

  const snapCamera = (lat: number, lng: number) => {
    try {
      cameraRef.current?.easeTo({
        center: [lng, lat],
        zoom: 17.5,
        duration: 380,
      });
    } catch {
      // Abaikan jika kamera belum siap menerima perintah.
    }
  };

  const handleUseCurrentLocation = () => {
    if (!location.coordinates) return;
    const nextLat = Number(location.coordinates.latitude.toFixed(7));
    const nextLng = Number(location.coordinates.longitude.toFixed(7));
    onSelectCoordinate({ latitude: nextLat, longitude: nextLng });
    snapCamera(nextLat, nextLng);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mapBox,
          { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
        ]}
      >
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={mapStyleUrl}
          androidView="texture"
          compass
          attribution
          onPress={(event) => {
            const lngLat = event.nativeEvent?.lngLat;
            if (!Array.isArray(lngLat) || lngLat.length < 2) return;
            const [lng, lat] = lngLat;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            onSelectCoordinate({
              latitude: Number(lat.toFixed(7)),
              longitude: Number(lng.toFixed(7)),
            });
          }}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: [longitude, latitude],
              zoom: 17,
            }}
          />

          <GeoJSONSource id="picker-radius-source" data={radiusGeoJson}>
            <Layer
              id="picker-radius-fill"
              type="fill"
              paint={{
                'fill-color': colors.rosy,
                'fill-opacity': 0.18,
              }}
            />
            <Layer
              id="picker-radius-stroke"
              type="line"
              paint={{
                'line-color': colors.rosy,
                'line-width': 2,
              }}
            />
          </GeoJSONSource>

          <GeoJSONSource id="picker-user-source" data={userLocationGeoJson}>
            <Layer
              id="picker-user-halo"
              type="circle"
              paint={{
                'circle-radius': 13,
                'circle-color': '#2563EB',
                'circle-opacity': 0.2,
              }}
            />
            <Layer
              id="picker-user-dot"
              type="circle"
              paint={{
                'circle-radius': 6.5,
                'circle-color': '#2563EB',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FCFCFA',
              }}
            />
          </GeoJSONSource>

          <Marker id="draft-lab-pin" lngLat={[longitude, latitude]}>
            <View style={[styles.pinBadge, { backgroundColor: colors.rosy }]}>
              <MapPin size={18} color="#FCFCFA" strokeWidth={2.6} />
            </View>
          </Marker>
        </Map>

        {location.coordinates ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gunakan lokasi saya saat ini"
            onPress={handleUseCurrentLocation}
            style={({ pressed }) => [
              styles.gpsSnapBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <LocateFixed size={15} color={colors.baltic} strokeWidth={2.2} />
            <Text style={[styles.gpsSnapText, { color: colors.baltic }]}>
              Gunakan Lokasi Saya
            </Text>
          </Pressable>
        ) : location.status !== 'checking' && location.status !== 'unsupported' ? (
          <Pressable
            accessibilityRole="button"
            onPress={location.status === 'denied' ? location.openSettings : location.retry}
            style={({ pressed }) => [
              styles.gpsSnapBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            {location.status === 'denied' ? (
              <Settings size={14} color={colors.rosyDark} strokeWidth={2.2} />
            ) : (
              <RefreshCw size={14} color={colors.baltic} strokeWidth={2.2} />
            )}
            <Text
              style={[
                styles.gpsSnapText,
                { color: location.status === 'denied' ? colors.rosyDark : colors.baltic },
              ]}
            >
              {location.status === 'denied' ? 'Pengaturan GPS' : 'Coba Lagi GPS'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.hintText, { color: colors.textSecondary }]}>
        Ketuk titik mana saja pada peta untuk memindahkan pin pusat laboratorium (radius{' '}
        {radiusMeters} m).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  mapBox: {
    height: 270,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  pinBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#FCFCFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsSnapBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#0D2336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  gpsSnapText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
  },
  hintText: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.78,
  },
});
