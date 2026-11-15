import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AuthPortError,
  mapFirebaseAuthError,
  validateLoginInput,
  validateRegisterInput,
} from '../port.ts';

test('validateLoginInput accepts valid credentials and rejects bad input', () => {
  assert.equal(validateLoginInput({ email: '', password: 'secret' }), 'Email wajib diisi.');
  assert.equal(
    validateLoginInput({ email: 'salah', password: 'secret' }),
    'Format email tidak valid.',
  );
  assert.equal(
    validateLoginInput({ email: 'al@kampus.ac.id', password: '123' }),
    'Kata sandi minimal 6 karakter.',
  );
  assert.equal(validateLoginInput({ email: 'al@kampus.ac.id', password: 'secret' }), null);
});

test('validateRegisterInput enforces identifier label per role and password confirmation', () => {
  assert.equal(
    validateRegisterInput({
      displayName: 'AL',
      email: 'al@kampus.ac.id',
      password: 'secret',
      confirmPassword: 'secret',
      role: 'student',
      identifier: '12',
    }),
    'NIM minimal 3 karakter.',
  );

  assert.equal(
    validateRegisterInput({
      displayName: 'AL',
      email: 'al@kampus.ac.id',
      password: 'secret',
      confirmPassword: 'secret',
      role: 'assistant',
      identifier: '12',
    }),
    'Kode asisten minimal 3 karakter.',
  );

  assert.equal(
    validateRegisterInput({
      displayName: 'AL',
      email: 'al@kampus.ac.id',
      password: 'secret',
      confirmPassword: 'beda',
      role: 'student',
      identifier: '23.11.0123',
    }),
    'Konfirmasi kata sandi tidak cocok.',
  );

  assert.equal(
    validateRegisterInput({
      displayName: 'AL',
      email: 'al@kampus.ac.id',
      password: 'secret',
      confirmPassword: 'secret',
      role: 'student',
      identifier: '23.11.0123',
    }),
    null,
  );
});

test('mapFirebaseAuthError maps known Firebase Auth codes and preserves AuthPortError', () => {
  const existing = new AuthPortError('profile-missing', 'Custom');
  assert.equal(mapFirebaseAuthError(existing), existing);

  assert.equal(mapFirebaseAuthError({ code: 'auth/invalid-credential' }).code, 'invalid-credentials');
  assert.equal(mapFirebaseAuthError({ code: 'auth/email-already-in-use' }).code, 'email-in-use');
  assert.equal(mapFirebaseAuthError({ code: 'auth/network-request-failed' }).code, 'network');
  assert.equal(mapFirebaseAuthError({ code: 'permission-denied' }).code, 'permission-denied');
});
