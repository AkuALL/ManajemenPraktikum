/**
 * Route & Navigation Contract Sprint 1 (GA-05)
 * Dikelola oleh: Galang
 * Sesuai Jobdesc Programmer Bagian 7 & 8 dan SRS Bagian 8.2
 */

import { UserRole } from '@/types';

export interface RouteDefinition {
  path: string;
  title: string;
  owner: 'Galang' | 'Abhi' | 'Jesica' | 'Kaka';
  description: string;
}

export const APP_ROUTES = {
  HOME: '/',
  SCHEDULE: '/schedule',
  CLASSES: '/classes',
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
