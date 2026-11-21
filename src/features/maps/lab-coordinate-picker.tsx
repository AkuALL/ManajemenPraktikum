import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl';
import { LocateFixed, RefreshCw } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createLabRadiusFeatureCollection,
  createUserLocationFeatureCollection,
} from './lab-map-geojson';
import { useMapLocation } from './use-map-location';

export type LabCoordinatePickerProps = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onSelectCoordinate: (coords: { latitude: number; longitude: number }) => void;
};

const OPENFREEMAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCFCFA" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

/**
 * Pemilih titik koordinat laboratorium interaktif berbasis MapLibre GL JS untuk Web
 * (Android/iOS menggunakan lab-coordinate-picker.native.tsx).
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
  const location = useMapLocation();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const styleUrlRef = useRef(mapStyleUrl);
  const initialCoordsRef = useRef({ latitude, longitude });
  const onSelectCoordinateRef = useRef(onSelectCoordinate);

  const [styleLoadedVersion, setStyleLoadedVersion] = useState(0);

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

  const latestDataRef = useRef({ radiusGeoJson, userLocationGeoJson, colors });

  useEffect(() => {
    onSelectCoordinateRef.current = onSelectCoordinate;
  }, [onSelectCoordinate]);

  useEffect(() => {
    latestDataRef.current = { radiusGeoJson, userLocationGeoJson, colors };
  }, [colors, radiusGeoJson, userLocationGeoJson]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: styleUrlRef.current,
      center: [initialCoordsRef.current.longitude, initialCoordsRef.current.latitude],
      zoom: 17,
      attributionControl: { compact: true },
    });

    map.addControl(new NavigationControl({ showZoom: false }), 'top-left');

    const ensureLayers = () => {
      const { radiusGeoJson: radiusData, userLocationGeoJson: userData, colors: themeColors } =
        latestDataRef.current;

      if (!map.getSource('picker-radius-source')) {
        map.addSource('picker-radius-source', {
          type: 'geojson',
          data: radiusData,
        });
      }
      if (!map.getLayer('picker-radius-fill')) {
        map.addLayer({
          id: 'picker-radius-fill',
          type: 'fill',
          source: 'picker-radius-source',
          paint: {
            'fill-color': themeColors.rosy,
            'fill-opacity': 0.18,
          },
        });
      }
      if (!map.getLayer('picker-radius-stroke')) {
        map.addLayer({
          id: 'picker-radius-stroke',
          type: 'line',
          source: 'picker-radius-source',
          paint: {
            'line-color': themeColors.rosy,
            'line-width': 2,
          },
        });
      }

      if (!map.getSource('picker-user-source')) {
        map.addSource('picker-user-source', {
          type: 'geojson',
          data: userData,
        });
      }
      if (!map.getLayer('picker-user-halo')) {
        map.addLayer({
          id: 'picker-user-halo',
          type: 'circle',
          source: 'picker-user-source',
          paint: {
            'circle-radius': 13,
            'circle-color': '#2563EB',
            'circle-opacity': 0.2,
          },
        });
      }
      if (!map.getLayer('picker-user-dot')) {
        map.addLayer({
          id: 'picker-user-dot',
          type: 'circle',
          source: 'picker-user-source',
          paint: {
            'circle-radius': 6.5,
            'circle-color': '#2563EB',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FCFCFA',
          },
        });
      }

      setStyleLoadedVersion((version) => version + 1);
    };

    map.on('style.load', ensureLayers);
    map.on('click', (event: MapMouseEvent) => {
      const { lat, lng } = event.lngLat;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      onSelectCoordinateRef.current({
        latitude: Number(lat.toFixed(7)),
        longitude: Number(lng.toFixed(7)),
      });
    });

    const el = document.createElement('div');
    el.style.width = '34px';
    el.style.height = '34px';
    el.style.borderRadius = '17px';
    el.style.border = '2px solid #FCFCFA';
    el.style.backgroundColor = latestDataRef.current.colors.rosy;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.boxShadow = '0 2px 6px rgba(13, 35, 54, 0.25)';
    el.innerHTML = PIN_SVG;

    markerRef.current = new Marker({ element: el })
      .setLngLat([initialCoordsRef.current.longitude, initialCoordsRef.current.latitude])
      .addTo(map);

    mapRef.current = map;

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.resize();
          })
        : null;
    resizeObserver?.observe(container);

    return () => {
      resizeObserver?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleUrlRef.current === mapStyleUrl) return;
    styleUrlRef.current = mapStyleUrl;
    map.setStyle(mapStyleUrl);
  }, [mapStyleUrl]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleLoadedVersion === 0) return;

    const radiusSource = map.getSource('picker-radius-source') as GeoJSONSource | undefined;
    radiusSource?.setData(radiusGeoJson);
  }, [radiusGeoJson, styleLoadedVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleLoadedVersion === 0) return;

    const userSource = map.getSource('picker-user-source') as GeoJSONSource | undefined;
    userSource?.setData(userLocationGeoJson);
  }, [userLocationGeoJson, styleLoadedVersion]);

  const handleUseCurrentLocation = () => {
    if (!location.coordinates) return;
    const nextLat = Number(location.coordinates.latitude.toFixed(7));
    const nextLng = Number(location.coordinates.longitude.toFixed(7));
    onSelectCoordinate({ latitude: nextLat, longitude: nextLng });
    mapRef.current?.easeTo({
      center: [nextLng, nextLat],
      zoom: 17.5,
      duration: 380,
    });
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.mapBox,
          { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
        ]}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

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
            onPress={location.retry}
            style={({ pressed }) => [
              styles.gpsSnapBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <RefreshCw size={14} color={colors.baltic} strokeWidth={2.2} />
            <Text style={[styles.gpsSnapText, { color: colors.baltic }]}>Coba Lagi GPS</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.hintText, { color: colors.textSecondary }]}>
        Klik titik mana saja pada peta untuk memindahkan pin pusat laboratorium (radius{' '}
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
  gpsSnapBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
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
