
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { AttendanceRecord } from '@/types';

export interface LocalAttendanceRecord extends AttendanceRecord {
  /** Nama sesi disimpan saat pencatatan agar riwayat bisa ditampilkan tanpa lookup jadwal */
  sessionName: string;
  /** Kelas / Course class sesi */
  sessionClass?: string;
}

interface AttendanceContextValue {
  records: LocalAttendanceRecord[];
  /**
   * Catat presensi. Mengembalikan:
   * - 'recorded'  → berhasil dicatat untuk pertama kali
   * - 'duplicate' → sudah tercatat, catatan pertama dipertahankan
   */
  recordAttendance: (
    params: Omit<LocalAttendanceRecord, 'id' | 'attendedAt'>
  ) => 'recorded' | 'duplicate';
  /** Ambil catatan presensi untuk satu identitas pada satu sesi, atau undefined jika belum ada */
  getRecord: (studentId: string, sessionId: string) => LocalAttendanceRecord | undefined;
  /** Semua catatan milik satu identitas aktif */
  getRecordsByStudent: (studentId: string) => LocalAttendanceRecord[];
}

const AttendanceContext = createContext<AttendanceContextValue | undefined>(undefined);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<LocalAttendanceRecord[]>([]);

  const getRecord = useCallback(
    (studentId: string, sessionId: string): LocalAttendanceRecord | undefined =>
      records.find((r) => r.studentId === studentId && r.sessionId === sessionId),
    [records]
  );

  const getRecordsByStudent = useCallback(
    (studentId: string): LocalAttendanceRecord[] =>
      records.filter((r) => r.studentId === studentId),
    [records]
  );

  const recordAttendance = useCallback(
    (params: Omit<LocalAttendanceRecord, 'id' | 'attendedAt'>): 'recorded' | 'duplicate' => {
      // Cek duplikasi — kunci unik studentId + sessionId
      const existing = records.find(
        (r) => r.studentId === params.studentId && r.sessionId === params.sessionId
      );
      if (existing) {
        return 'duplicate';
      }

      const now = new Date();
      const attendedAt = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const newRecord: LocalAttendanceRecord = {
        id: `att-${params.studentId}-${params.sessionId}-${Date.now()}`,
        attendedAt,
        ...params,
      };

      setRecords((prev) => [...prev, newRecord]);
      return 'recorded';
    },
    [records]
  );

  const value = useMemo(
    () => ({ records, recordAttendance, getRecord, getRecordsByStudent }),
    [records, recordAttendance, getRecord, getRecordsByStudent]
  );

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}

export function useAttendance(): AttendanceContextValue {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error('useAttendance must be used within an AttendanceProvider.');
  }
  return ctx;
}
