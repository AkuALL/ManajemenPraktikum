/**
 * Kontrak Data Minimum Sprint 2 — Sistem Manajemen Praktikum
 * Referensi: docs/Jobdesc_Programmer_Manajemen_Praktikum_Sprint_2.md §3
 */

import type { UserRole } from './session';

export type SessionStatusV2 = 'scheduled' | 'open' | 'closed';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type AiStatus = 'pending' | 'success' | 'failed';

export type AuthUser = {
  uid: string;
  role: UserRole;
  displayName: string;
  identifier: string;
};

export type SessionSummary = {
  id: string;
  classId: string;
  status: SessionStatusV2;
};

export type AttendanceEntry = {
  id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  attendedAt: string;
  attendedAtMs: number | null;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  distanceMeters?: number;
  isWithinRadius?: boolean;
  fromCache?: boolean;
  hasPendingWrites?: boolean;
};

export type LeaveRequest = {
  id: string;
  sessionId: string;
  classId: string;
  studentId: string;
  reason: string;
  status: LeaveStatus;
  aiStatus: AiStatus;
  aiCategory?: string;
  aiConfidence?: number;
  aiClassifiedAtMs: number | null;
  reviewedBy?: string;
  reviewedAtMs: number | null;
  reviewNote?: string;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  fromCache?: boolean;
  hasPendingWrites?: boolean;
};

export function buildAttendanceDocId(sessionId: string, studentId: string): string {
  return `${sessionId}_${studentId}`;
}

export function buildLeaveRequestDocId(sessionId: string, studentId: string): string {
  return `${sessionId}_${studentId}`;
}

export function normalizeSessionStatus(
  status: SessionStatusV2 | 'upcoming',
): SessionStatusV2 {
  return status === 'upcoming' ? 'scheduled' : status;
}
