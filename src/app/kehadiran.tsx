/**
 * Kehadiran Screen — JE-04
 * Owner: Jesica
 * Riwayat kehadiran Praktikan aktif. Empty state jika belum ada catatan.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { useAttendance } from '@/features/attendance';

export default function AttendanceScreen() {
  const { activeIdentity } = useIdentity();
  const { getRecordsByStudent } = useAttendance();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // Hak akses: hanya Praktikan
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

  const myRecords = getRecordsByStudent(activeIdentity.userId);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { maxWidth: MaxContentWidth }]}
    >
      {/* Header */}
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG PRAKTIKAN</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Kehadiran saya</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Riwayat sesi dan catatan kehadiran identitas aktif.
        </Text>
      </View>

      {/* Identitas aktif */}
      <View
        style={[
          styles.identityCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.identityLabel, { color: colors.textSecondary }]}>Identitas aktif</Text>
        <Text style={[styles.identityName, { color: colors.textPrimary }]}>
          {activeIdentity.displayName}
        </Text>
        {activeIdentity.identifier ? (
          <Text style={[styles.identityId, { color: colors.textSecondary }]}>
            {activeIdentity.identifier}
          </Text>
        ) : null}
      </View>

      {/* Daftar riwayat atau empty state */}
      {myRecords.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Belum ada riwayat
          </Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            Kehadiran akan tercatat di sini setelah Anda melakukan presensi pada sesi yang
            sedang berlangsung.
          </Text>
        </View>
      ) : (
        <View style={styles.recordList}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {myRecords.length} catatan kehadiran
          </Text>
          {myRecords.map((record) => (
            <View
              key={record.id}
              style={[
                styles.recordCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.recordTop}>
                <View style={styles.recordTitleGroup}>
                  <Text style={[styles.recordSession, { color: colors.textPrimary }]}>
                    {record.sessionName}
                  </Text>
                  {record.sessionClass ? (
                    <Text style={[styles.recordClass, { color: colors.textSecondary }]}>
                      {record.sessionClass}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.recordBadge,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.recordBadgeText, { color: colors.textSecondary }]}>
                    ✓ Hadir
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.recordMeta}>
                <RecordMetaRow
                  label="Dicatat pukul"
                  value={record.attendedAt}
                  textColor={colors.textPrimary}
                  mutedColor={colors.textSecondary}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        Data kehadiran tersimpan sementara pada perangkat ini.
      </Text>
    </ScrollView>
  );
}

function RecordMetaRow({
  label,
  value,
  textColor,
  mutedColor,
}: {
  label: string;
  value: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 40,
    gap: 20,
    width: '100%',
  },
  // Guard (peran salah)
  guard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  guardTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  guardBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  // Header
  heading: {
    gap: 6,
    paddingTop: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  // Identitas aktif
  identityCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 3,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  identityName: {
    fontSize: 17,
    fontWeight: '700',
  },
  identityId: {
    fontSize: 13,
  },
  // Empty state
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 6,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  // Record list
  recordList: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  recordCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  recordTitleGroup: {
    flex: 1,
    gap: 3,
  },
  recordSession: {
    fontSize: 16,
    fontWeight: '700',
  },
  recordClass: {
    fontSize: 13,
  },
  recordBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  recordBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
  },
  recordMeta: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Disclaimer
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
