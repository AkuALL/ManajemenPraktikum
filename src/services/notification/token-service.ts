import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { arrayRemove, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

const PUSH_TOKEN_STORAGE_KEY = '@manajemen-praktikum/push-token';

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

    const userRef = doc(db, 'users', userId);
    const profile = await getDoc(userRef);
    const existingTokens = profile.data()?.pushTokens;
    const retained = Array.isArray(existingTokens)
      ? existingTokens.filter((item): item is string => typeof item === 'string' && item !== token).slice(-4)
      : [];
    await updateDoc(userRef, {
      pushTokens: [...retained, token],
      lastTokenUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, JSON.stringify({ userId, token }));

    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'token-unavailable' };
  }
}

/** Hapus token perangkat dari akun saat logout agar perangkat bersama tidak menerima notifikasi akun lama. */
export async function unregisterDevicePushToken(userId: string): Promise<void> {
  if (!userId || Platform.OS === 'web') return;
  try {
    const stored = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (!stored) return;
    const registration = JSON.parse(stored) as { userId?: unknown; token?: unknown };
    if (registration.userId !== userId || typeof registration.token !== 'string') return;
    await updateDoc(doc(db, 'users', userId), {
      pushTokens: arrayRemove(registration.token),
      lastTokenUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    // Logout must remain available when the device is offline.
  }
}
