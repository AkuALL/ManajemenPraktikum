/**
 * Identity Fixtures (GA-01)
 * Data dummy stabil untuk Asisten dan Praktikan
 * Sesuai SRS & Design Baseline Bagian 5
 */

import { IdentityFixtureItem } from './types';

export const ASSISTANT_FIXTURES: IdentityFixtureItem[] = [
  {
    id: 'ast-001',
    name: 'Alex Wibowo',
    identifier: '20.01.0001',
    role: 'assistant',
    description: 'Koordinator Praktikum',
  },
  {
    id: 'ast-002',
    name: 'Maya Lestari',
    identifier: '20.01.0002',
    role: 'assistant',
    description: 'Asisten Lab',
  },
];

export const STUDENT_FIXTURES: IdentityFixtureItem[] = [
  {
    id: 'std-001',
    name: 'Nadia Putri',
    identifier: '23.11.0123',
    role: 'student',
    description: 'Praktikan - Kelas B',
  },
  {
    id: 'std-002',
    name: 'Rafi Pratama',
    identifier: '23.11.0147',
    role: 'student',
    description: 'Praktikan - Kelas B',
  },
];

export function getIdentitiesByRole(role: 'assistant' | 'student'): IdentityFixtureItem[] {
  return role === 'assistant' ? ASSISTANT_FIXTURES : STUDENT_FIXTURES;
}
