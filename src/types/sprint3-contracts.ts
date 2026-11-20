/**
 * Kontrak Data Sprint 3 — Sistem Manajemen Praktikum
 * Referensi: docs/Jobdesc_Programmer_Manajemen_Praktikum_Sprint_3.md §3
 */

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export type LabLocation = {
  id: string;
  name: string;
  building: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
};

export type SessionLocationSummary = {
  sessionId: string;
  classId: string;
  title: string;
  labId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  status: 'scheduled' | 'open' | 'closed';
  startsAt: string;
  endsAt: string;
};

export type AttendanceAudit = {
  sessionId: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  attendedAt: string; // ISO string / serverTimestamp
  latitude: number;
  longitude: number;
  accuracy: number;
  distanceMeters: number;
  isWithinRadius: boolean;
};

export type NotificationType =
  | 'SESSION_OPENED'
  | 'SCHEDULE_CHANGED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED';

export type PushNotificationPayload = {
  recipientUids: string[];
  type: NotificationType;
  title: string;
  body: string;
  data: {
    sessionId?: string;
    classId?: string;
    leaveRequestId?: string;
    route?: string;
  };
};

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  radiusMeters: number;
  userCoords: Coordinates | null;
  labCoords: Coordinates;
  error?: string | null;
}
