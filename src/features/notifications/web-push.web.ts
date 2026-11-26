import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';

import { auth, db, firebaseApp } from '@/lib/firebase';

const storageKey = 'manajemen-praktikum:web-push:';
const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY?.trim();

export async function subscribeWebPush(uid: string, requestPermission = false) {
  if (typeof Notification === 'undefined' || !window.isSecureContext) return 'unsupported';

  try {
    const permission = requestPermission && Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'not-requested';
    if (!(await isSupported()) || auth.currentUser?.uid !== uid) return 'unsupported';

    const options = firebaseApp.options;
    const query = new URLSearchParams({
      apiKey: options.apiKey ?? '',
      projectId: options.projectId ?? '',
      messagingSenderId: options.messagingSenderId ?? '',
      appId: options.appId ?? '',
    });
    await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(firebaseApp), {
      serviceWorkerRegistration: registration,
      ...(vapidKey ? { vapidKey } : {}),
    });
    if (!token || auth.currentUser?.uid !== uid) return 'failed';

    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenId = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const previousId = localStorage.getItem(storageKey + uid);
    localStorage.setItem(storageKey + uid, tokenId);
    await setDoc(doc(db, 'users', uid, 'webPushTokens', tokenId), { token, updatedAt: serverTimestamp() });
    if (previousId && previousId !== tokenId) {
      await deleteDoc(doc(db, 'users', uid, 'webPushTokens', previousId));
    }
    return 'enabled';
  } catch (error) {
    console.warn('Pendaftaran push web gagal:', (error as { code?: string }).code ?? 'unknown');
    return 'failed';
  }
}

export async function unsubscribeWebPush(uid: string): Promise<void> {
  try {
    const tokenId = localStorage.getItem(storageKey + uid);
    if (!tokenId) return;
    const registration = await navigator.serviceWorker.getRegistration('/');
    await Promise.allSettled([
      deleteDoc(doc(db, 'users', uid, 'webPushTokens', tokenId)),
      registration?.pushManager.getSubscription().then((subscription) => subscription?.unsubscribe()),
      deleteToken(getMessaging(firebaseApp)),
    ]);
    localStorage.removeItem(storageKey + uid);
  } catch {
    // Logout tetap bisa dilanjutkan jika browser tidak mendukung push.
  }
}
