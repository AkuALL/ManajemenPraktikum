/**
 * Kehadiran Screen — JE-04
 * Owner: Jesica
 * Riwayat kehadiran Praktikan aktif.
 * Disesuaikan dengan baseline design (HTML reference).
 */

import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { useAttendance } from '@/features/attendance';
import type { LocalAttendanceRecord } from '@/features/attendance';

export default function AttendanceScreen() {
  const { activeIdentity } = useIdentity();
  const { getRecordsByStudent } = useAttendance();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const [sortAsc, setSortAsc] = useState(false); // false = terbaru dulu

  // Guard: hanya Praktikan
  if (activeIdentity?.role !== 'student') {
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

  const allRecords = getRecordsByStudent(activeIdentity.userId);
  const sorted = useMemo(() => {
    const copy = [...allRecords];
    return sortAsc ? copy.reverse() : copy;
  }, [allRecords, sortAsc]);

  const totalSessions = allRecords.length;
  const attendedCount = allRecords.length; // semua record = hadir
  const pct = totalSessions === 0 ? 0 : Math.round((attendedCount / totalSessions) * 100);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scrollContent,
        { maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%' },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header identitas ─────────────────────────── */}
      <View style={styles.heading}>
        <View style={styles.headingRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Kehadiran saya</Text>
          <View
            style={[
              styles.semesterBadge,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.semesterText, { color: colors.textSecondary }]}>
              Semester Ganjil 2026/2027
            </Text>
          </View>
        </View>
        <View style={styles.identityRow}>
          <Text style={[styles.identityText, { color: colors.textSecondary }]}>
            {activeIdentity.displayName}
            {activeIdentity.identifier ? ` · ${activeIdentity.identifier}` : ''}
          </Text>
          <View style={styles.activeDot} />
        </View>
      </View>

      {/* ── Metric Summary Banner ────────────────────── */}
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
              {
                backgroundColor: isDark ? '#0D2E1A' : '#F0FDF4',
                borderColor: isDark ? '#1A4D2E' : '#86EFAC',
              },
            ]}
          >
            <Text style={styles.metricIconText}>✓</Text>
          </View>
          <View style={styles.metricInfo}>
            <View style={styles.metricTitleRow}>
              <Text style={[styles.metricCount, { color: colors.textPrimary }]}>
                {attendedCount} kehadiran tercatat
              </Text>
              {attendedCount > 0 && (
                <View
                  style={[
                    styles.validBadge,
                    {
                      backgroundColor: isDark ? '#0D2E1A' : '#DCFCE7',
                    },
                  ]}
                >
                  <Text style={styles.validBadgeText}>Valid</Text>
                </View>
              )}
            </View>
            <Text style={[styles.metricSubtitle, { color: colors.textSecondary }]}>
              Total sesi terselesaikan semester ini
            </Text>
          </View>
        </View>
        {/* Percentage ring (sederhana tanpa native SVG dependency) */}
        <View style={styles.metricRight}>
          <View style={styles.ringContainer}>
            <View
              style={[
                styles.ringOuter,
                { borderColor: totalSessions === 0 ? colors.border : '#16A34A' },
              ]}
            >
              <Text style={[styles.ringPct, { color: colors.textPrimary }]}>{pct}%</Text>
            </View>
          </View>
          <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>
            Tingkat{'\n'}presensi
          </Text>
        </View>
      </View>

      {/* ── Riwayat Sesi header ──────────────────────── */}
      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderTitle, { color: colors.textPrimary }]}>
          ⊟  Riwayat Sesi
        </Text>
        <Pressable
          onPress={() => setSortAsc((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Urutkan ${sortAsc ? 'terbaru' : 'terlama'}`}
          style={({ pressed }) => [
            styles.sortButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.sortButtonText, { color: colors.textSecondary }]}>⇅ </Text>
          <Text style={[styles.sortButtonText, { color: colors.textPrimary }]}>
            {sortAsc ? 'Terlama' : 'Terbaru'}
          </Text>
        </Pressable>
      </View>

      {/* ── Cards ────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <View style={styles.cardList}>
          {sorted.map((record) => (
            <AttendanceCard key={record.id} record={record} colors={colors} />
          ))}
        </View>
      )}

      {/* ── Protocol note ────────────────────────────── */}
      <View
        style={[
          styles.protocolNote,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={styles.protocolIcon}>📋</Text>
        <Text style={[styles.protocolText, { color: colors.textSecondary }]}>
          Presensi dicatat menggunakan waktu perangkat saat tombol dikonfirmasi. Data bersifat
          sementara dan tidak tersinkronisasi ke server.
        </Text>
      </View>
    </ScrollView>
  );
}

/* ── Sub-komponen ─────────────────────────────────── */

function AttendanceCard({
  record,
  colors,
}: {
  record: LocalAttendanceRecord;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <View style={styles.cardModulRow}>
            <View style={styles.greenDot} />
            <Text style={[styles.cardModulLabel, { color: colors.textSecondary }]}>
              Sesi praktikum
            </Text>
          </View>
          <Text style={[styles.cardSessionName, { color: colors.textPrimary }]}>
            {record.sessionName}
          </Text>
          {record.sessionClass ? (
            <Text style={[styles.cardSessionClass, { color: colors.textSecondary }]}>
              {record.sessionClass}
            </Text>
          ) : null}
        </View>
        <View style={styles.hadirBadge}>
          <Text style={styles.hadirBadgeText}>✓  Hadir</Text>
        </View>
      </View>

      {/* Time info */}
      <View
        style={[
          styles.timeBox,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <View style={styles.timeBoxLeft}>
          <Text style={[styles.timeBoxLabel, { color: colors.textSecondary }]}>
            🕐  Waktu Presensi
          </Text>
          <Text style={[styles.timeBoxValue, { color: colors.textPrimary }]}>
            {record.attendedAt}
          </Text>
        </View>
        <View style={styles.timeBoxRight}>
          <Text style={[styles.timeBoxLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.verifiedRow}>
            <Text style={styles.verifiedIcon}>✓</Text>
            <Text style={[styles.timeBoxValue, { color: colors.textPrimary }]}>Tercatat</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ colors }: { colors: ReturnType<typeof getColors> }) {
  return (
    <View
      style={[
        styles.emptyState,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum ada riwayat</Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
        Kehadiran akan tercatat di sini setelah Anda melakukan presensi pada sesi yang sedang
        berlangsung.
      </Text>
    </View>
  );
}

/* ── Helper type ─────────────────────────────────── */
function getColors(isDark: boolean) {
  return isDark ? Colors.dark : Colors.light;
}

/* ── Styles ─────────────────────────────────────── */
const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  // Guard
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  guardTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  guardBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  // Heading
  heading: { gap: 6, paddingTop: 8 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  semesterBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  semesterText: { fontSize: 11, fontWeight: '600' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identityText: { fontSize: 14, lineHeight: 20 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  // Metric banner
  metricCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconText: { fontSize: 18, color: '#16A34A' },
  metricInfo: { flex: 1, gap: 3 },
  metricTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metricCount: { fontSize: 13, fontWeight: '700' },
  validBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  validBadgeText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
  metricSubtitle: { fontSize: 12, lineHeight: 16 },
  metricRight: { alignItems: 'center', gap: 4 },
  ringContainer: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringPct: { fontSize: 11, fontWeight: '700' },
  ringLabel: { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  // List header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listHeaderTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  sortButtonText: { fontSize: 13, fontWeight: '600' },
  // Card list
  cardList: { gap: 12 },
  card: {
    borderRadius: 14,
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
  cardTitleGroup: { flex: 1, gap: 3 },
  cardModulRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  cardModulLabel: { fontSize: 12, fontWeight: '500' },
  cardSessionName: { fontSize: 17, fontWeight: '700' },
  cardSessionClass: { fontSize: 13 },
  hadirBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hadirBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  // Time info box
  timeBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeBoxLeft: { gap: 3 },
  timeBoxRight: { alignItems: 'flex-end', gap: 3 },
  timeBoxLabel: { fontSize: 12, fontWeight: '500' },
  timeBoxValue: { fontSize: 13, fontWeight: '700' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedIcon: { fontSize: 12, color: '#16A34A' },
  // Empty state
  emptyState: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  // Protocol note
  protocolNote: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  protocolIcon: { fontSize: 16 },
  protocolText: { fontSize: 12, lineHeight: 18, flex: 1 },
});
