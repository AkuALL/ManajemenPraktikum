import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { UserRole } from '@/types';

import { useAuth } from './context';
import {
  AuthPortError,
  validateLoginInput,
  validateRegisterInput,
} from './port';

type AuthMode = 'login' | 'register';

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { status, error: contextError, login, register, logout, retryProfileLoad } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (status === 'profile-error') {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.brandText, { color: colors.textPrimary }]}>Praktikum</Text>
        </View>
        <View style={styles.centerContent}>
          <View
            style={[
              styles.noticeCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>
              Profil akun belum tersedia
            </Text>
            <Text style={[styles.noticeBody, { color: colors.textSecondary }]}>
              {contextError ?? 'Profil pengguna gagal dimuat dari Firestore.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Muat ulang profil"
              onPress={() => {
                void retryProfileLoad();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.actionPrimary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.actionSecondary }]}>
                Coba lagi
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keluar dari sesi"
              onPress={() => {
                void logout();
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                Keluar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const isRegister = mode === 'register';
  const identifierLabel = role === 'assistant' ? 'Kode asisten' : 'NIM';
  const identifierPlaceholder = role === 'assistant' ? 'Contoh: 20.01.0001' : 'Contoh: 23.11.0123';

  const handleSubmit = async () => {
    if (submitting) return;

    const validationMessage = isRegister
      ? validateRegisterInput({
          displayName,
          email,
          password,
          confirmPassword,
          role,
          identifier,
        })
      : validateLoginInput({ email, password });

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({
          displayName,
          email,
          password,
          confirmPassword,
          role,
          identifier,
        });
      } else {
        await login({ email, password });
      }
    } catch (err) {
      setFormError(
        err instanceof AuthPortError
          ? err.message
          : 'Operasi autentikasi gagal. Silakan coba lagi.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.brandText, { color: colors.textPrimary }]}>Praktikum</Text>
        <Link href={isRegister ? '/login' : '/register'} asChild>
          <Pressable
            accessibilityRole="link"
            disabled={submitting}
            style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
          >
            <Text style={[styles.headerActionText, { color: colors.textSecondary }]}>
              {isRegister ? 'Masuk' : 'Daftar'}
            </Text>
          </Pressable>
        </Link>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            {isRegister ? 'Buat akun praktikum' : 'Masuk ke akun'}
          </Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>
            {isRegister
              ? 'Pilih peran dan lengkapi identitas akademik Anda.'
              : 'Masuk dengan email dan kata sandi yang terdaftar.'}
          </Text>
        </View>

        {formError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.errorBanner,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.textPrimary }]}>{formError}</Text>
          </View>
        ) : null}

        {isRegister ? (
          <>
            <View style={styles.fieldSection}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Peran</Text>
              <View style={styles.roleRow}>
                {(
                  [
                    { value: 'assistant', label: 'Asisten' },
                    { value: 'student', label: 'Praktikan' },
                  ] as const
                ).map((option) => {
                  const selected = role === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityLabel={`Pilih peran ${option.label}`}
                      accessibilityState={{ selected }}
                      disabled={submitting}
                      onPress={() => setRole(option.value)}
                      style={({ pressed }) => [
                        styles.roleButton,
                        {
                          borderColor: selected ? colors.actionPrimary : colors.border,
                          backgroundColor: selected ? colors.actionPrimary : colors.surface,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleButtonText,
                          {
                            color: selected ? colors.actionSecondary : colors.textPrimary,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Field
              colors={colors}
              editable={!submitting}
              label="Nama lengkap"
              onChangeText={setDisplayName}
              placeholder="Nama lengkap"
              value={displayName}
            />

            <Field
              colors={colors}
              editable={!submitting}
              label={identifierLabel}
              onChangeText={setIdentifier}
              placeholder={identifierPlaceholder}
              tabular
              value={identifier}
            />
          </>
        ) : null}

        <Field
          autoCapitalize="none"
          autoComplete="email"
          colors={colors}
          editable={!submitting}
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="nama@kampus.ac.id"
          value={email}
        />

        <Field
          autoCapitalize="none"
          autoComplete={isRegister ? 'new-password' : 'password'}
          colors={colors}
          editable={!submitting}
          label="Kata sandi"
          onChangeText={setPassword}
          placeholder="Minimal 6 karakter"
          secureTextEntry
          value={password}
        />

        {isRegister ? (
          <Field
            autoCapitalize="none"
            autoComplete="new-password"
            colors={colors}
            editable={!submitting}
            label="Konfirmasi kata sandi"
            onChangeText={setConfirmPassword}
            placeholder="Ulangi kata sandi"
            secureTextEntry
            value={confirmPassword}
          />
        ) : null}

        <View style={styles.actionSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRegister ? 'Daftar akun baru' : 'Masuk ke akun'}
            disabled={submitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: submitting ? colors.disabledSurface : colors.actionPrimary,
              },
              pressed && !submitting && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.disabledText} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.actionSecondary }]}>
                {isRegister ? 'Daftar' : 'Masuk'}
              </Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
            </Text>
            <Link href={isRegister ? '/login' : '/register'} asChild>
              <Pressable
                accessibilityRole="link"
                disabled={submitting}
                style={({ pressed }) => [styles.footerLinkButton, pressed && styles.pressed]}
              >
                <Text style={[styles.footerLink, { color: colors.textPrimary }]}>
                  {isRegister ? 'Masuk' : 'Daftar sekarang'}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  colors: (typeof Colors)[keyof typeof Colors];
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoComplete?: 'email' | 'password' | 'new-password' | 'off';
  tabular?: boolean;
};

function Field({
  colors,
  label,
  value,
  onChangeText,
  placeholder,
  editable,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoComplete = 'off',
  tabular = false,
}: FieldProps) {
  return (
    <View style={styles.fieldSection}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          tabular && styles.tabular,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  headerAction: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  noticeCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  noticeBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  titleSection: {
    marginBottom: 4,
    gap: 6,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  fieldSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '400',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionSection: {
    marginTop: 8,
    gap: 12,
  },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '400',
  },
  footerLinkButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
});
