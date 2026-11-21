import type { ReactElement } from 'react';

export type LabCoordinatePickerProps = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onSelectCoordinate: (coords: { latitude: number; longitude: number }) => void;
};

/** Type fallback; Metro memilih berkas .native atau .web sesuai platform. */
export declare function LabCoordinatePicker(
  props: LabCoordinatePickerProps,
): ReactElement | null;
