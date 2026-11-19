import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  FileText,
  MapPin,
  Plus,
  QrCode,
  SlidersHorizontal,
} from 'lucide-react-native';

import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { QrSessionBottomSheet } from '@/components/ui/qr-session-bottom-sheet';
import { CardListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import {
  formatSessionDate,
  formatSessionTime,
  SessionFormModal,
  SessionLifecycleButtons,
  usePracticum,
  type CreateSessionInput,
  type PracticumSession,
} from '@/features/practicum';
import { sessionDateInput } from '@/features/practicum/validation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { showAlert } from '@/lib/cross-platform-alert';

const SHORT_DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] as const;

type DayChip = {
  dateStr: string;
  dayName: string;
  dayNumber: string;
  hasSession: boolean;
};

function toIsoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildWeekStrip(sessions: PracticumSession[], anchorDateStr: string): DayChip[] {
  const anchor = new Date(`${anchorDateStr}T00:00:00`);
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const day = safeAnchor.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(safeAnchor);
  monday.setDate(safeAnchor.getDate() + diffToMonday);

  const sessionDates = new Set(
    sessions.map((s) => sessionDateInput(s.date, s.startsAt)),
  );

  const days: DayChip[] = [];
  for (let i = 0; i < 6; i += 1) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const iso = toIsoDateLocal(current);
    days.push({
      dateStr: iso,
      dayName: SHORT_DAY_NAMES[current.getDay()],
      dayNumber: String(current.getDate()),
      hasSession: sessionDates.has(iso),
    });
  }
  return days;
}

function extractModuleTag(title: string, indexFallback: number): string {
  const match = /modul\s*0?(\d+)/i.exec(title);
  if (match) {
    return `Modul ${match[1].padStart(2, '0')}`;
  }
  return `Sesi ${String(indexFallback + 1).padStart(2, '0')}`;
}

