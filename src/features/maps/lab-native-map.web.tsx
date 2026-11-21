import type { ReactElement } from 'react';

type MappedLab = {
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

/** @maplibre/maplibre-react-native tidak mendukung web; layar peta menampilkan denah web sebagai fallback. */
export function LabNativeMap(_props: LabNativeMapProps): ReactElement | null {
  return null;
}
