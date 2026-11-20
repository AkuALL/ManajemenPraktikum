/**
 * Route & Navigation Contract
 * Diperbarui sesuai desain final Header B3 + Footer B2 (Praktikan & Asisten Opsi B).
 */

import type { UserRole } from '@/types';

export interface RouteDefinition {
  path: string;
  title: string;
  owner: 'Galang' | 'Abhi' | 'Jesica' | 'Kaka';
  description: string;
}

export const APP_ROUTES = {
  HOME: '/',
  SCHEDULE: '/schedule',
  PETA: '/peta',
  PRESENSI: '/presensi',
  SCAN: '/scan',
  PROFIL: '/profil',
  CLASSES: '/classes',
  MASTER_LAB: '/master-lab',
  SESSION_DETAIL: '/detail',
  ASSISTANT_REKAP: '/rekap',
  ASSISTANT_LEAVE_REVIEW: '/review-izin',
  STUDENT_ATTENDANCE: '/kehadiran',
  STUDENT_LEAVE_REQUESTS: '/izin',
} as const;

export interface RoleTabItem {
  key: string;
  label: string;
  route: string;
  role: UserRole;
}
