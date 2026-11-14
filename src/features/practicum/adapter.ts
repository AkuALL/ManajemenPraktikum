import { PracticumPort } from './port';
import { MockPracticumAdapter } from './mock-adapter';
import { FirestorePracticumAdapter } from './firestore-adapter';

let adapterInstance: PracticumPort | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function getPracticumAdapter(): PracticumPort {
  if (!adapterInstance) {
    if (isFirebaseConfigured()) {
      adapterInstance = new FirestorePracticumAdapter();
    } else {
      adapterInstance = new MockPracticumAdapter();
    }
  }
  return adapterInstance;
}

/**
 * Untuk keperluan pengujian atau forcing adapter tertentu
 */
export function setPracticumAdapter(adapter: PracticumPort): void {
  adapterInstance = adapter;
}
