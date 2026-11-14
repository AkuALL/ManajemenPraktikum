import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

type ReactNativeAuthExports = typeof FirebaseAuth & {
  getReactNativePersistence?: (
    storage: typeof AsyncStorage,
  ) => Persistence;
};

function readRequiredEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Firebase belum dikonfigurasi. Isi ${name} pada file .env berdasarkan .env.example.`,
    );
  }

  return value;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: readRequiredEnv(
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: readRequiredEnv(
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: readRequiredEnv(
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: readRequiredEnv(
    'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: readRequiredEnv(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: readRequiredEnv(
    'EXPO_PUBLIC_FIREBASE_APP_ID',
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  ),
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return getAuth(firebaseApp);
  }

  const nativeAuth = FirebaseAuth as ReactNativeAuthExports;

  try {
    if (nativeAuth.getReactNativePersistence) {
      return initializeAuth(firebaseApp, {
        persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
      });
    }
  } catch {
    // Fast Refresh may initialize Auth more than once. getAuth returns it safely.
  }

  return getAuth(firebaseApp);
}

export const auth = createAuth();
export const db = getFirestore(firebaseApp);
