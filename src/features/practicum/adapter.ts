import { PracticumPort } from './port';
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
    // Sprint 2 memiliki Firestore sebagai satu-satunya sumber data runtime.
    // MockPracticumAdapter hanya dipakai oleh test melalui setPracticumAdapter().
    adapterInstance = new FirestorePracticumAdapter();
  }
  return adapterInstance;
}

/**
 * Untuk keperluan pengujian atau forcing adapter tertentu
 */
export function setPracticumAdapter(adapter: PracticumPort): void {
  adapterInstance = adapter;
}
