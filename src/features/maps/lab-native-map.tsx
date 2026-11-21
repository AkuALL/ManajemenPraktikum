import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl';
import { Crosshair, LocateFixed, MapPin, RefreshCw } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { FSM_UNDIP_MAP_CAMERA } from '@/features/labs/fsm-undip-labs';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createLabRadiusFeatureCollection,
  createUserLocationFeatureCollection,
} from './lab-map-geojson';
import { useMapLocation } from './use-map-location';

export type MappedLab = {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActiveNow: boolean;
};

export type LabNativeMapProps = {
  labs: MappedLab[];
  selectedLabId: string | null;
  onSelectLab: (labId: string) => void;
};

const OPENFREEMAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

if (typeof window !== 'undefined') {
  setWorkerUrl(new URL('/maplibre-gl-worker.js', window.location.origin).href);
}

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCFCFA" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

/** Peta interaktif MapLibre GL JS untuk Web (Android/iOS menggunakan lab-native-map.native.tsx). */
export function LabNativeMap({ labs, selectedLabId, onSelectLab }: LabNativeMapProps) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const mapStyleUrl = colorScheme === 'dark' ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.light;
  const location = useMapLocation();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const styleUrlRef = useRef(mapStyleUrl);
  const onSelectLabRef = useRef(onSelectLab);

  const [styleLoadedVersion, setStyleLoadedVersion] = useState(0);

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

  const latestDataRef = useRef({ radiusGeoJson, userLocationGeoJson, colors });

  useEffect(() => {
    onSelectLabRef.current = onSelectLab;
  }, [onSelectLab]);

  useEffect(() => {
    latestDataRef.current = { radiusGeoJson, userLocationGeoJson, colors };
  }, [colors, radiusGeoJson, userLocationGeoJson]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: styleUrlRef.current,
      center: [
        FSM_UNDIP_MAP_CAMERA.coordinates.longitude,
        FSM_UNDIP_MAP_CAMERA.coordinates.latitude,
      ],
      zoom: FSM_UNDIP_MAP_CAMERA.zoom,
      attributionControl: { compact: true },
    });

    map.addControl(new NavigationControl({ showZoom: false }), 'top-left');

    const ensureLayers = () => {
      const { radiusGeoJson: radiusData, userLocationGeoJson: userData, colors: themeColors } =
        latestDataRef.current;

      if (!map.getSource('lab-radius-source')) {
        map.addSource('lab-radius-source', {
          type: 'geojson',
          data: radiusData,
        });
      }
      if (!map.getLayer('lab-radius-fill-default')) {
        map.addLayer({
          id: 'lab-radius-fill-default',
          type: 'fill',
          source: 'lab-radius-source',
          filter: ['!=', ['get', 'isSelected'], 1],
          paint: {
            'fill-color': themeColors.pacific,
            'fill-opacity': 0.08,
          },
        });
      }
      if (!map.getLayer('lab-radius-stroke-default')) {
        map.addLayer({
          id: 'lab-radius-stroke-default',
          type: 'line',
          source: 'lab-radius-source',
          filter: ['!=', ['get', 'isSelected'], 1],
          paint: {
            'line-color': themeColors.pacific,
            'line-width': 1,
          },
        });
      }
      if (!map.getLayer('lab-radius-fill-selected')) {
        map.addLayer({
          id: 'lab-radius-fill-selected',
          type: 'fill',
          source: 'lab-radius-source',
          filter: ['==', ['get', 'isSelected'], 1],
          paint: {
            'fill-color': themeColors.baltic,
            'fill-opacity': 0.18,
          },
        });
      }
      if (!map.getLayer('lab-radius-stroke-selected')) {
        map.addLayer({
          id: 'lab-radius-stroke-selected',
          type: 'line',
          source: 'lab-radius-source',
          filter: ['==', ['get', 'isSelected'], 1],
          paint: {
            'line-color': themeColors.baltic,
            'line-width': 2,
          },
        });
      }

      if (!map.getSource('user-location-source')) {
        map.addSource('user-location-source', {
          type: 'geojson',
          data: userData,
        });
      }
      if (!map.getLayer('user-location-halo')) {
        map.addLayer({
          id: 'user-location-halo',
          type: 'circle',
          source: 'user-location-source',
          paint: {
            'circle-radius': 14,
            'circle-color': '#2563EB',
            'circle-opacity': 0.2,
          },
        });
      }
      if (!map.getLayer('user-location-dot')) {
        map.addLayer({
          id: 'user-location-dot',
          type: 'circle',
          source: 'user-location-source',
          paint: {
            'circle-radius': 7,
            'circle-color': '#2563EB',
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#FCFCFA',
          },
        });
      }

      setStyleLoadedVersion((version) => version + 1);
    };

    map.on('style.load', ensureLayers);
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
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
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
    const map = mapRef.current;
    if (!map || styleLoadedVersion === 0) return;

    const radiusSource = map.getSource('lab-radius-source') as GeoJSONSource | undefined;
    radiusSource?.setData(radiusGeoJson);
  }, [radiusGeoJson, styleLoadedVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleLoadedVersion === 0) return;

    const userSource = map.getSource('user-location-source') as GeoJSONSource | undefined;
    userSource?.setData(userLocationGeoJson);
  }, [userLocationGeoJson, styleLoadedVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = orderedLabs.map((lab) => {
      const selected = lab.id === selectedLabId;
      const markerColor = selected ? colors.pacific : lab.isActiveNow ? colors.rosy : colors.baltic;

      const el = document.createElement('button');
      el.type = 'button';
      el.title = lab.name;
      el.setAttribute('aria-label', lab.name);
      el.style.width = '34px';
      el.style.height = '34px';
      el.style.borderRadius = '17px';
      el.style.border = '2px solid #FCFCFA';
      el.style.backgroundColor = markerColor;
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.style.padding = '0';
      el.style.boxShadow = '0 2px 6px rgba(13, 35, 54, 0.25)';
      el.innerHTML = PIN_SVG;

      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectLabRef.current(lab.id);
      });

      return new Marker({ element: el })
        .setLngLat([lab.longitude, lab.latitude])
        .addTo(map);
    });
  }, [colors.baltic, colors.pacific, colors.rosy, orderedLabs, selectedLabId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLabId) return;
    const selectedLab = labs.find((lab) => lab.id === selectedLabId);
    if (!selectedLab) return;

    map.easeTo({
      center: [selectedLab.longitude, selectedLab.latitude],
      zoom: 17,
      duration: 450,
    });
  }, [labs, selectedLabId]);

  const handleRecenterUser = () => {
    const map = mapRef.current;
    if (!map || !location.coordinates) return;

    map.easeTo({
      center: [location.coordinates.longitude, location.coordinates.latitude],
      zoom: 17,
      duration: 450,
    });
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.mapViewport}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

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

      <View
        style={[
          styles.legend,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <View style={styles.legendCopy}>
          <View style={styles.legendTitleRow}>
            <MapPin size={15} color={colors.baltic} strokeWidth={2.4} />
            <Text style={[styles.legendTitle, { color: colors.textPrimary }]}>Peta lokasi lab</Text>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            {location.message}
          </Text>
        </View>

        {location.status === 'ready' ? (
          <View style={[styles.liveBadge, { backgroundColor: colors.pacificSoft }]}>
            <Crosshair size={13} color={colors.pacificDark} strokeWidth={2.4} />
            <Text style={[styles.liveText, { color: colors.pacificDark }]}>Live</Text>
          </View>
        ) : location.status === 'checking' || location.status === 'unsupported' ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Coba lagi mengambil lokasi"
            onPress={location.retry}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.balticSoft },
              pressed && styles.pressed,
            ]}
          >
            <RefreshCw size={14} color={colors.baltic} strokeWidth={2.2} />
            <Text style={[styles.actionText, { color: colors.baltic }]}>Coba lagi</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  mapViewport: { height: 310, backgroundColor: '#DCEBF1', position: 'relative' },
  recenterButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
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
