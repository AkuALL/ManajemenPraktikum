import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { SessionStatus } from '@/features/practicum/types';

export type LabActivitySession = {
  id: string;
  classId: string;
  title: string;
  location: string;
  labId?: string;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  courseName?: string;
  className?: string;
  assistantName?: string;
};

function toIsoTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseLabActivitySession(id: string, data: DocumentData): LabActivitySession | null {
  if (typeof data.classId !== 'string' || typeof data.title !== 'string') {
    return null;
  }
  const status = data.status;
  if (status !== 'scheduled' && status !== 'open' && status !== 'closed') {
    return null;
  }
  return {
    id,
    classId: data.classId,
    title: data.title,
    location: typeof data.location === 'string' ? data.location : data.locationName ?? '',
    labId: typeof data.labId === 'string' ? data.labId : undefined,
    startsAt: toIsoTimestamp(data.startsAt),
    endsAt: toIsoTimestamp(data.endsAt),
    status,
  };
}

/**
 * Listener real-time seluruh sesi praktikum yang berstatus `open` lintas semua kelas
 * untuk menampilkan indikator lab aktif pada Peta Laboratorium.
 */
export function useOpenLabSessions() {
  const [openSessions, setOpenSessions] = useState<LabActivitySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('status', '==', 'open'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((docSnap) => parseLabActivitySession(docSnap.id, docSnap.data()))
          .filter((item): item is LabActivitySession => item !== null)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        setOpenSessions(list);
        setLoading(false);
      },
      () => {
        setOpenSessions([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { openSessions, loading };
}

/**
 * Lazy listener (NFR-03) yang hanya berlangganan sesi aktif (`open`) & mendatang (`scheduled`)
 * ketika panel detail laboratorium sedang dibuka.
 */
export function useLabDetailSessions(labId: string | null) {
  const [snapshot, setSnapshot] = useState<{
    labId: string;
    activeSessions: LabActivitySession[];
    upcomingSessions: LabActivitySession[];
  } | null>(null);

  useEffect(() => {
    if (!labId) return;

    const q = query(
      collection(db, 'sessions'),
      where('labId', '==', labId),
      where('status', 'in', ['open', 'scheduled']),
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const nowMs = Date.now();
        const list = querySnapshot.docs
          .map((docSnap) => parseLabActivitySession(docSnap.id, docSnap.data()))
          .filter((item): item is LabActivitySession => item !== null)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

        setSnapshot({
          labId,
          activeSessions: list.filter((item) => item.status === 'open'),
          upcomingSessions: list.filter((item) => {
            if (item.status !== 'scheduled') return false;
            const endMs = Date.parse(item.endsAt);
            return !Number.isFinite(endMs) || endMs >= nowMs;
          }),
        });
      },
      () => {
        setSnapshot({
          labId,
          activeSessions: [],
          upcomingSessions: [],
        });
      },
    );

    return () => unsubscribe();
  }, [labId]);

  const active = labId && snapshot?.labId === labId ? snapshot : null;

  return {
    activeSessions: active?.activeSessions ?? [],
    upcomingSessions: active?.upcomingSessions ?? [],
    loading: Boolean(labId) && !active,
  };
}
