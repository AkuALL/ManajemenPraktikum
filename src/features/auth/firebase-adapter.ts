import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import type { AuthUser, UserRole } from '@/types';

import {
  AuthPort,
  AuthPortError,
  LoginInput,
  mapFirebaseAuthError,
  RegisterInput,
  validateLoginInput,
  validateRegisterInput,
} from './port';

function isUserRole(value: unknown): value is UserRole {
  return value === 'student' || value === 'assistant';
}

function parseProfile(uid: string, data: Record<string, unknown> | undefined): AuthUser | null {
  if (!data || !isUserRole(data.role)) return null;
  if (typeof data.displayName !== 'string' || typeof data.identifier !== 'string') {
    return null;
  }

  return {
    uid,
    role: data.role,
    displayName: data.displayName,
    identifier: data.identifier,
  };
}

export const firebaseAuthAdapter: AuthPort = {
  subscribeAuthState(onChange) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      onChange(firebaseUser?.uid ?? null);
    });
  },

  async loadProfile(uid) {
    try {
      const snapshot = await getDoc(doc(db, 'users', uid));
      if (!snapshot.exists()) return null;
      return parseProfile(uid, snapshot.data());
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  },

  async register(input: RegisterInput) {
    const validationError = validateRegisterInput(input);
    if (validationError) {
      throw new AuthPortError('invalid-input', validationError);
    }

    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    const identifier = input.identifier.trim();

    let createdUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>['user'] | null =
      null;

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, input.password);
      createdUser = credential.user;

      // Match token email exactly to satisfy firestore.rules validProfileCreate.
      const tokenEmail = createdUser.email ?? email;
      await setDoc(doc(db, 'users', createdUser.uid), {
        uid: createdUser.uid,
        displayName,
        email: tokenEmail,
        role: input.role,
        identifier,
        createdAt: serverTimestamp(),
      });

      return {
        uid: createdUser.uid,
        role: input.role,
        displayName,
        identifier,
      };
    } catch (error) {
      if (createdUser) {
        await deleteUser(createdUser).catch(() => undefined);
      }
      throw mapFirebaseAuthError(error);
    }
  },

  async login(input: LoginInput) {
    const validationError = validateLoginInput(input);
    if (validationError) {
      throw new AuthPortError('invalid-input', validationError);
    }

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        input.email.trim(),
        input.password,
      );
      const profile = await this.loadProfile(credential.user.uid);
      if (!profile) {
        throw new AuthPortError(
          'profile-missing',
          'Profil akun tidak ditemukan di Firestore. Silakan coba lagi atau keluar.',
        );
      }
      return profile;
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  },

  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      throw mapFirebaseAuthError(error);
    }
  },
};
