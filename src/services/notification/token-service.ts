import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

type PushRegistrationResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'unsupported' | 'permission-denied' | 'project-missing' | 'token-unavailable' };

/**
 * Meminta izin notifikasi dan menyimpan Expo push token milik perangkat aktif.
 * Tidak melempar error supaya registrasi token tidak pernah memblokir sesi pengguna.
 */
export async function registerDevicePushToken(userId: string): Promise<PushRegistrationResult> {
  if (!userId || Platform.OS === 'web') {
    return { ok: false, reason: 'unsupported' };
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('practicum-alerts', {
        name: 'Notifikasi praktikum',
        importance: AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const permission =
      existing.status === 'granted'
        ? existing
        : await Notifications.requestPermissionsAsync();

    if (permission.status !== 'granted') {
      return { ok: false, reason: 'permission-denied' };
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      return { ok: false, reason: 'project-missing' };
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token) {
      return { ok: false, reason: 'token-unavailable' };
    }

    await updateDoc(doc(db, 'users', userId), {
      pushTokens: arrayUnion(token),
      lastTokenUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'token-unavailable' };
  }
}
