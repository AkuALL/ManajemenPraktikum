/**
 * Kehadiran Screen — AL-05 / FR-09
 * Riwayat kehadiran Praktikan aktif secara real-time dari Firestore.
 */

import { useRouter } from 'expo-router';
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
import { sortAttendanceEntries, useAttendance } from '@/features/attendance';
import { useAuth } from '@/features/auth';
import { useSchedule } from '@/features/schedule';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AttendanceEntry } from '@/types';

type Palette = (typeof Colors)[keyof typeof Colors];

export default function AttendanceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { records, loading, error, fromCache, retry } = useAttendance();
  const { sessions } = useSchedule();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [sortAsc, setSortAsc] = useState(false);

  const enrichedRecords = useMemo(() => {
    const ordered = sortAttendanceEntries(records, sortAsc);
    return ordered.map((record) => {
      const session = sessions.find((item) => item.id === record.sessionId);
      return {
        ...record,
        sessionName: session?.practicumName ?? record.sessionId,
        sessionClass: session?.courseClass ?? record.classId,
      };
    });
  }, [records, sessions, sortAsc]);

  if (user?.role !== 'student') {
    return (
      <View style={[styles.guard, { backgroundColor: colors.background }]}>
        <Text style={[styles.guardTitle, { color: colors.textPrimary }]}>
          Halaman tidak tersedia
        </Text>
        <Text style={[styles.guardBody, { color: colors.textSecondary }]}>
          Riwayat kehadiran pribadi hanya tersedia untuk Praktikan.
        </Text>
      </View>
    );
  }

  const attendedCount = enrichedRecords.length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scrollContent,
        { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heading}>
        <View style={styles.headingRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Kehadiran saya</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.roleBadgeText, { color: colors.textSecondary }]}>
              {fromCache ? 'Cache lokal' : 'Sinkron real-time'}
            </Text>
          </View>
        </View>
        <Text style={[styles.identityText, { color: colors.textSecondary }, styles.tabular]}>
          {user.displayName} · {user.identifier}
        </Text>
      </View>

      <View
        style={[
          styles.metricCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.metricLeft}>
          <View
            style={[
              styles.metricIcon,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricIconText, { color: colors.textPrimary }]}>✓</Text>
          </View>
          <View style={styles.metricInfo}>
            <Text style={[styles.metricCount, { color: colors.textPrimary }, styles.tabular]}>
              {attendedCount} kehadiran tercatat
            </Text>
            <Text style={[styles.metricSubtitle, { color: colors.textSecondary }]}>
              Riwayat presensi akun aktif
            </Text>
          </View>
        </View>

        <View style={styles.metricRight}>
          <View
            style={[
              styles.countRing,
              { borderColor: attendedCount === 0 ? colors.border : colors.textPrimary },
            ]}
          >
            <Text style={[styles.countRingValue, { color: colors.textPrimary }, styles.tabular]}>
              {attendedCount}
            </Text>
          </View>
          <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>Total hadir</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderTitle, { color: colors.textPrimary }]}>Riwayat sesi</Text>
        <Pressable
          onPress={() => setSortAsc((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Urutkan ${sortAsc ? 'terbaru' : 'terlama'}`}
          style={({ pressed }) => [
            styles.sortButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.sortButtonText, { color: colors.textSecondary }]}>Urutkan: </Text>
          <Text style={[styles.sortButtonText, { color: colors.textPrimary }]}>
            {sortAsc ? 'Terlama' : 'Terbaru'}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View
          style={[
            styles.stateCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={[styles.stateBody, { color: colors.textSecondary }]}>
            Memuat riwayat kehadiran
          </Text>
        </View>
      ) : error ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.stateCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>
            Gagal memuat riwayat
          </Text>
          <Text style={[styles.stateBody, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Muat ulang riwayat kehadiran"
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
      ) : enrichedRecords.length === 0 ? (
        <View
          style={[
            styles.stateCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.stateTitle, { color: colors.textPrimary }]}>Belum ada kehadiran</Text>
          <Text style={[styles.stateBody, { color: colors.textSecondary }]}>
            Presensi yang Anda catat pada sesi berlangsung akan tampil di sini.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lihat jadwal praktikum"
            onPress={() => router.push('/schedule')}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.actionPrimary },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.retryButtonText, { color: colors.actionSecondary }]}>
              Lihat jadwal
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardList}>
          {enrichedRecords.map((record) => (
            <AttendanceCard key={record.id} record={record} colors={colors} />
          ))}
        </View>
      )}

      <View
        style={[
          styles.protocolNote,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.protocolText, { color: colors.textSecondary }]}>
          Presensi dicatat menggunakan waktu server Firestore dan tetap tersimpan saat aplikasi dibuka ulang.
        </Text>
      </View>
    </ScrollView>
  );
}

function AttendanceCard({
  record,
  colors,
}: {
  record: AttendanceEntry & { sessionName: string; sessionClass?: string };
  colors: Palette;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <Text style={[styles.cardModulLabel, { color: colors.textSecondary }]}>
            Sesi praktikum
          </Text>
          <Text style={[styles.cardSessionName, { color: colors.textPrimary }]}>
            {record.sessionName}
          </Text>
          {record.sessionClass ? (
            <Text style={[styles.cardSessionClass, { color: colors.textSecondary }]}>
              {record.sessionClass}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.hadirBadge,
            { backgroundColor: colors.actionPrimary },
          ]}
        >
          <Text style={[styles.hadirBadgeText, { color: colors.actionSecondary }]}>
            ✓ Hadir
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.timeBox,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <View style={styles.timeBoxLeft}>
          <Text style={[styles.timeBoxLabel, { color: colors.textSecondary }]}>
            Waktu server
          </Text>
          <Text style={[styles.timeBoxValue, { color: colors.textPrimary }, styles.tabular]}>
            {record.attendedAt}
          </Text>
        </View>
        <View style={styles.timeBoxRight}>
          <Text style={[styles.timeBoxLabel, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[styles.timeBoxValue, { color: colors.textPrimary }]}>
            {record.hasPendingWrites ? 'Menunggu sinkron' : 'Tercatat'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
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
    gap: 8,
    paddingTop: 8,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  roleBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  identityText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  metricCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconText: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricInfo: {
    flex: 1,
    gap: 4,
  },
  metricCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  metricSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  metricRight: {
    alignItems: 'center',
    gap: 4,
  },
  countRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countRingValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  ringLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardList: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleGroup: {
    flex: 1,
    gap: 4,
  },
  cardModulLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  cardSessionName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  cardSessionClass: {
    fontSize: 13,
    fontWeight: '400',
  },
  hadirBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hadirBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  timeBoxLeft: {
    flex: 1,
    gap: 4,
  },
  timeBoxRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeBoxLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  timeBoxValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  stateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
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
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  protocolNote: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  protocolText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
