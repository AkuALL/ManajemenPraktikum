import { useRouter } from 'expo-router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  MapPin,
  Plus,
  QrCode,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { QrSessionBottomSheet } from '@/components/ui/qr-session-bottom-sheet';
import { CardListSkeleton } from '@/components/ui/skeleton';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { APP_ROUTES } from '@/features/navigation';
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

function shiftIsoDate(dateStr: string, daysOffset: number): string {
  const base = new Date(`${dateStr}T00:00:00`);
  const safe = Number.isNaN(base.getTime()) ? new Date() : base;
  safe.setDate(safe.getDate() + daysOffset);
  return toIsoDateLocal(safe);
}

function formatWeekRangeLabel(days: DayChip[]): string {
  if (days.length === 0) return '';
  const start = new Date(`${days[0].dateStr}T00:00:00`);
  const end = new Date(`${days[days.length - 1].dateStr}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString('id-ID', {
    day: 'numeric',
    ...(sameMonth ? {} : { month: 'short' }),
  });
  const endLabel = end.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
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
  for (let i = 0; i < 5; i += 1) {
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

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [openExpanded, setOpenExpanded] = useState(true);
  const [scheduledExpanded, setScheduledExpanded] = useState(true);
  const [closedExpanded, setClosedExpanded] = useState(false);
  const [qrSession, setQrSession] = useState<PracticumSession | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<PracticumSession | null>(null);

  const weekAnchorDate = useMemo(
    () => shiftIsoDate(defaultAnchorDate, weekOffset * 7),
    [defaultAnchorDate, weekOffset],
  );

  const weekDays = useMemo(
    () => buildWeekStrip(sessions, weekAnchorDate),
    [sessions, weekAnchorDate],
  );

  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(weekDays), [weekDays]);

  const activeDayStr = useMemo(() => {
    if (selectedDayStr && weekDays.some((d) => d.dateStr === selectedDayStr)) {
      return selectedDayStr;
    }
    if (weekOffset === 0 && weekDays.some((d) => d.dateStr === defaultAnchorDate)) {
      return defaultAnchorDate;
    }
    return weekDays.find((d) => d.hasSession)?.dateStr ?? weekDays[0]?.dateStr ?? defaultAnchorDate;
  }, [defaultAnchorDate, selectedDayStr, weekDays, weekOffset]);

  const daySessions = useMemo(
    () => sessions.filter((s) => sessionDateInput(s.date, s.startsAt) === activeDayStr),
    [activeDayStr, sessions],
  );

  const openSessions = useMemo(
    () => daySessions.filter((s) => s.status === 'open'),
    [daySessions],
  );

  const scheduledSessions = useMemo(
    () => daySessions.filter((s) => s.status === 'scheduled'),
    [daySessions],
  );

  const closedSessions = useMemo(
    () => daySessions.filter((s) => s.status === 'closed'),
    [daySessions],
  );

  const handleShiftWeek = (deltaWeeks: number) => {
    const nextOffset = weekOffset + deltaWeeks;
    setWeekOffset(nextOffset);
    setSelectedDayStr((prev) => (prev ? shiftIsoDate(prev, deltaWeeks * 7) : null));
  };

  const handleResetToCurrentWeek = () => {
    setWeekOffset(0);
    setSelectedDayStr(null);
  };

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
          <View style={styles.weekNavRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Minggu sebelumnya"
              onPress={() => handleShiftWeek(-1)}
              style={({ pressed }) => [
                styles.weekNavBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <ChevronLeft size={16} color={colors.textPrimary} />
            </Pressable>

            <View
              style={[
                styles.weekRangePill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.weekRangeText, { color: colors.textPrimary }]} numberOfLines={1}>
                {weekRangeLabel}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Minggu berikutnya"
              onPress={() => handleShiftWeek(1)}
              style={({ pressed }) => [
                styles.weekNavBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <ChevronRight size={16} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {weekDays.map((day) => {
              const selected = day.dateStr === activeDayStr;
              return (
                <Pressable
                  key={day.dateStr}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedDayStr(day.dateStr)}
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

          {weekOffset !== 0 || selectedDayStr !== null ? (
            <View style={styles.weekResetTopRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset ke minggu ini"
                onPress={handleResetToCurrentWeek}
                style={({ pressed }) => [
                  styles.weekResetBtn,
                  { backgroundColor: colors.pacificSoft, borderColor: colors.pacificLight },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.weekResetHint, { color: colors.pacificDark }]}>
                  Reset
                </Text>
              </Pressable>
            </View>
          ) : null}

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
                accessibilityLabel="Buka Master Lab"
                onPress={() => router.push(APP_ROUTES.MASTER_LAB as never)}
                style={({ pressed }) => [
                  styles.assistantActionBtn,
                  {
                    backgroundColor: colors.pacificSoft,
                    borderColor: colors.pacificLight,
                    borderWidth: 1,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SlidersHorizontal size={15} color={colors.pacificDark} strokeWidth={2} />
                <Text style={[styles.assistantActionSecondaryText, { color: colors.pacificDark }]}>
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
          ) : daySessions.length > 0 ? (
            <View style={styles.groupsContainer}>
              {openSessions.length > 0 ? (
                <View style={styles.dropdownGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: openExpanded }}
                    onPress={() => setOpenExpanded((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.dropdownHeader,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.dropdownTitleRow}>
                      <View style={[styles.statusTagDot, { backgroundColor: colors.rosy }]} />
                      <Text style={[styles.dropdownTitle, { color: colors.textPrimary }]}>
                        Sedang Berlangsung
                      </Text>
                      <View style={[styles.dropdownCountPill, { backgroundColor: colors.rosySoft }]}>
                        <Text style={[styles.dropdownCountText, { color: colors.rosy }]}>
                          {openSessions.length}
                        </Text>
                      </View>
                    </View>
                    {openExpanded ? (
                      <ChevronUp size={17} color={colors.textSecondary} />
                    ) : (
                      <ChevronDown size={17} color={colors.textSecondary} />
                    )}
                  </Pressable>

                  {openExpanded ? (
                    <View style={styles.dropdownBody}>
                      {openSessions.map((sessionItem) => (
                        <View
                          key={sessionItem.id}
                          style={[
                            styles.heroSessionCard,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                          ]}
                        >
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Buka detail ${sessionItem.title}`}
                            onPress={() =>
                              router.push({
                                pathname: '/schedule/[sessionId]',
                                params: { sessionId: sessionItem.id },
                              })
                            }
                            style={({ pressed }) => [
                              styles.heroCardBody,
                              pressed && styles.cardPressed,
                            ]}
                          >
                            <View style={styles.heroCardTop}>
                              <View style={[styles.statusTag, { backgroundColor: colors.rosySoft }]}>
                                <View style={[styles.statusTagDot, { backgroundColor: colors.rosy }]} />
                                <Text style={[styles.statusTagText, { color: colors.rosy }]}>
                                  {`BERLANGSUNG · ${formatSessionTime(sessionItem.startsAt)}`}
                                </Text>
                              </View>

                              <View style={[styles.roomTag, { backgroundColor: colors.pacificSoft }]}>
                                <Text
                                  style={[styles.roomTagText, { color: colors.pacificDark }]}
                                  numberOfLines={1}
                                >
                                  {sessionItem.location}
                                </Text>
                              </View>
                            </View>

                            <Text style={[styles.courseHeading, { color: colors.textPrimary }]}>
                              {sessionItem.courseName ?? sessionItem.className ?? 'Praktikum Lab'}
                            </Text>
                            <Text style={[styles.sessionSubtitle, { color: colors.textSecondary }]}>
                              {sessionItem.title}
                            </Text>

                            <View style={[styles.metaStrip, { backgroundColor: colors.background }]}>
                              <Text style={[styles.metaStripLeft, { color: colors.textPrimary }]} numberOfLines={1}>
                                {formatSessionTime(sessionItem.startsAt)} –{' '}
                                {formatSessionTime(sessionItem.endsAt)} · {sessionItem.location}
                              </Text>
                              <Text style={[styles.metaStripRight, { color: colors.textSecondary }]} numberOfLines={1}>
                                {sessionItem.assistantName ?? (sessionItem.className ?? 'Asisten')}
                              </Text>
                            </View>
                          </Pressable>

                          {isAssistant ? (
                            <View style={styles.assistantHeroActions}>
                              <SessionLifecycleButtons
                                session={sessionItem}
                                isAssistant={isAssistant}
                                onOpenSession={openSession}
                                onCloseSession={closeSession}
                              />
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => setQrSession(sessionItem)}
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
                            <View style={styles.studentHeroActions}>
                              <View style={styles.studentActionsRow}>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() =>
                                    router.push({
                                      pathname: '/schedule/[sessionId]',
                                      params: { sessionId: sessionItem.id },
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
                                    Detail Pertemuan
                                  </Text>
                                </Pressable>

                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => router.push({
                                    pathname: APP_ROUTES.MAPS,
                                    params: { labId: sessionItem.labId ?? '', location: sessionItem.location },
                                  } as never)}
                                  style={({ pressed }) => [
                                    styles.secondaryHeroBtn,
                                    { backgroundColor: colors.balticSoft },
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <MapPin size={15} color={colors.baltic} strokeWidth={2} />
                                  <Text style={[styles.secondaryHeroBtnText, { color: colors.baltic }]}>
                                    Denah Lab
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {scheduledSessions.length > 0 ? (
                <View style={styles.dropdownGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: scheduledExpanded }}
                    onPress={() => setScheduledExpanded((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.dropdownHeader,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.dropdownTitleRow}>
                      <View style={[styles.statusTagDot, { backgroundColor: colors.pacific }]} />
                      <Text style={[styles.dropdownTitle, { color: colors.textPrimary }]}>
                        Sesi Mendatang
                      </Text>
                      <View style={[styles.dropdownCountPill, { backgroundColor: colors.pacificSoft }]}>
                        <Text style={[styles.dropdownCountText, { color: colors.pacificDark }]}>
                          {scheduledSessions.length}
                        </Text>
                      </View>
                    </View>
                    {scheduledExpanded ? (
                      <ChevronUp size={17} color={colors.textSecondary} />
                    ) : (
                      <ChevronDown size={17} color={colors.textSecondary} />
                    )}
                  </Pressable>

                  {scheduledExpanded ? (
                    <View style={styles.dropdownBody}>
                      {scheduledSessions.map((item, idx) => (
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
                              {formatSessionTime(item.startsAt)} – {formatSessionTime(item.endsAt)} ·{' '}
                              {item.className ?? 'Praktikum'}
                            </Text>
                            <Text style={[styles.compactTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                              {(item.courseName ?? item.title)} · {item.location}
                            </Text>
                          </View>

                          <View style={[styles.compactBadge, { backgroundColor: colors.pacificSoft }]}>
                            <Text style={[styles.compactBadgeText, { color: colors.pacificDark }]}>
                              {extractModuleTag(item.title, idx)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {closedSessions.length > 0 ? (
                <View style={styles.dropdownGroup}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: closedExpanded }}
                    onPress={() => setClosedExpanded((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.dropdownHeader,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.dropdownTitleRow}>
                      <View style={[styles.statusTagDot, { backgroundColor: colors.textSubtle }]} />
                      <Text style={[styles.dropdownTitle, { color: colors.textPrimary }]}>
                        Sesi Selesai
                      </Text>
                      <View style={[styles.dropdownCountPill, { backgroundColor: colors.surfaceMuted }]}>
                        <Text style={[styles.dropdownCountText, { color: colors.textSecondary }]}>
                          {closedSessions.length}
                        </Text>
                      </View>
                    </View>
                    {closedExpanded ? (
                      <ChevronUp size={17} color={colors.textSecondary} />
                    ) : (
                      <ChevronDown size={17} color={colors.textSecondary} />
                    )}
                  </Pressable>

                  {closedExpanded ? (
                    <View style={styles.dropdownBody}>
                      {closedSessions.map((item) => (
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
                              {formatSessionTime(item.startsAt)} – {formatSessionTime(item.endsAt)} ·{' '}
                              {item.className ?? 'Praktikum'}
                            </Text>
                            <Text style={[styles.compactTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                              {(item.courseName ?? item.title)} · {item.location}
                            </Text>
                          </View>

                          <View style={[styles.compactBadge, { backgroundColor: colors.surfaceMuted }]}>
                            <Text style={[styles.compactBadgeText, { color: colors.textSecondary }]}>
                              Selesai
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                Tidak ada jadwal pada {formatSessionDate(activeDayStr)}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Ketuk tanggal untuk melihat sesi.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <QrSessionBottomSheet
        visible={Boolean(qrSession)}
        onClose={() => setQrSession(null)}
        sessionId={qrSession?.id ?? 'default'}
        classId={qrSession?.classId}
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
        onClose={() => {
          setFormVisible(false);
          setEditingSession(null);
        }}
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
  weekResetTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  weekResetBtn: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRangePill: {
    flex: 1,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRangeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12.5,
  },
  weekResetHint: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 5,
  },
  groupsContainer: {
    gap: 12,
  },
  dropdownGroup: {
    gap: 8,
  },
  dropdownHeader: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
  },
  dropdownCountPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dropdownCountText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  dropdownBody: {
    gap: 8,
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
  studentHeroActions: {
    gap: 8,
    marginTop: 2,
  },
  presensiHeroBtn: {
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  presensiHeroBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FCFCFA',
  },
  studentActionsRow: {
    flexDirection: 'row',
    gap: 8,
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
