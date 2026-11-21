import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, FileText, MapPin, QrCode } from 'lucide-react-native';

import { SubScreenHeader } from '@/components/ui/app-header';
import { QrSessionBottomSheet } from '@/components/ui/qr-session-bottom-sheet';
import { CardListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { AssistantSessionRosterPanel, useAttendance } from '@/features/attendance';
import { useIdentity } from '@/features/identity';
import { LeaveRequestAction } from '@/features/leave';
import { APP_ROUTES } from '@/features/navigation';
import {
  formatSessionDate,
  formatSessionTime,
  SessionLifecycleButtons,
  usePracticum,
} from '@/features/practicum';
import { SessionDetail } from '@/features/schedule/SessionDetail';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';
import type { LabSession } from '@/types';

const DEFAULT_MODULES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] as const;

export default function SessionDetailScreen() {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { activeIdentity } = useIdentity();
  const isAssistant = activeIdentity?.role === 'assistant';

  const {
    sessions: practicumSessions,
    loadingSessions,
    openSession,
    closeSession,
    deleteSession,
  } = usePracticum();

  const { records } = useAttendance();
  const [qrVisible, setQrVisible] = useState(false);

  const practicumSession = practicumSessions.find((s) => s.id === sessionId);

  const classSessions = useMemo(() => {
    if (!practicumSession) return [];
    return practicumSessions.filter((s) => s.classId === practicumSession.classId);
  }, [practicumSession, practicumSessions]);

  const currentModuleIndex = useMemo(() => {
    if (!practicumSession) return 0;
    const match = /(?:modul|pertemuan)\s*0?(\d+)/i.exec(practicumSession.title);
    if (match) {
      const idx = Math.max(0, Number(match[1]) - 1);
      return idx;
    }
    const foundIdx = classSessions.findIndex((s) => s.id === practicumSession.id);
    return foundIdx >= 0 ? foundIdx : 0;
  }, [classSessions, practicumSession]);

  const attendanceEntry = useMemo(
    () => records.find((item) => item.sessionId === sessionId),
    [records, sessionId],
  );

  const session: LabSession | null = practicumSession
    ? {
        id: practicumSession.id,
        classId: practicumSession.classId,
        practicumName: practicumSession.title,
        courseClass: practicumSession.courseName ?? practicumSession.className ?? 'Kelas Praktikum',
        location: practicumSession.location,
        date: formatSessionDate(practicumSession.date, practicumSession.startsAt),
        startsAt: formatSessionTime(practicumSession.startsAt),
        endsAt: formatSessionTime(practicumSession.endsAt),
        status:
          practicumSession.status === 'scheduled'
            ? 'upcoming'
            : practicumSession.status === 'open'
              ? 'open'
              : 'closed',
        assistantName: practicumSession.assistantName ?? 'Asisten Praktikum',
      }
    : null;

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    router.replace('/schedule');
  };

  const statusPillText = session
    ? session.status === 'open'
      ? `BERLANGSUNG · ${session.startsAt}`
      : session.status === 'closed'
        ? 'SELESAI'
        : `TERJADWAL · ${session.startsAt}`
    : '';

  const totalModules = Math.max(DEFAULT_MODULES.length, classSessions.length);
  const moduleChips = Array.from({ length: Math.min(totalModules, 6) }, (_, idx) => {
    const linkedSession = classSessions[idx];
    return {
      code: `M${idx + 1}`,
      active: linkedSession ? linkedSession.id === practicumSession?.id : idx === currentModuleIndex % 6,
      past: idx < currentModuleIndex % 6,
      sessionId: linkedSession?.id,
    };
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SubScreenHeader
          backLabel="Beranda"
          onBack={() => router.back()}
          title={session?.courseClass ?? 'Detail Sesi'}
          subtitle={session?.practicumName ?? 'Informasi pertemuan praktikum'}
          rightBadgeLabel={statusPillText || undefined}
          rightBadgeTone={session?.status === 'closed' ? 'pacific' : 'rosy'}
        />

        <View style={styles.bodyContainer}>
          {loadingSessions && !session ? (
            <CardListSkeleton count={2} showActions label="Memuat detail sesi" />
          ) : session && practicumSession ? (
            <>
              <SessionDetail session={session} showHeader={false} />

              <View
                style={[
                  styles.modulesCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.modulesHeader}>
                  <Text style={[styles.modulesTitle, { color: colors.textPrimary }]}>
                    Daftar modul
                  </Text>
                  <Text style={[styles.modulesCount, { color: colors.baltic }]}>
                    Sesi {String(currentModuleIndex + 1).padStart(2, '0')} dari{' '}
                    {String(Math.max(totalModules, currentModuleIndex + 1)).padStart(2, '0')}
                  </Text>
                </View>

                <View style={styles.modulesRow}>
                  {moduleChips.map((chip) => (
                    <Pressable
                      key={chip.code}
                      accessibilityRole="button"
                      onPress={() => {
                        if (chip.sessionId && chip.sessionId !== practicumSession.id) {
                          router.replace({
                            pathname: '/schedule/[sessionId]',
                            params: { sessionId: chip.sessionId },
                          });
                        }
                      }}
                      style={({ pressed }) => [
                        styles.moduleChip,
                        {
                          backgroundColor: chip.active
                            ? colors.pacific
                            : chip.past
                              ? colors.balticSoft
                              : colors.background,
                          borderColor: chip.active
                            ? colors.pacific
                            : chip.past
                              ? colors.border
                              : colors.border,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.moduleChipText,
                          {
                            color: chip.active
                              ? '#FCFCFA'
                              : chip.past
                                ? colors.baltic
                                : colors.textSubtle,
                          },
                        ]}
                      >
                        {chip.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {!isAssistant && attendanceEntry ? (
                <View
                  style={[
                    styles.attendedBanner,
                    { backgroundColor: colors.pacificSoft, borderColor: colors.pacificLight },
                  ]}
                >
                  <CheckCircle2 size={16} color={colors.pacificDark} strokeWidth={2.2} />
                  <Text style={[styles.attendedText, { color: colors.pacificDark }]}>
                    Hadir tercatat ·{' '}
                    {attendanceEntry.hasPendingWrites
                      ? 'Menunggu sinkron'
                      : attendanceEntry.attendedAt}
                  </Text>
                </View>
              ) : null}

              {isAssistant ? (
                <View style={styles.assistantControls}>
                  <SessionLifecycleButtons
                    session={practicumSession}
                    isAssistant={isAssistant}
                    onOpenSession={openSession}
                    onCloseSession={closeSession}
                    onDeleteSession={handleDeleteSession}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setQrVisible(true)}
                    style={({ pressed }) => [
                      styles.qrBtn,
                      { backgroundColor: colors.rosy },
                      pressed && styles.pressed,
                    ]}
                  >
                    <QrCode size={16} color="#FCFCFA" strokeWidth={2} />
                    <Text style={styles.qrBtnText}>Tampilkan QR Sesi</Text>
                  </Pressable>
                  <AssistantSessionRosterPanel session={practicumSession} />
                </View>
              ) : (
                <View style={styles.studentActionsWrap}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: APP_ROUTES.PRESENSI,
                        params: { sessionId: practicumSession.id },
                      } as never)
                    }
                    style={({ pressed }) => [
                      styles.attendanceCtaBtn,
                      {
                        backgroundColor: attendanceEntry
                          ? colors.pacific
                          : practicumSession.status === 'open'
                            ? colors.rosy
                            : colors.baltic,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <MapPin size={16} color="#FCFCFA" strokeWidth={2.1} />
                    <Text style={styles.attendanceCtaText}>
                      {attendanceEntry ? 'Lihat Status Presensi' : 'Buka Halaman Presensi'}
                    </Text>
                  </Pressable>

                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        showAlert(
                          'Modul Praktikum PDF',
                          `Materi ${session.practicumName} siap dipelajari sebelum praktikum dimulai.`,
                        )
                      }
                      style={({ pressed }) => [
                        styles.moduleBtn,
                        { backgroundColor: colors.balticSoft, borderColor: colors.border },
                        pressed && styles.pressed,
                      ]}
                    >
                      <FileText size={16} color={colors.baltic} strokeWidth={2} />
                      <Text style={[styles.moduleBtnText, { color: colors.baltic }]}>
                        Unduh Modul
                      </Text>
                    </Pressable>

                    <LeaveRequestAction
                      session={{
                        id: practicumSession.id,
                        classId: practicumSession.classId,
                        status: practicumSession.status,
                      }}
                      sessionTitle={`${session.courseClass} · ${session.practicumName} · ${session.startsAt}`}
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <View
              style={[
                styles.notFound,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
                Sesi tidak ditemukan
              </Text>
              <Text style={[styles.notFoundDesc, { color: colors.textSecondary }]}>
                Sesi yang dipilih sudah tidak tersedia pada jadwal ini.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {practicumSession ? (
        <QrSessionBottomSheet
          visible={qrVisible}
          onClose={() => setQrVisible(false)}
          sessionId={practicumSession.id}
          classId={practicumSession.classId}
          sessionTitle={practicumSession.courseName ?? practicumSession.title}
          subtitle={`${practicumSession.className ?? ''} · ${practicumSession.location}`}
          sessionStatus={practicumSession.status}
          onOpenSession={() => openSession(practicumSession.id)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 112,
    gap: 14,
  },
  bodyContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  modulesCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modulesTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15.5,
  },
  modulesCount: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  modulesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  moduleChip: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleChipText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  attendedBanner: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendedText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  studentActionsWrap: {
    gap: 10,
  },
  attendanceCtaBtn: {
    height: 46,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attendanceCtaText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moduleBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  moduleBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  assistantControls: {
    gap: 6,
  },
  qrBtn: {
    height: 46,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  notFound: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  notFoundTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
  },
  notFoundDesc: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.78,
  },
});
