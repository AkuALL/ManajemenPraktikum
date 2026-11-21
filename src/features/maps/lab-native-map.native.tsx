import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
} from '@maplibre/maplibre-react-native';
import { Crosshair, LocateFixed, MapPin, RefreshCw, Settings } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { FSM_UNDIP_MAP_CAMERA } from '@/features/labs/fsm-undip-labs';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createLabRadiusFeatureCollection,
  createUserLocationFeatureCollection,
} from './lab-map-geojson';
import { useMapLocation } from './use-map-location';

const OPENFREEMAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export type MappedLab = {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActiveNow: boolean;
};

type LabNativeMapProps = {
  labs: MappedLab[];
  selectedLabId: string | null;
  onSelectLab: (labId: string) => void;
};

/** Peta react-native-maps untuk Android/iOS; dapat diuji langsung dengan Expo Go. */
export function LabNativeMap({ labs, selectedLabId, onSelectLab }: LabNativeMapProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const mapStyleUrl = colorScheme === 'dark' ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.light;
  const location = useMapLocation();
  const cameraRef = useRef<CameraRef>(null);
  const [mapReady, setMapReady] = useState(false);

  const radiusGeoJson = useMemo(
    () => createLabRadiusFeatureCollection(labs, selectedLabId),
    [labs, selectedLabId],
  );

  const userLocationGeoJson = useMemo(
    () => createUserLocationFeatureCollection(location.coordinates),
    [location.coordinates],
  );

  const orderedLabs = useMemo(() => {
    if (!selectedLabId) return labs;
    return [
      ...labs.filter((lab) => lab.id !== selectedLabId),
      ...labs.filter((lab) => lab.id === selectedLabId),
    ];
  }, [labs, selectedLabId]);

  useEffect(() => {
    if (!mapReady || !selectedLabId) return;
    const selectedLab = labs.find((lab) => lab.id === selectedLabId);
    if (!selectedLab) return;

    try {
      cameraRef.current?.easeTo({
        center: [selectedLab.longitude, selectedLab.latitude],
        zoom: 17,
        duration: 450,
      });
    } catch {
      // Abaikan jika kamera belum terpasang penuh saat transisi layar.
    }
  }, [labs, mapReady, selectedLabId]);

  const handleRecenterUser = () => {
    if (!location.coordinates) return;
    try {
      cameraRef.current?.easeTo({
        center: [location.coordinates.longitude, location.coordinates.latitude],
        zoom: 17,
        duration: 450,
      });
    } catch {
      // Abaikan jika kamera belum siap menerima perintah.
    }
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.mapViewport}>
        <Map
          style={StyleSheet.absoluteFill}
          mapStyle={mapStyleUrl}
          androidView="texture"
          compass
          attribution
          onDidFinishLoadingMap={() => setMapReady(true)}
        >
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: [
                FSM_UNDIP_MAP_CAMERA.coordinates.longitude,
                FSM_UNDIP_MAP_CAMERA.coordinates.latitude,
              ],
              zoom: FSM_UNDIP_MAP_CAMERA.zoom,
            }}
          />

          <GeoJSONSource id="lab-radius-source" data={radiusGeoJson}>
            <Layer
              id="lab-radius-fill-default"
              type="fill"
              filter={['!=', ['get', 'isSelected'], 1]}
              paint={{
                'fill-color': colors.pacific,
                'fill-opacity': 0.08,
              }}
            />
            <Layer
              id="lab-radius-stroke-default"
              type="line"
              filter={['!=', ['get', 'isSelected'], 1]}
              paint={{
                'line-color': colors.pacific,
                'line-width': 1,
              }}
            />
            <Layer
              id="lab-radius-fill-selected"
              type="fill"
              filter={['==', ['get', 'isSelected'], 1]}
              paint={{
                'fill-color': colors.baltic,
                'fill-opacity': 0.18,
              }}
            />
            <Layer
              id="lab-radius-stroke-selected"
              type="line"
              filter={['==', ['get', 'isSelected'], 1]}
              paint={{
                'line-color': colors.baltic,
                'line-width': 2,
              }}
            />
          </GeoJSONSource>

          <GeoJSONSource id="user-location-source" data={userLocationGeoJson}>
            <Layer
              id="user-location-halo"
              type="circle"
              paint={{
                'circle-radius': 14,
                'circle-color': '#2563EB',
                'circle-opacity': 0.2,
              }}
            />
            <Layer
              id="user-location-dot"
              type="circle"
              paint={{
                'circle-radius': 7,
                'circle-color': '#2563EB',
                'circle-stroke-width': 2.5,
                'circle-stroke-color': '#FCFCFA',
              }}
            />
          </GeoJSONSource>

          {orderedLabs.map((lab) => {
            const selected = lab.id === selectedLabId;
            const markerColor = lab.isActiveNow ? colors.rosy : colors.baltic;

            return (
              <Marker
                key={lab.id}
                id={lab.id}
                lngLat={[lab.longitude, lab.latitude]}
                onPress={() => onSelectLab(lab.id)}
              >
                <View
                  style={[
                    styles.labMarker,
                    {
                      backgroundColor: selected ? colors.pacific : markerColor,
                      borderColor: '#FCFCFA',
                    },
                  ]}
                >
                  <MapPin size={18} color="#FCFCFA" strokeWidth={2.8} />
                </View>
              </Marker>
            );
          })}
        </Map>

        {location.coordinates ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pusatkan peta ke lokasi saya"
            onPress={handleRecenterUser}
            style={({ pressed }) => [
              styles.recenterButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <LocateFixed size={18} color={colors.baltic} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.legend, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.legendCopy}>
          <View style={styles.legendTitleRow}>
            <MapPin size={15} color={colors.baltic} strokeWidth={2.4} />
            <Text style={[styles.legendTitle, { color: colors.textPrimary }]}>Peta lokasi lab</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>{location.message}</Text>
        </View>

        {location.status === 'ready' ? (
          <View style={[styles.liveBadge, { backgroundColor: colors.pacificSoft }]}>
            <Crosshair size={13} color={colors.pacificDark} strokeWidth={2.4} />
            <Text style={[styles.liveText, { color: colors.pacificDark }]}>Live</Text>
          </View>
        ) : location.status === 'checking' ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={location.status === 'denied' ? 'Buka pengaturan izin lokasi' : 'Coba lagi mengambil lokasi'}
            onPress={location.status === 'denied' ? location.openSettings : location.retry}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.balticSoft },
              pressed && styles.pressed,
            ]}
          >
            {location.status === 'denied' ? (
              <Settings size={14} color={colors.baltic} strokeWidth={2.2} />
            ) : (
              <RefreshCw size={14} color={colors.baltic} strokeWidth={2.2} />
            )}
            <Text style={[styles.actionText, { color: colors.baltic }]}>
              {location.status === 'denied' ? 'Pengaturan' : 'Coba lagi'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  mapViewport: { height: 310, backgroundColor: '#DCEBF1' },
  labMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D2336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  legend: { borderTopWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendCopy: { flex: 1, gap: 3 },
  legendTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendTitle: { fontFamily: FontFamily.sansBold, fontSize: 12.5 },
  legendText: { fontFamily: FontFamily.sansRegular, fontSize: 11.5, lineHeight: 16 },
  liveBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveText: { fontFamily: FontFamily.sansBold, fontSize: 11.5 },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: { fontFamily: FontFamily.sansBold, fontSize: 11.5 },
  pressed: { opacity: 0.76 },
});
