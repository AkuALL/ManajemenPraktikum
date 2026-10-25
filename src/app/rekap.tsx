import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { useSchedule } from '@/features/schedule';

export default function RecapScreen() {
  const router = useRouter();
  const { activeIdentity } = useIdentity();
  const { attendance, sessions } = useSchedule();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  if (activeIdentity?.role !== 'assistant') {
    return <View style={[styles.content, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary }}>Halaman tidak tersedia</Text></View>;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG ASISTEN</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Rekap kehadiran</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Daftar Praktikan yang hadir pada tiap sesi.</Text>

      {sessions.map((session) => {
        const sessionRecords = attendance.filter((record) => record.sessionId === session.id);
        return (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            accessibilityLabel={`Buka sesi ${session.practicumName}`}
            onPress={() => router.push({ pathname: '/schedule/[sessionId]', params: { sessionId: session.id } })}
            style={({ pressed }) => [styles.session, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>{session.practicumName} · {session.courseClass}</Text>
            <Text style={[styles.sessionMeta, { color: colors.textSecondary }]}>
              {session.date ?? 'Tanggal belum ditentukan'} · {session.startsAt}–{session.endsAt} · {session.location}
            </Text>
            {sessionRecords.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Belum ada Praktikan yang tercatat hadir.</Text>
            ) : sessionRecords.map((record) => (
              <View key={record.id} style={[styles.attendee, { borderTopColor: colors.border }]}>
                <Text style={[styles.studentName, { color: colors.textPrimary }]}>{record.studentName}</Text>
                <Text style={[styles.attendedAt, { color: colors.textSecondary }]}>
                  {new Date(record.attendedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              </View>
            ))}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 40, gap: 12 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 6 },
  session: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 6 },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  sessionMeta: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  emptyText: { fontSize: 13, lineHeight: 19, paddingVertical: 6 },
  attendee: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 4, gap: 3 },
  studentName: { fontSize: 14, fontWeight: '600' },
  attendedAt: { fontSize: 13 },
  pressed: { opacity: 0.75 },
});
