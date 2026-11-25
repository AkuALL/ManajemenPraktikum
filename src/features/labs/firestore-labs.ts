import { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { DEFAULT_LAB_RADIUS_METERS, FSM_UNDIP_LABS } from './fsm-undip-labs';

export type StoredLab = {
  id: string;
  name: string;
  building: string;
  floor: number | null;
  capacity: number;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  plusCode?: string;
  pointType?: string;
  roomCenterVerified?: boolean;
};

function readLab(id: string, value: Record<string, unknown>): StoredLab | null {
  if (typeof value.name !== 'string' || typeof value.building !== 'string') return null;
  if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null;
  return {
    id,
    name: value.name,
    building: value.building,
    floor: typeof value.floor === 'number' ? value.floor : null,
    capacity: typeof value.capacity === 'number' ? value.capacity : 32,
    latitude: value.latitude,
    longitude: value.longitude,
    radiusMeters:
      typeof value.radiusMeters === 'number' ? value.radiusMeters : DEFAULT_LAB_RADIUS_METERS,
    isActive: value.isActive !== false,
    plusCode: typeof value.plusCode === 'string' ? value.plusCode : undefined,
    pointType: typeof value.pointType === 'string' ? value.pointType : undefined,
    roomCenterVerified:
      typeof value.roomCenterVerified === 'boolean' ? value.roomCenterVerified : undefined,
  };
}

export function useLabs() {
  const [labs, setLabs] = useState<StoredLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe: Unsubscribe = onSnapshot(
      collection(db, 'labs'),
      (snapshot) => {
        setLabs(
          snapshot.docs
            .map((item) => readLab(item.id, item.data()))
            .filter((item): item is StoredLab => item !== null)
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        setLoading(false);
      },
      () => {
        setError('Data laboratorium tidak dapat dimuat.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const saveLab = async (lab: StoredLab, userId: string) => {
    await setDoc(
      doc(db, 'labs', lab.id),
      { ...lab, updatedAt: serverTimestamp(), createdBy: userId },
      { merge: true },
    );
  };

  const deleteLab = async (labId: string) => {
    await deleteDoc(doc(db, 'labs', labId));
  };

  const seedFsmLabs = async (userId: string) => {
    await Promise.all(
      FSM_UNDIP_LABS.map((lab) =>
        setDoc(
          doc(db, 'labs', lab.id),
          {
            id: lab.id,
            name: lab.name,
            building: lab.building,
            floor: lab.floor,
            capacity: 32,
            latitude: lab.latitude,
            longitude: lab.longitude,
            radiusMeters: lab.radiusMeters,
            isActive: lab.isActive,
            plusCode: lab.plusCode,
            pointType: lab.pointType,
            roomCenterVerified: lab.roomCenterVerified,
            createdBy: userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      ),
    );
  };

  /** Memigrasikan radius data referensi lama (10 m / 65 m) ke kebijakan 50 m tanpa menyentuh lab kustom. */
  const syncDefaultLabRadius = async () => {
    const legacyDefaultRadii = new Set([10, 65]);
    const seededLabIds = Array.from(
      new Set(['lab-informatika-a', ...FSM_UNDIP_LABS.map((lab) => lab.id)]),
    );
    await Promise.all(
      seededLabIds.map(async (labId) => {
        const reference = doc(db, 'labs', labId);
        const snapshot = await getDoc(reference);
        if (snapshot.exists() && legacyDefaultRadii.has(snapshot.data().radiusMeters)) {
          await updateDoc(reference, {
            radiusMeters: DEFAULT_LAB_RADIUS_METERS,
            updatedAt: serverTimestamp(),
          });
        }
      }),
    );
  };

  return { labs, loading, error, saveLab, deleteLab, seedFsmLabs, syncDefaultLabRadius };
}
