import type { LabLocation } from '@/types';

export type FsmUndipLab = LabLocation & {
  floor: number | null;
  pointType: 'building_map_reference';
  roomCenterVerified: false;
  plusCode: string;
};

/**
 * Titik referensi gedung dari data koordinat FSM UNDIP yang diberikan tim.
 * Ini bukan titik ruang hasil survei; Lab B/C/D berbagi titik Gedung E.
 */
export const FSM_UNDIP_LABS: readonly FsmUndipLab[] = [
  {
    id: 'lab-informatika-b',
    name: 'Lab Informatika B',
    building: 'Gedung E FSM UNDIP',
    floor: 2,
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 65,
    isActive: true,
    plusCode: '6P4GXC2R+P82',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
  {
    id: 'lab-informatika-c',
    name: 'Lab Informatika C',
    building: 'Gedung E FSM UNDIP',
    floor: 2,
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 65,
    isActive: true,
    plusCode: '6P4GXC2R+P82',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
  {
    id: 'lab-informatika-d',
    name: 'Lab Informatika D',
    building: 'Gedung E FSM UNDIP',
    floor: 2,
    latitude: -7.0482375,
    longitude: 110.440765625,
    radiusMeters: 65,
    isActive: true,
    plusCode: '6P4GXC2R+P82',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
  {
    id: 'dekanat-fsm',
    name: 'Dekanat FSM UNDIP',
    building: 'Gedung Dekanat FSM UNDIP',
    floor: null,
    latitude: -7.0490375,
    longitude: 110.441484375,
    radiusMeters: 65,
    isActive: true,
    plusCode: '6P4GXC2R+9HQ',
    pointType: 'building_map_reference',
    roomCenterVerified: false,
  },
] as const;

export const FSM_UNDIP_MAP_CAMERA = {
  coordinates: { latitude: -7.0486, longitude: 110.4411 },
  zoom: 16,
} as const;
