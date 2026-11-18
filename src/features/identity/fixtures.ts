/**
 * Identity Fixtures (GA-01)
 * Data dummy stabil untuk Asisten dan Praktikan
 * Sesuai SRS & Design Baseline Bagian 5
 */

import { IdentityFixtureItem } from './types';

export const ASSISTANT_FIXTURES: IdentityFixtureItem[] = [
  {
    id: 'AS-202401',
    name: 'Budi Pratama',
    identifier: 'AS-202401',
    role: 'assistant',
    description: 'Koordinator Praktikum',
  },
  {
    id: 'AS-202402',
    name: 'Siti Rahmawati',
    identifier: 'AS-202402',
    role: 'assistant',
    description: 'Asisten Lab',
  },
];

export const STUDENT_FIXTURES: IdentityFixtureItem[] = [
  {
    id: '2402030201',
    name: 'Anintya Putri',
    identifier: '2402030201',
    role: 'student',
    description: 'Praktikan',
  },
  {
    id: '2402030202',
    name: 'Dimas Saputra',
    identifier: '2402030202',
    role: 'student',
    description: 'Praktikan',
  },
];

export function getIdentitiesByRole(role: 'assistant' | 'student'): IdentityFixtureItem[] {
  return role === 'assistant' ? ASSISTANT_FIXTURES : STUDENT_FIXTURES;
}
