import { AttendanceRecord } from '@/types';

export const DEMO_ATTENDANCE_BY_SESSION: Record<string, AttendanceRecord[]> = {
  'session-basis-data-01': [
    {
      id: 'demo-basis-data-01-nadia',
      sessionId: 'session-basis-data-01',
      studentId: 'demo-student-nadia',
      studentName: 'Nadia Putri',
      attendedAt: '27 Okt 2026, 12.56 WIB',
    },
    {
      id: 'demo-basis-data-01-rafi',
      sessionId: 'session-basis-data-01',
      studentId: 'demo-student-rafi',
      studentName: 'Rafi Pratama',
      attendedAt: '27 Okt 2026, 12.59 WIB',
    },
  ],
  'session-dasar-pemrograman-01': [
    {
      id: 'demo-dasar-pemrograman-01-salsa',
      sessionId: 'session-dasar-pemrograman-01',
      studentId: 'demo-student-salsa',
      studentName: 'Salsa Aulia',
      attendedAt: '28 Okt 2026, 08.03 WIB',
    },
  ],
  'session-jaringan-komputer-01': [],
};

export function getDemoAttendanceForSession(sessionId: string): AttendanceRecord[] {
  return DEMO_ATTENDANCE_BY_SESSION[sessionId] ?? [];
}
