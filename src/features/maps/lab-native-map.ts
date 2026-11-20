import type { ReactElement } from 'react';

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

/** Type fallback; Metro memilih berkas .native atau .web sesuai platform. */
export declare function LabNativeMap(props: LabNativeMapProps): ReactElement | null;
