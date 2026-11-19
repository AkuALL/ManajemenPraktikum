import React, { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { ChevronLeft, Zap } from 'lucide-react-native';

import { generateSessionQrCode } from '@/components/ui/qr-session-bottom-sheet';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAttendance } from '@/features/attendance';
import { APP_ROUTES } from '@/features/navigation';
import { formatSessionTime, usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ScanQrScreen() {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { sessions } = usePracticum();
  const { records, submitAttendance } = useAttendance();

  const [flashOn, setFlashOn] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error';
    text: string;
  } | null>(null);

  const openSessions = useMemo(
    () => sessions.filter((item) => item.status === 'open'),
    [sessions],
  );
  const activeSession = openSessions[0] ?? null;

  const expectedCode = activeSession ? generateSessionQrCode(activeSession.id) : null;
  const alreadyAttended = activeSession
    ? records.some((r) => r.sessionId === activeSession.id)
    : false;

  const handleSubmit = async () => {
    if (!activeSession || submitting || alreadyAttended) return;

    const normalizedInput = sessionCodeInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normalizedExpected = (expectedCode ?? '').replace(/[^A-Z0-9]/g, '');

    if (normalizedInput.length > 0 && normalizedInput !== normalizedExpected) {
      setFeedback({
        tone: 'error',
        text: `Kode tidak cocok dengan sesi aktif (${expectedCode}). Periksa QR asisten.`,
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await submitAttendance({
      id: activeSession.id,
      classId: activeSession.classId,
      status: activeSession.status,
    });
    setSubmitting(false);

    if (result.ok) {
      setFeedback({
        tone: 'success',
        text: 'Presensi berhasil dicatat. Mengarahkan ke Riwayat...',
      });
      setTimeout(() => {
        router.replace(APP_ROUTES.STUDENT_ATTENDANCE as never);
      }, 650);
    } else {
      setFeedback({
        tone: 'error',
        text: result.message,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: '#0D2336' }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.topPill, pressed && styles.pressed]}
          >
            <ChevronLeft size={15} color="#FCFCFA" strokeWidth={2.4} />
            <Text style={styles.topPillText}>Tutup</Text>
          </Pressable>

          <Text style={styles.topTitle}>Scan QR Presensi</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: flashOn }}
            onPress={() => setFlashOn((prev) => !prev)}
            style={({ pressed }) => [
              styles.flashPill,
              {
                backgroundColor: flashOn ? colors.pacific : 'rgba(31, 167, 193, 0.2)',
              },
              pressed && styles.pressed,
            ]}
          >
            <Zap size={13} color={flashOn ? '#FCFCFA' : '#BCE8F2'} strokeWidth={2.2} />
            <Text style={[styles.flashText, { color: flashOn ? '#FCFCFA' : '#BCE8F2' }]}>
              Flash
            </Text>
          </Pressable>
        </View>

        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: colors.pacific }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: colors.pacific }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: colors.pacific }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: colors.pacific }]} />
            <View style={[styles.laserLine, { backgroundColor: colors.rosy }]} />
          </View>

          <Text style={styles.promptTitle}>Arahkan kamera ke kode QR asisten</Text>
          <Text style={styles.promptSubtitle}>
            Presensi tercatat otomatis setelah QR terbaca atau masukkan kode sesi.
          </Text>
        </View>

        <View style={[styles.bottomCard, { backgroundColor: '#FCFCFA' }]}>
          {activeSession ? (
            <>
              <View style={styles.sessionTop}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>
                    {activeSession.courseName ?? activeSession.title}
                  </Text>
                  <Text style={styles.sessionMeta} numberOfLines={1}>
                    {activeSession.location} · {formatSessionTime(activeSession.startsAt)}–
                    {formatSessionTime(activeSession.endsAt)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.readyPill,
                    {
                      backgroundColor: alreadyAttended
                        ? colors.balticSoft
                        : colors.pacificSoft,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.readyDot,
                      { backgroundColor: alreadyAttended ? colors.baltic : colors.pacific },
                    ]}
                  />
                  <Text
                    style={[
                      styles.readyText,
                      { color: alreadyAttended ? colors.baltic : colors.pacificDark },
                    ]}
                  >
                    {alreadyAttended ? 'Tercatat' : 'Siap Scan'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.codePrefix, { color: colors.textSecondary }]}>
                    Atau kode 6 digit:
                  </Text>
                  <TextInput
                    value={sessionCodeInput}
                    onChangeText={(value) => {
                      setSessionCodeInput(value.toUpperCase());
                      if (feedback) setFeedback(null);
                    }}
                    editable={!submitting && !alreadyAttended}
                    autoCapitalize="characters"
                    maxLength={8}
                    placeholder={expectedCode ?? 'ABC-123'}
                    placeholderTextColor={colors.textSubtle}
                    style={[styles.codeInput, { color: colors.textPrimary }]}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={submitting || alreadyAttended}
                  onPress={() => void handleSubmit()}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    {
                      backgroundColor: alreadyAttended ? colors.baltic : colors.rosy,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FCFCFA" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {alreadyAttended ? 'Hadir' : 'Kirim'}
                    </Text>
                  )}
                </Pressable>
              </View>

              {feedback ? (
                <Text
                  accessibilityRole="alert"
                  style={[
                    styles.feedbackText,
                    {
                      color: feedback.tone === 'success' ? colors.pacificDark : colors.rosy,
                    },
                  ]}
                >
                  {feedback.text}
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.noSessionBox}>
              <Text style={styles.sessionTitle}>Belum ada sesi yang dibuka</Text>
              <Text style={styles.sessionMeta}>
                Tunggu asisten membuka sesi praktikum agar QR presensi aktif.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    justifyContent: 'space-between',
    gap: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  topPill: {
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(252, 252, 250, 0.14)',
    paddingLeft: 8,
    paddingRight: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
    color: '#FCFCFA',
  },
  topTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16.5,
    color: '#FCFCFA',
  },
  flashPill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  flashText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  viewfinderWrap: {
    alignItems: 'center',
    gap: 12,
  },
  viewfinder: {
    width: 248,
    height: 248,
    borderRadius: 28,
    backgroundColor: '#0B2A42',
    borderWidth: 1,
    borderColor: 'rgba(252, 252, 250, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
  },
  cornerTL: {
    top: 22,
    left: 22,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 22,
    right: 22,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 22,
    left: 22,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 22,
    right: 22,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  laserLine: {
    width: '76%',
    height: 3,
    borderRadius: 2,
  },
  promptTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    color: '#FCFCFA',
    textAlign: 'center',
  },
  promptSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: 'rgba(188, 232, 242, 0.82)',
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  bottomCard: {
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    color: '#0D2336',
  },
  sessionMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
    color: '#4E6273',
  },
  readyPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  readyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  readyText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codePrefix: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
  },
  codeInput: {
    flex: 1,
    fontFamily: FontFamily.monoMedium,
    fontSize: 13.5,
    paddingVertical: 0,
    fontVariant: ['tabular-nums'],
  },
  submitBtn: {
    height: 46,
    borderRadius: 15,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  feedbackText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 17,
  },
  noSessionBox: {
    gap: 4,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.78,
  },
});
