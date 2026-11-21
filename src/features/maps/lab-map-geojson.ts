import type { MappedLab } from './lab-native-map';
import type { MapCoordinates } from './use-map-location';

export type LabRadiusProperties = {
  labId: string;
  isSelected: number;
};

const EARTH_METERS_PER_LAT_DEGREE = 111_320;
const MIN_RADIUS_METERS = 1;

/**
 * Menghasilkan poligon GeoJSON berbentuk lingkaran untuk radius presensi laboratorium.
 * Urutan koordinat mengikuti standar GeoJSON: [longitude, latitude].
 */
export function createRadiusCirclePolygon(
  longitude: number,
  latitude: number,
  radiusMeters: number,
  steps = 48,
): GeoJSON.Polygon {
  const safeSteps = Math.max(8, steps);
  const clampedRadius = Math.max(MIN_RADIUS_METERS, radiusMeters);
  const latDelta = clampedRadius / EARTH_METERS_PER_LAT_DEGREE;
  const metersPerLngDegree = Math.max(
    1,
    EARTH_METERS_PER_LAT_DEGREE * Math.cos((latitude * Math.PI) / 180),
  );
  const lngDelta = clampedRadius / metersPerLngDegree;

  const ring: GeoJSON.Position[] = [];
  for (let i = 0; i < safeSteps; i += 1) {
    const angle = (i / safeSteps) * 2 * Math.PI;
    ring.push([
      longitude + lngDelta * Math.cos(angle),
      latitude + latDelta * Math.sin(angle),
    ]);
  }
  ring.push(ring[0]);

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

/**
 * Mengubah daftar laboratorium menjadi GeoJSON FeatureCollection berisi poligon radius geofence.
 */
export function createLabRadiusFeatureCollection(
  labs: readonly MappedLab[],
  selectedLabId: string | null,
): GeoJSON.FeatureCollection<GeoJSON.Polygon, LabRadiusProperties> {
  return {
    type: 'FeatureCollection',
    features: labs.map((lab) => ({
      type: 'Feature',
      id: lab.id,
      properties: {
        labId: lab.id,
        isSelected: lab.id === selectedLabId ? 1 : 0,
      },
      geometry: createRadiusCirclePolygon(lab.longitude, lab.latitude, lab.radiusMeters),
    })),
  };
}

/**
 * Mengubah koordinat GPS pengguna menjadi GeoJSON FeatureCollection bertipe Point.
 */
export function createUserLocationFeatureCollection(
  coordinates: MapCoordinates | null,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  if (!coordinates) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'user-location',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude],
        },
      },
    ],
  };
}

