import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { useSchedule } from '@/features/schedule';

export default function AttendanceScreen() {
  const router = useRouter();
  const { activeIdentity } = useIdentity();
  const { getAttendanceForStudent, getSessionById } = useSchedule();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  if (activeIdentity?.role !== 'student') {
    return <View style={[styles.content, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>Halaman tidak tersedia</Text></View>;
  }

  const records = getAttendanceForStudent(activeIdentity.userId)
    .slice()
    .sort((a, b) => b.attendedAt.localeCompare(a.attendedAt));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG PRAKTIKAN</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Kehadiran saya</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Riwayat sesi yang Anda hadiri.</Text>

      {records.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Belum ada riwayat kehadiran</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>Buka jadwal, pilih sesi yang sedang berlangsung, lalu catat kehadiran.</Text>
        </View>
      ) : records.map((record) => {
        const session = getSessionById(record.sessionId);
        if (!session) return null;
        return (
          <Pressable
            key={record.id}
            accessibilityRole="button"
            accessibilityLabel={`Buka detail ${session.practicumName}`}
            onPress={() => router.push({ pathname: '/schedule/[sessionId]', params: { sessionId: session.id } })}
            style={({ pressed }) => [styles.record, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>{session.practicumName}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {session.courseClass} · {session.date ?? 'Tanggal belum ditentukan'} · {session.startsAt}–{session.endsAt}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textPrimary }]}>
              Hadir {new Date(record.attendedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 40, gap: 10 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  empty: { padding: 18, borderWidth: 1, borderRadius: 10, gap: 6 },
  record: { padding: 16, borderWidth: 1, borderRadius: 10, gap: 6 },
  label: { fontSize: 15, fontWeight: '700' },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 19 },
  timestamp: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  pressed: { opacity: 0.75 },
});