export function BerandaScreen() {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const {
    classes,
    sessions,
    loadingSessions,
    sessionsError,
    retryData,
    createSession,
    updateSession,
    openSession,
    closeSession,
  } = usePracticum();

  const isAssistant = user?.role === 'assistant';
  const todayStr = useMemo(() => toIsoDateLocal(new Date()), []);

  const defaultAnchorDate = useMemo(() => {
    const open = sessions.find((s) => s.status === 'open');
    const scheduled = sessions.find((s) => s.status === 'scheduled');
    const target = open ?? scheduled ?? sessions[0];
    return target ? sessionDateInput(target.date, target.startsAt) : todayStr;
  }, [sessions, todayStr]);

  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [qrSession, setQrSession] = useState<PracticumSession | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<PracticumSession | null>(null);

  const weekDays = useMemo(
    () => buildWeekStrip(sessions, selectedDayStr ?? defaultAnchorDate),
    [defaultAnchorDate, selectedDayStr, sessions],
  );

  const activeDayStr = selectedDayStr ?? defaultAnchorDate;

  const daySessions = useMemo(() => {
    if (!selectedDayStr) return sessions;
    const matched = sessions.filter(
      (s) => sessionDateInput(s.date, s.startsAt) === selectedDayStr,
    );
    return matched;
  }, [selectedDayStr, sessions]);

  const featuredSession = useMemo(() => {
    const source = daySessions.length > 0 ? daySessions : [];
    return (
      source.find((s) => s.status === 'open') ??
      source.find((s) => s.status === 'scheduled') ??
      source[0] ??
      null
    );
  }, [daySessions]);

  const upcomingSessions = useMemo(() => {
    const list = selectedDayStr ? daySessions : sessions;
    return list.filter((s) => s.id !== featuredSession?.id).slice(0, 6);
  }, [daySessions, featuredSession?.id, selectedDayStr, sessions]);

  const activeCountToday = useMemo(() => {
    const todayMatches = sessions.filter(
      (s) => sessionDateInput(s.date, s.startsAt) === todayStr,
    );
    return todayMatches.length > 0 ? todayMatches.length : sessions.filter((s) => s.status !== 'closed').length;
  }, [sessions, todayStr]);

  const formattedHeaderDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const firstClassName = classes[0]?.className ?? (isAssistant ? 'Asisten Lab' : 'Praktikum');

  const handleOpenCreateSession = () => {
    if (classes.length === 0) {
      showAlert(
        'Kelas Belum Ada',
        'Buat kelas praktikum terlebih dahulu di tab Kelas sebelum menambahkan sesi.',
      );
      return;
    }
    setEditingSession(null);
    setFormVisible(true);
  };

  const handleSessionFormSubmit = async (input: CreateSessionInput) => {
    if (editingSession) {
      await updateSession(editingSession.id, input);
    } else {
      await createSession(input);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          eyebrow={`${formattedHeaderDate} · ${firstClassName}`}
          title={`Hai, ${getFirstName(user?.displayName)}`}
          monoBadge={
            isAssistant
              ? user?.identifier ?? 'AST-LAB'
              : `NIM ${user?.identifier ?? '-'}`
          }
          statusBadge={`${activeCountToday} Sesi Aktif`}
        />

        <View style={styles.bodyContainer}>
          <View style={styles.weekRow}>
            {weekDays.map((day) => {
              const selected = day.dateStr === activeDayStr;
              return (
                <Pressable
                  key={day.dateStr}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    setSelectedDayStr((prev) =>
                      prev === day.dateStr ? null : day.dateStr,
                    )
                  }
                  style={({ pressed }) => [
                    styles.dayChip,
                    {
                      backgroundColor: selected ? colors.pacific : colors.surface,
                      borderColor: selected ? colors.pacific : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayName,
                      { color: selected ? '#FCFCFA' : colors.textSubtle },
                    ]}
                  >
                    {day.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: selected ? '#FCFCFA' : colors.textPrimary },
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                  <View
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor:
                          day.hasSession || selected
                            ? selected
                              ? colors.rosy
                              : colors.pacific
                            : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          {isAssistant ? (
            <View style={styles.assistantBar}>
              <Pressable
                accessibilityRole="button"
                onPress={handleOpenCreateSession}
                style={({ pressed }) => [
                  styles.assistantActionBtn,
                  { backgroundColor: colors.rosy },
                  pressed && styles.pressed,
                ]}
              >
                <Plus size={15} color="#FCFCFA" strokeWidth={2.4} />
                <Text style={styles.assistantActionPrimaryText}>Tambah Sesi</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                disabled
                style={[
                  styles.assistantActionBtn,
                  {
                    backgroundColor: colors.disabledSurface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    opacity: 0.55,
                  },
                ]}
              >
                <SlidersHorizontal size={15} color={colors.disabledText} strokeWidth={2} />
                <Text style={[styles.assistantActionSecondaryText, { color: colors.disabledText }]}>
                  Master Lab
                </Text>
              </Pressable>
            </View>
          ) : null}

          {loadingSessions && sessions.length === 0 ? (
            <CardListSkeleton count={2} showActions label="Memuat jadwal beranda" />
          ) : sessionsError ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Jadwal belum dapat dimuat
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
          ) : featuredSession ? (
            <View
              style={[
                styles.heroSessionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Buka detail ${featuredSession.title}`}
                onPress={() =>
                  router.push({
                    pathname: '/schedule/[sessionId]',
                    params: { sessionId: featuredSession.id },
                  })
                }
                style={({ pressed }) => [
                  styles.heroCardBody,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.heroCardTop}>
                  <View
                    style={[
                      styles.statusTag,
                      {
                        backgroundColor:
                          featuredSession.status === 'closed'
                            ? colors.pacificSoft
                            : colors.rosySoft,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusTagDot,
                        {
                          backgroundColor:
                            featuredSession.status === 'closed' ? colors.pacific : colors.rosy,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusTagText,
                        {
                          color:
                            featuredSession.status === 'closed'
                              ? colors.pacificDark
                              : colors.rosy,
                        },
                      ]}
                    >
                      {featuredSession.status === 'open'
                        ? `BERLANGSUNG · ${formatSessionTime(featuredSession.startsAt)}`
                        : featuredSession.status === 'closed'
                          ? 'SELESAI'
                          : `TERJADWAL · ${formatSessionTime(featuredSession.startsAt)}`}
                    </Text>
                  </View>

                  <View style={[styles.roomTag, { backgroundColor: colors.pacificSoft }]}>
                    <Text
                      style={[styles.roomTagText, { color: colors.pacificDark }]}
                      numberOfLines={1}
                    >
                      {featuredSession.location}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.courseHeading, { color: colors.textPrimary }]}>
                  {featuredSession.courseName ?? featuredSession.className ?? 'Praktikum Lab'}
                </Text>
                <Text style={[styles.sessionSubtitle, { color: colors.textSecondary }]}>
                  {featuredSession.title}
                </Text>

                <View
                  style={[
                    styles.metaStrip,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text style={[styles.metaStripLeft, { color: colors.textPrimary }]} numberOfLines={1}>
                    {formatSessionTime(featuredSession.startsAt)} –{' '}
                    {formatSessionTime(featuredSession.endsAt)} · {featuredSession.location}
                  </Text>
                  <Text style={[styles.metaStripRight, { color: colors.textSecondary }]} numberOfLines={1}>
                    {featuredSession.assistantName ?? (featuredSession.className ?? 'Asisten')}
                  </Text>
                </View>
              </Pressable>

              {isAssistant ? (
                <View style={styles.assistantHeroActions}>
                  <SessionLifecycleButtons
                    session={featuredSession}
                    isAssistant={isAssistant}
                    onOpenSession={openSession}
                    onCloseSession={closeSession}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setQrSession(featuredSession)}
                    style={({ pressed }) => [
                      styles.qrBtn,
                      { backgroundColor: colors.rosy },
                      pressed && styles.pressed,
                    ]}
                  >
                    <QrCode size={16} color="#FCFCFA" strokeWidth={2} />
                    <Text style={styles.qrBtnText}>Tampilkan QR Sesi</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.studentActionsRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/schedule/[sessionId]',
                        params: { sessionId: featuredSession.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.secondaryHeroBtn,
                      { backgroundColor: colors.balticSoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    <FileText size={15} color={colors.baltic} strokeWidth={2} />
                    <Text style={[styles.secondaryHeroBtnText, { color: colors.baltic }]}>
                      Modul PDF
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: true }}
                    disabled
                    style={[
                      styles.secondaryHeroBtn,
                      { backgroundColor: colors.disabledSurface, opacity: 0.55 },
                    ]}
                  >
                    <MapPin size={15} color={colors.disabledText} strokeWidth={2} />
                    <Text style={[styles.secondaryHeroBtnText, { color: colors.disabledText }]}>
                      Denah Lab
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {selectedDayStr ? 'Tidak ada jadwal pada hari ini' : 'Belum ada jadwal praktikum'}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                {selectedDayStr
                  ? 'Ketuk tanggal yang memiliki indikator titik atau tampilkan semua jadwal.'
                  : isAssistant
                    ? 'Tambahkan kelas dan sesi praktikum untuk memulai jadwal.'
                    : 'Jadwal praktikum dari kelas yang Anda ikuti akan muncul di sini.'}
              </Text>
              {selectedDayStr ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedDayStr(null)}
                  style={({ pressed }) => [
                    styles.retryBtn,
                    { backgroundColor: colors.pacificSoft },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.retryText, { color: colors.pacificDark }]}>
                    Tampilkan Semua Jadwal
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {upcomingSessions.length > 0 ? (
            <View style={styles.upcomingList}>
              {upcomingSessions.map((item, idx) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/schedule/[sessionId]',
                      params: { sessionId: item.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.compactCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.compactText}>
                    <Text style={[styles.compactMeta, { color: colors.textSubtle }]} numberOfLines={1}>
                      {formatSessionDate(item.date, item.startsAt)} ·{' '}
                      {formatSessionTime(item.startsAt)}
                    </Text>
                    <Text style={[styles.compactTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {(item.courseName ?? item.title)} · {item.location}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.compactBadge,
                      {
                        backgroundColor:
                          item.status === 'open' ? colors.rosySoft : colors.pacificSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.compactBadgeText,
                        {
                          color:
                            item.status === 'open' ? colors.rosy : colors.pacificDark,
                        },
                      ]}
                    >
                      {item.status === 'open'
                        ? 'Live'
                        : extractModuleTag(item.title, idx)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <QrSessionBottomSheet
        visible={Boolean(qrSession)}
        onClose={() => setQrSession(null)}
        sessionId={qrSession?.id ?? 'default'}
        sessionTitle={qrSession?.courseName ?? qrSession?.title ?? 'Sesi Praktikum'}
        subtitle={`${qrSession?.className ?? ''} · ${qrSession?.location ?? ''}`}
        sessionStatus={qrSession?.status}
        onOpenSession={
          qrSession ? () => openSession(qrSession.id) : undefined
        }
      />

      <SessionFormModal
        visible={formVisible}
        classes={classes}
        initialSession={editingSession}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSessionFormSubmit}
      />
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
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayName: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10.5,
  },
  dayNumber: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  assistantBar: {
    flexDirection: 'row',
    gap: 8,
  },
  assistantActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  assistantActionPrimaryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
    color: '#FCFCFA',
  },
  assistantActionSecondaryText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  heroSessionCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  heroCardBody: {
    gap: 10,
  },
  heroCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
  },
  roomTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '48%',
  },
  roomTagText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },
  courseHeading: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17.5,
    lineHeight: 22,
  },
  sessionSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: -4,
  },
  metaStrip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaStripLeft: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    flex: 1,
    fontVariant: ['tabular-nums'],
  },
  metaStripRight: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
    maxWidth: '38%',
  },
  studentActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  secondaryHeroBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryHeroBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12.5,
  },
  assistantHeroActions: {
    gap: 4,
  },
  qrBtn: {
    height: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  qrBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FCFCFA',
  },
  upcomingList: {
    gap: 8,
  },
  compactCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compactText: {
    flex: 1,
    gap: 2,
  },
  compactMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
  },
  compactTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14.5,
    lineHeight: 19,
  },
  compactBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compactBadgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
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
    opacity: 0.8,
  },
  cardPressed: {
    opacity: 0.9,
  },
});
