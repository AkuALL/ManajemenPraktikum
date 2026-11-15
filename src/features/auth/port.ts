import type { AuthUser, UserRole } from '@/types';

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  identifier: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthErrorCode =
  | 'invalid-input'
  | 'invalid-credentials'
  | 'email-in-use'
  | 'weak-password'
  | 'profile-missing'
  | 'network'
  | 'permission-denied'
  | 'unknown';

export class AuthPortError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthPortError';
    this.code = code;
  }
}

export interface AuthPort {
  subscribeAuthState(onChange: (uid: string | null) => void): () => void;
  loadProfile(uid: string): Promise<AuthUser | null>;
  register(input: RegisterInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthUser>;
  logout(): Promise<void>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(input: LoginInput): string | null {
  const email = input.email.trim();
  if (!email) return 'Email wajib diisi.';
  if (!EMAIL_REGEX.test(email)) return 'Format email tidak valid.';
  if (!input.password) return 'Kata sandi wajib diisi.';
  if (input.password.length < 6) return 'Kata sandi minimal 6 karakter.';
  return null;
}

export function validateRegisterInput(input: RegisterInput): string | null {
  if (input.displayName.trim().length < 2) {
    return 'Nama lengkap minimal 2 karakter.';
  }
  const email = input.email.trim();
  if (!email) return 'Email wajib diisi.';
  if (!EMAIL_REGEX.test(email)) return 'Format email tidak valid.';
  if (input.identifier.trim().length < 3) {
    return input.role === 'assistant'
      ? 'Kode asisten minimal 3 karakter.'
      : 'NIM minimal 3 karakter.';
  }
  if (input.password.length < 6) {
    return 'Kata sandi minimal 6 karakter.';
  }
  if (input.password !== input.confirmPassword) {
    return 'Konfirmasi kata sandi tidak cocok.';
  }
  return null;
}

export function mapFirebaseAuthError(error: unknown): AuthPortError {
  if (error instanceof AuthPortError) return error;

  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return new AuthPortError('invalid-input', 'Format email tidak valid.');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new AuthPortError(
        'invalid-credentials',
        'Email atau kata sandi tidak sesuai.',
      );
    case 'auth/email-already-in-use':
      return new AuthPortError(
        'email-in-use',
        'Email ini sudah terdaftar. Gunakan akun lain atau masuk.',
      );
    case 'auth/weak-password':
      return new AuthPortError(
        'weak-password',
        'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.',
      );
    case 'auth/too-many-requests':
      return new AuthPortError(
        'unknown',
        'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.',
      );
    case 'auth/network-request-failed':
    case 'unavailable':
      return new AuthPortError(
        'network',
        'Koneksi terputus. Periksa jaringan lalu coba lagi.',
      );
    case 'permission-denied':
      return new AuthPortError(
        'permission-denied',
        'Akses profil ditolak oleh aturan keamanan.',
      );
    default:
      return new AuthPortError(
        'unknown',
        error instanceof Error && error.message
          ? error.message
          : 'Terjadi kesalahan autentikasi.',
      );
  }
}
