import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react-native';

import { SubScreenHeader } from '@/components/ui/app-header';
import {
  PickerBottomSheet,
  type PickerOption,
} from '@/components/ui/picker-bottom-sheet';
import { CardListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useLabs } from '@/features/labs/firestore-labs';
import { APP_ROUTES } from '@/features/navigation';
import {
  formatSessionDate,
  formatSessionTime,
  usePracticum,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { evaluateGeofence } from '@/utils/haversine';

import { AttendanceEligibilityCard } from './AttendanceEligibilityCard';
import { useAttendance } from './context';
import { deriveAttendanceEligibility } from './eligibility';
import { resolveSessionLocationSummary } from './lab-location-fallback';
import { useAttendanceLocation } from './useAttendanceLocation';

export function AttendanceVerifyScreen() {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { user } = useAuth();
  const { labs } = useLabs();
  const { sessions, loadingSessions, sessionsError, retryData } = usePracticum();
  const { records, submitAttendance } = useAttendance();

  const isStudent = user?.role === 'student';
  const location = useAttendanceLocation(isStudent);

  const [pickedSessionId, setPickedSessionId] = useState<string | null>(null);
  const [sessionPickerVisible, setSessionPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    tone: 'success' | 'error';
    text: string;
    canRetry?: boolean;
  } | null>(null);

  const paramSessionId =
    typeof sessionId === 'string' && sessionId.trim().length > 0
      ? sessionId.trim()
      : undefined;

  const activeSession = useMemo(() => {
    const requestedId = pickedSessionId ?? paramSessionId;
    if (requestedId) {
      return sessions.find((item) => item.id === requestedId) ?? null;
    }
    return (
      sessions.find((item) => item.status === 'open') ??
      sessions.find((item) => item.status === 'scheduled') ??
      sessions[0] ??
      null
    );
  }, [paramSessionId, pickedSessionId, sessions]);

  const existingRecord = useMemo(
    () =>
      activeSession
        ? records.find((item) => item.sessionId === activeSession.id)
        : undefined,
    [activeSession, records],
  );

  const resolvedLocation = useMemo(
    () => (activeSession ? resolveSessionLocationSummary(activeSession, labs) : null),
    [activeSession, labs],
  );

  const geofence = useMemo(() => {
    if (!resolvedLocation) {
      return evaluateGeofence({
        userCoords: null,
        labCoords: { latitude: -7.765432, longitude: 110.372101 },
        radiusMeters: 50,
      });
    }
    return evaluateGeofence({
      userCoords: location.coords,
      labCoords: {
        latitude: resolvedLocation.summary.latitude,
        longitude: resolvedLocation.summary.longitude,
      },
      radiusMeters: resolvedLocation.summary.radiusMeters,
    });
  }, [location.coords, resolvedLocation]);

  const eligibility = useMemo(() => {
    if (!activeSession || !resolvedLocation) return null;
    return deriveAttendanceEligibility({
      alreadyAttended: Boolean(existingRecord),
      sessionStatus: activeSession.status,
      locationStatus: location.status,
      locationError: location.errorMessage,
      geofence,
      labName: resolvedLocation.summary.locationName,
    });
  }, [
    activeSession,
    existingRecord,
    geofence,
    location.errorMessage,
    location.status,
    resolvedLocation,
  ]);

  const sessionOptions = useMemo<PickerOption[]>(
    () =>
      sessions.map((item) => {
        const statusText =
          item.status === 'open'
            ? 'Berlangsung'
            : item.status === 'scheduled'
              ? 'Terjadwal'
              : 'Selesai';
        return {
          value: item.id,
          label: `${item.courseName ?? item.className ?? 'Praktikum'} · ${item.title}`,
          subtitle: `${statusText} · ${formatSessionTime(item.startsAt)}–${formatSessionTime(item.endsAt)} · ${item.location}`,
        };
      }),
    [sessions],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(APP_ROUTES.HOME as never);
    }
  };

  const handleSubmit = async () => {
    if (
      !activeSession ||
      !eligibility?.canSubmit ||
      !geofence.userCoords ||
      submitting ||
      existingRecord
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitFeedback(null);
    try {
      const result = await submitAttendance(
        {
          id: activeSession.id,
          classId: activeSession.classId,
          status: activeSession.status,
        },
        {
          latitude: geofence.userCoords.latitude,
          longitude: geofence.userCoords.longitude,
          accuracy:
            typeof geofence.userCoords.accuracy === 'number' &&
            Number.isFinite(geofence.userCoords.accuracy)
              ? geofence.userCoords.accuracy
              : 0,
          distanceMeters: geofence.distanceMeters,
          isWithinRadius: geofence.isWithinRadius,
        },
      );

      if (result.ok) {
        setSubmitFeedback({
          tone: 'success',
          text: 'Presensi berhasil dicatat beserta audit lokasi Anda.',
        });
      } else {
        setSubmitFeedback({
          tone: 'error',
          text: result.message,
          canRetry: result.reason === 'network' || result.reason === 'unknown',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStudent) {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.guardBody, { color: colors.textSecondary }]}>
          Halaman Presensi Mandiri hanya tersedia untuk akun Praktikan.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleBack}
          style={({ pressed }) => [
            styles.retryBtn,
            { backgroundColor: colors.balticSoft },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.retryText, { color: colors.baltic }]}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  const headerBadgeLabel = activeSession
    ? activeSession.status === 'open'
      ? `BERLANGSUNG · ${formatSessionTime(activeSession.startsAt)}`
      : activeSession.status === 'closed'
        ? 'SELESAI'
        : `TERJADWAL · ${formatSessionTime(activeSession.startsAt)}`
    : undefined;

  const headerBadgeTone = activeSession
    ? activeSession.status === 'open'
      ? 'rosy'
      : activeSession.status === 'closed'
        ? 'pacific'
        : 'mono'
    : 'mono';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SubScreenHeader
          backLabel="Kembali"
          onBack={handleBack}
          title="Presensi Praktikum"
          subtitle={
            activeSession
              ? `${activeSession.courseName ?? activeSession.className ?? 'Praktikum'} · ${activeSession.title}`
              : 'Verifikasi posisi laboratorium sebelum mencatat kehadiran'
          }
          rightBadgeLabel={headerBadgeLabel}
          rightBadgeTone={headerBadgeTone}
        />

        <View style={styles.bodyContainer}>
          {loadingSessions && sessions.length === 0 ? (
            <CardListSkeleton count={2} showActions label="Memuat data sesi presensi" />
          ) : sessionsError ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Sesi belum dapat dimuat
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                {sessionsError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retryData}
                style={({ pressed }) => [
                  styles.retryBtn,
                  { backgroundColor: colors.balticSoft },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.retryText, { color: colors.baltic }]}>Coba lagi</Text>
              </Pressable>
            </View>
          ) : !activeSession || !resolvedLocation || !eligibility ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {paramSessionId && !pickedSessionId
                  ? 'Sesi praktikum tidak ditemukan'
                  : 'Belum ada sesi praktikum'}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                {paramSessionId && !pickedSessionId
                  ? 'Sesi yang diminta sudah tidak tersedia atau Anda belum terdaftar pada kelas ini.'
                  : 'Jadwal sesi praktikum dari kelas yang Anda ikuti akan muncul di sini.'}
              </Text>
              {sessions.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSessionPickerVisible(true)}
                  style={({ pressed }) => [
                    styles.retryBtn,
                    { backgroundColor: colors.pacificSoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.retryText, { color: colors.pacificDark }]}>
                    Pilih Sesi Lain
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {/* Kartu Ringkasan Sesi (FR-01) */}
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.sessionCardHeader}>
                  <View style={styles.sessionTitleGroup}>
                    <Text style={[styles.eyebrow, { color: colors.textSubtle }]}>
                      RINGKASAN SESI
                    </Text>
                    <Text style={[styles.courseTitle, { color: colors.textPrimary }]}>
                      {activeSession.courseName ?? activeSession.className ?? 'Praktikum Lab'}
                    </Text>
                    <Text style={[styles.sessionSubtitle, { color: colors.textSecondary }]}>
                      {activeSession.title}
                      {activeSession.className ? ` · ${activeSession.className}` : ''}
                    </Text>
                  </View>

                  {sessions.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSessionPickerVisible(true)}
                      style={({ pressed }) => [
                        styles.switchSessionBtn,
                        { backgroundColor: colors.balticSoft, borderColor: colors.border },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.switchSessionText, { color: colors.baltic }]}>
                        Ganti Sesi
                      </Text>
                      <ChevronDown size={14} color={colors.baltic} strokeWidth={2.2} />
                    </Pressable>
                  ) : null}
                </View>

                <View style={[styles.metaGrid, { backgroundColor: colors.background }]}>
                  <View style={styles.metaItem}>
                    <MapPin size={14} color={colors.baltic} strokeWidth={2} />
                    <Text style={[styles.metaText, { color: colors.textPrimary }]}>
                      {resolvedLocation.summary.locationName} · {resolvedLocation.building}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Calendar size={14} color={colors.baltic} strokeWidth={2} />
                    <Text style={[styles.metaText, { color: colors.textPrimary }]}>
                      {formatSessionDate(activeSession.date, activeSession.startsAt)}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Clock size={14} color={colors.baltic} strokeWidth={2} />
                    <Text style={[styles.metaTextMono, { color: colors.textPrimary }]}>
                      {formatSessionTime(activeSession.startsAt)} –{' '}
                      {formatSessionTime(activeSession.endsAt)} WIB
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <UserCheck size={14} color={colors.baltic} strokeWidth={2} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {activeSession.assistantName ?? 'Asisten Praktikum'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Kartu Validasi Jarak, Status Radius, & Indikator GPS (FR-02, FR-03, FR-04) */}
              <AttendanceEligibilityCard
                eligibility={eligibility}
                geofence={geofence}
                labSummary={resolvedLocation.summary}
                building={resolvedLocation.building}
                isFallbackCoords={resolvedLocation.isFallbackCoords}
                locationStatus={location.status}
                lastUpdatedAt={location.lastUpdatedAt}
                isRefreshing={location.isRefreshing}
                onRefreshLocation={() => {
                  void location.refreshLocation();
                }}
              />

              {submitFeedback ? (
                <View
                  accessibilityRole="alert"
                  style={[
                    styles.feedbackBanner,
                    {
                      backgroundColor:
                        submitFeedback.tone === 'success'
                          ? colors.pacificSoft
                          : colors.rosySoft,
                      borderColor:
                        submitFeedback.tone === 'success'
                          ? colors.pacificLight
                          : colors.rosyBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackBannerText,
                      {
                        color:
                          submitFeedback.tone === 'success'
                            ? colors.pacificDark
                            : colors.rosyDark,
                      },
                    ]}
                  >
                    {submitFeedback.text}
                  </Text>
                  {submitFeedback.tone === 'error' &&
                  submitFeedback.canRetry &&
                  eligibility.canSubmit &&
                  !submitting ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        void handleSubmit();
                      }}
                      style={({ pressed }) => [
                        styles.feedbackRetryBtn,
                        { backgroundColor: colors.rosy },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.feedbackRetryText}>Coba Kirim Ulang</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* Area Aksi Presensi Terproteksi (FR-01 & FR-04) */}
              {existingRecord ? (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.pacificSoft,
                      borderColor: colors.pacificLight,
                    },
                  ]}
                >
                  <View style={styles.attendedHeader}>
                    <CheckCircle2 size={20} color={colors.pacificDark} strokeWidth={2.3} />
                    <View style={styles.attendedTextBlock}>
                      <Text style={[styles.attendedTitle, { color: colors.pacificDark }]}>
                        Presensi Tercatat
                      </Text>
                      <Text style={[styles.attendedMeta, { color: colors.pacificDark }]}>
                        {existingRecord.hasPendingWrites
                          ? 'Kehadiran dikirim dan menunggu sinkronisasi server.'
                          : `Waktu tercatat: ${existingRecord.attendedAt}`}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace(APP_ROUTES.STUDENT_ATTENDANCE as never)}
                    style={({ pressed }) => [
                      styles.historyBtn,
                      { backgroundColor: colors.baltic },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.historyBtnText}>Lihat Riwayat Presensi</Text>
                  </Pressable>
                </View>
              ) : (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Kirim Presensi"
                    accessibilityState={{ disabled: !eligibility.canSubmit || submitting }}
                    disabled={!eligibility.canSubmit || submitting}
                    onPress={() => {
                      void handleSubmit();
                    }}
                    style={({ pressed }) => [
                      styles.submitBtn,
                      {
                        backgroundColor:
                          eligibility.canSubmit && !submitting
                            ? colors.rosy
                            : colors.disabledSurface,
                      },
                      pressed && eligibility.canSubmit && !submitting && styles.pressed,
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FCFCFA" />
                    ) : (
                      <>
                        <ShieldCheck
                          size={18}
                          color={
                            eligibility.canSubmit ? '#FCFCFA' : colors.disabledText
                          }
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[
                            styles.submitBtnText,
                            {
                              color: eligibility.canSubmit
                                ? '#FCFCFA'
                                : colors.disabledText,
                            },
                          ]}
                        >
                          Kirim Presensi
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Text style={[styles.submitHint, { color: colors.textSecondary }]}>
                    {eligibility.canSubmit
                      ? 'Sesi berlangsung dan posisi Anda terverifikasi di dalam radius lab.'
                      : eligibility.reason}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <PickerBottomSheet
        visible={sessionPickerVisible}
        onClose={() => setSessionPickerVisible(false)}
        title="Pilih Sesi Praktikum"
        subtitle="Pilih sesi yang ingin Anda ikuti untuk presensi"
        options={sessionOptions}
        selectedValue={activeSession?.id ?? ''}
        onSelect={(val) => {
          setPickedSessionId(val);
          setSubmitFeedback(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 14,
  },
  bodyContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  guard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  guardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    textAlign: 'center',
  },
  guardBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionTitleGroup: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.7,
  },
  courseTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17.5,
    lineHeight: 22,
  },
  sessionSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  switchSessionBtn: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchSessionText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
  },
  metaGrid: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
  },
  metaTextMono: {
    flex: 1,
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  feedbackBanner: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
  },
  feedbackBannerText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackRetryBtn: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  feedbackRetryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: '#FCFCFA',
  },
  attendedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  attendedTextBlock: {
    flex: 1,
    gap: 3,
  },
  attendedTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
  },
  attendedMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  historyBtn: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  submitBtn: {
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14.5,
  },
  submitHint: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  retryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
