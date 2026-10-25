import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { getDemoAttendanceForSession, useSchedule } from '@/features/schedule';

export default function RecapScreen() {
  const { activeIdentity } = useIdentity();
  const { sessions } = useSchedule();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  if (activeIdentity?.role !== 'assistant') {
    return <View style={[styles.content, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>Halaman tidak tersedia</Text></View>;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG ASISTEN</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Rekap kehadiran</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Daftar kehadiran demo untuk setiap sesi praktikum.</Text>
      <View style={[styles.infoNote, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Text style={[styles.infoNoteText, { color: colors.textSecondary }]}>
          Rekap demo ini menggunakan fixture terpisah dan tidak disinkronkan dengan presensi Praktikan.
        </Text>
      </View>

      {sessions.map((session) => {
        const sessionRecords = getDemoAttendanceForSession(session.id);
        return (
          <View
            key={session.id}
            style={[styles.session, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sessionHeader}>
              <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>{session.practicumName} · {session.courseClass}</Text>
              <Text style={[styles.status, { color: colors.textSecondary, backgroundColor: colors.surfaceMuted }]}>
                {getStatusLabel(session.status)}
              </Text>
            </View>
            <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>
              {session.date ?? 'Tanggal belum ditentukan'} · {session.startsAt}–{session.endsAt} · {session.location}
            </Text>
            {sessionRecords.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada catatan kehadiran demo untuk sesi ini.</Text>
            ) : sessionRecords.map((record) => (
              <View key={record.id} style={[styles.attendee, { borderTopColor: colors.border }]}>
                <Text style={[styles.studentName, { color: colors.textPrimary }]}>{record.studentName}</Text>
                <Text style={[styles.attendedAt, { color: colors.textSecondary }]}>
                  Hadir · {record.attendedAt}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function getStatusLabel(status: 'upcoming' | 'open' | 'closed') {
  if (status === 'open') return '● Berlangsung';
  if (status === 'closed') return '✓ Selesai';
  return '◷ Belum dibuka';
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 40, gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  infoNote: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  infoNoteText: { fontSize: 12, lineHeight: 18 },
  session: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 6 },
  sessionHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  status: { borderRadius: 999, fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 5 },
  sessionMeta: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  emptyText: { fontSize: 13, lineHeight: 19, paddingVertical: 6 },
  attendee: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 4, gap: 3 },
  studentName: { fontSize: 14, fontWeight: '600' },
  attendedAt: { fontSize: 13 },
});
