/**
 * Rekap Screen — AL-06 / FR-09
 * Rekap kehadiran per sesi secara real-time untuk Asisten.
 */

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { useSessionAttendance } from '@/features/attendance';
import { useAuth } from '@/features/auth';
import {
  formatSessionDate,
  formatSessionTime,
  usePracticum,
  type PracticumSession,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { normalizeSessionStatus, type SessionStatus, type SessionStatusV2 } from '@/types';

function getSessionCourseLabel(session: PracticumSession): string {
  return [session.className, session.courseName].filter(Boolean).join(' · ');
}

function getStatusLabel(status: SessionStatus | SessionStatusV2): string {
  const normalized = normalizeSessionStatus(status);
  if (normalized === 'open') return '● Berlangsung';
  if (normalized === 'closed') return '✓ Selesai';
  return '◷ Belum dibuka';
}

export default function RecapScreen() {
  const { user } = useAuth();
  const { sessions, loadingSessions } = usePracticum();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const defaultSessionId = useMemo(() => {
    const openSession = sessions.find((item) => item.status === 'open');
    return openSession?.id ?? sessions[0]?.id ?? null;
  }, [sessions]);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const activeSession = useMemo(() => {
    const targetId = selectedSessionId ?? defaultSessionId;
    return sessions.find((item) => item.id === targetId) ?? sessions[0] ?? null;
  }, [defaultSessionId, selectedSessionId, sessions]);

  const { records, loading, error, fromCache, retry } = useSessionAttendance(
    activeSession?.id ?? null,
    activeSession?.classId ?? null,
  );

  if (user?.role !== 'assistant') {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.guardBody, { color: colors.textSecondary }]}>
          Rekap kehadiran hanya tersedia untuk Asisten.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <View style={styles.headingRow}>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Ruang asisten</Text>
          <View
            style={[
              styles.syncBadge,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.syncBadgeText, { color: colors.textSecondary }]}>
              {fromCache ? 'Cache lokal' : 'Sinkron real-time'}
            </Text>
          </View>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Rekap kehadiran</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Pilih sesi untuk memantau daftar hadir praktikan secara real-time.
        </Text>
      </View>

      {loadingSessions && sessions.length === 0 ? (
        <View
          style={[
            styles.stateCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={[styles.stateBody, { color: colors.textSecondary }]}>
            Memuat daftar sesi praktikum
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View
          style={[
            styles.stateCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
            Belum ada sesi praktikum
          </Text>
          <Text style={[styles.stateBody, { color: colors.textSecondary }]}>
            Sesi praktikum akan tampil di sini setelah dibuat pada kelas terkait.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.selectorList}>
            {sessions.map((session) => {
              const selected = session.id === activeSession?.id;
              const classLabel = getSessionCourseLabel(session);
              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih sesi ${session.title}`}
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedSessionId(session.id)}
                  style={({ pressed }) => [
                    styles.selectorChip,
                    {
                      backgroundColor: selected ? colors.actionPrimary : colors.surface,
                      borderColor: selected ? colors.actionPrimary : colors.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.selectorChipText,
                      { color: selected ? colors.actionSecondary : colors.textPrimary },
                    ]}
                  >
                    {session.title}
                    {classLabel ? ` · ${classLabel}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {activeSession ? (
            <View
              style={[
                styles.sessionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.sessionTitleGroup}>
                  <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>
                    {activeSession.title}
                    {getSessionCourseLabel(activeSession)
                      ? ` · ${getSessionCourseLabel(activeSession)}`
                      : ''}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: colors.textSecondary }, styles.tabular]}>
                    {formatSessionDate(activeSession.date, activeSession.startsAt)} ·{' '}
                    {formatSessionTime(activeSession.startsAt)}–
                    {formatSessionTime(activeSession.endsAt)} · {activeSession.location}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                    {getStatusLabel(activeSession.status)}
                  </Text>
                </View>
              </View>

              <View style={[styles.countRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.countText, { color: colors.textPrimary }, styles.tabular]}>
                  {records.length} praktikan hadir
                </Text>
              </View>

              {loading ? (
                <View style={styles.innerState}>
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                  <Text style={[styles.stateBody, { color: colors.textSecondary }]}>
                    Memuat rekap kehadiran
                  </Text>
                </View>
              ) : error ? (
                <View accessibilityRole="alert" style={styles.innerState}>
                  <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
                    Gagal memuat rekap
                  </Text>
                  <Text style={[styles.stateBody, { color: colors.textSecondary }]}>{error}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Muat ulang rekap kehadiran"
                    onPress={retry}
                    style={({ pressed }) => [
                      styles.retryButton,
                      { backgroundColor: colors.actionPrimary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.retryButtonText, { color: colors.actionSecondary }]}>
                      Coba lagi
                    </Text>
                  </Pressable>
                </View>
              ) : records.length === 0 ? (
                <View style={styles.innerState}>
                  <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
                    Belum ada presensi
                  </Text>
                  <Text style={[styles.stateBody, { color: colors.textSecondary }]}>
                    Presensi praktikan akan muncul di sini setelah dicatat.
                  </Text>
                </View>
              ) : (
                <View style={styles.attendeeList}>
                  {records.map((record) => (
                    <View
                      key={record.id}
                      style={[styles.attendeeRow, { borderTopColor: colors.border }]}
                    >
                      <View style={styles.attendeeInfo}>
                        <Text style={[styles.studentName, { color: colors.textPrimary }]}>
                          {record.studentName}
                        </Text>
                        <Text
                          style={[
                            styles.studentIdentifier,
                            { color: colors.textSecondary },
                            styles.tabular,
                          ]}
                        >
                          {record.studentIdentifier}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.attendedAt,
                          { color: colors.textSecondary },
                          styles.tabular,
                        ]}
                      >
                        {record.hasPendingWrites ? 'Menunggu sinkron' : record.attendedAt}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  guardTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  guardBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
  heading: {
    gap: 6,
    paddingTop: 4,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
  },
  syncBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  selectorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorChip: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  selectorChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sessionTitleGroup: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  sessionMeta: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  countRow: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
  },
  innerState: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stateBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  attendeeList: {
    gap: 4,
  },
  attendeeRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  attendeeInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  studentIdentifier: {
    fontSize: 12,
    fontWeight: '400',
  },
  attendedAt: {
    fontSize: 12,
    fontWeight: '400',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.72,
  },
});
