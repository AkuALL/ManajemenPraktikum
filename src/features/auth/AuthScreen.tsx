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

import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { UserRole } from '@/types';

import { useAuth } from './context';
import {
  AuthPortError,
  validateLoginInput,
  validateRegisterInput,
} from './port';

type AuthMode = 'login' | 'register';

type QuickProfile = {
  id: string;
  role: UserRole;
  displayName: string;
  subtitle: string;
  email: string;
  identifier: string;
  password: string;
};

const QUICK_PROFILES: readonly QuickProfile[] = [
  {
    id: 'student-demo',
    role: 'student',
    displayName: 'Al Rivaldi',
    subtitle: '2402030201 · Praktikan',
    email: 'praktikan1@praktikum.ac.id',
    identifier: '2402030201',
    password: 'Password123!',
  },
  {
    id: 'assistant-demo',
    role: 'assistant',
    displayName: 'Galang Bintang',
    subtitle: '2402030101 · Asisten Lab',
    email: 'asisten1@praktikum.ac.id',
    identifier: '2402030101',
    password: 'Password123!',
  },
];

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { status, error: contextError, login, register, logout, retryProfileLoad } = useAuth();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

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
        <View style={styles.centerContent}>
          <View
            style={[
              styles.formCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
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
                { backgroundColor: colors.rosy },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Coba lagi</Text>
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
  const identifierPlaceholder =
    role === 'assistant' ? 'Contoh: 2402030101' : 'Contoh: 2402030201';

  const applyQuickProfile = (profile: QuickProfile) => {
    setRole(profile.role);
    setEmail(profile.email);
    setIdentifier(profile.identifier);
    setPassword(profile.password);
    setFormError(null);
  };

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.baltic }]}>
          <View style={styles.heroOrb} pointerEvents="none" />
          <View style={styles.heroTopRow}>
            <View style={styles.heroPill}>
              <View style={[styles.heroDot, { backgroundColor: colors.pacific }]} />
              <Text style={styles.heroPillText}>PRAKTIKUM</Text>
            </View>
            <Text style={styles.heroYear}>2026/2027</Text>
          </View>

          <Text style={styles.heroTitle}>
            {isRegister ? 'Daftar Akun' : 'Masuk Akun'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isRegister
              ? 'Pilih peran dan lengkapi identitas akademik untuk akses jadwal lab.'
              : 'Lihat jadwal, unduh modul, dan scan QR langsung di lab.'}
          </Text>
        </View>

        <View
          style={[
            styles.roleSegment,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {(
            [
              { value: 'student', label: 'Praktikan' },
              { value: 'assistant', label: 'Asisten Lab' },
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
                  styles.roleSegmentBtn,
                  selected && { backgroundColor: colors.baltic },
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.roleSegmentText,
                    { color: selected ? '#FCFCFA' : colors.textPrimary },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.formCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {formError ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.errorBanner,
                { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.rosyDark }]}>{formError}</Text>
            </View>
          ) : null}

          {isRegister ? (
            <Field
              colors={colors}
              editable={!submitting}
              label="Nama lengkap"
              onChangeText={setDisplayName}
              placeholder="Nama lengkap mahasiswa atau asisten"
              value={displayName}
            />
          ) : null}

          <Field
            autoCapitalize="none"
            autoComplete="email"
            colors={colors}
            editable={!submitting}
            keyboardType="email-address"
            label="Email kampus"
            onChangeText={setEmail}
            placeholder={
              role === 'assistant' ? 'asisten1@praktikum.ac.id' : 'praktikan1@praktikum.ac.id'
            }
            value={email}
          />

          {isRegister ? (
            <Field
              autoCapitalize="none"
              colors={colors}
              editable={!submitting}
              label={identifierLabel}
              onChangeText={setIdentifier}
              placeholder={identifierPlaceholder}
              mono
              value={identifier}
            />
          ) : null}

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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isRegister ? 'Daftar akun baru' : 'Masuk ke dasbor'}
            disabled={submitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: submitting ? colors.disabledSurface : colors.rosy,
              },
              pressed && !submitting && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.disabledText} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegister ? 'Daftar Akun' : 'Masuk ke Dasbor'}
              </Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.textSecondary }]}>
              {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
            </Text>
            <Link href={isRegister ? '/login' : '/register'} asChild>
              <Pressable accessibilityRole="link" disabled={submitting}>
                <Text style={[styles.switchLink, { color: colors.baltic }]}>
                  {isRegister ? 'Masuk Akun' : 'Daftar sekarang'}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        {!isRegister ? (
          <View
            style={[
              styles.simCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.simHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Simulasi cepat
              </Text>
              <Text style={[styles.simCount, { color: colors.textSubtle }]}>
                {QUICK_PROFILES.length} profil
              </Text>
            </View>

            <View style={styles.simList}>
              {QUICK_PROFILES.map((profile) => {
                const active = email.trim().toLowerCase() === profile.email;
                return (
                  <Pressable
                    key={profile.id}
                    accessibilityRole="button"
                    disabled={submitting}
                    onPress={() => applyQuickProfile(profile)}
                    style={({ pressed }) => [
                      styles.simRow,
                      {
                        backgroundColor: colors.background,
                        borderColor: active ? colors.pacific : colors.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.simInfo}>
                      <Text style={[styles.simName, { color: colors.textPrimary }]}>
                        {profile.displayName}
                      </Text>
                      <Text style={[styles.simSub, { color: colors.textSecondary }]}>
                        {profile.subtitle}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.simBadge,
                        {
                          backgroundColor: active ? colors.pacificSoft : colors.balticSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.simBadgeText,
                          { color: active ? colors.pacificDark : colors.baltic },
                        ]}
                      >
                        {active ? 'Aktif' : 'Pilih'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
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
  mono?: boolean;
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
  mono = false,
}: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.textPrimary,
            fontFamily: mono ? FontFamily.monoMedium : FontFamily.sansRegular,
          },
          mono && styles.tabular,
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 32,
    gap: 12,
  },
  heroCard: {
    borderRadius: 26,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
    gap: 8,
  },
  heroOrb: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(31, 167, 193, 0.16)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPill: {
    backgroundColor: 'rgba(13, 35, 54, 0.28)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroPillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    color: '#FCFCFA',
  },
  heroYear: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    color: 'rgba(252, 252, 250, 0.78)',
    fontVariant: ['tabular-nums'],
  },
  heroTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 24,
    lineHeight: 30,
    color: '#FCFCFA',
    marginTop: 4,
  },
  heroSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: 'rgba(252, 252, 250, 0.84)',
  },
  roleSegment: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  roleSegmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleSegmentText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13.5,
  },
  formCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
    lineHeight: 18,
  },
  noticeBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 13.5,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  primaryButton: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14.5,
    color: '#FCFCFA',
  },
  secondaryButton: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  switchLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
  },
  switchLink: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  simCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15.5,
  },
  simCount: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
  },
  simList: {
    gap: 8,
  },
  simRow: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  simInfo: {
    flex: 1,
    gap: 2,
  },
  simName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  simSub: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  simBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  simBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
