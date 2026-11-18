import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import {
  formatSessionDate,
  formatSessionTime,
  SessionLifecycleButtons,
  usePracticum,
} from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessions, loadingSessions, openSession, closeSession } = usePracticum();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const isAssistant = user?.role === 'assistant';
  const featuredSession = sessions.find((s) => s.status === 'open') ?? sessions[0];

  const featuredClassLabel = featuredSession
    ? [featuredSession.className, featuredSession.courseName].filter(Boolean).join(' · ') ||
      featuredSession.classId
    : '';

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
          {isAssistant ? 'RUANG ASISTEN' : 'RUANG PRAKTIKAN'}
        </Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Jadwal praktikum</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isAssistant ? 'Kelola sesi dan tinjau kehadiran.' : 'Lihat sesi dan catat kehadiran Anda.'}
        </Text>

        {isAssistant && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/classes' as any)}
            style={({ pressed }) => [
              styles.classesShortcut,
              { borderColor: colors.actionPrimary, backgroundColor: colors.surfaceMuted },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.classesShortcutText, { color: colors.actionPrimary }]}>
              👥 Kelola Kelas & Anggota Praktikum ➔
            </Text>
          </Pressable>
        )}
      </View>

      {loadingSessions && !featuredSession ? (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Memuat jadwal sesi...</Text>
        </View>
      ) : featuredSession ? (
        <View style={[styles.session, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sessionTop}>
            <View style={styles.titleGroup}>
              <Text style={[styles.course, { color: colors.textSecondary }]}>{featuredClassLabel}</Text>
              <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>{featuredSession.title}</Text>
            </View>
            <Text style={[styles.status, { color: colors.textPrimary, backgroundColor: colors.surfaceMuted }]}>
              {featuredSession.status === 'scheduled' ? 'Belum dibuka' : featuredSession.status === 'open' ? 'Berlangsung' : 'Selesai'}
            </Text>
          </View>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <View style={styles.details}>
            <Detail
              label="Tanggal"
              value={formatSessionDate(featuredSession.date, featuredSession.startsAt)}
              color={colors.textPrimary}
              muted={colors.textSecondary}
            />
            <Detail
              label="Waktu"
              value={`${formatSessionTime(featuredSession.startsAt)}–${formatSessionTime(featuredSession.endsAt)}`}
              color={colors.textPrimary}
              muted={colors.textSecondary}
            />
            <Detail label="Lokasi" value={featuredSession.location} color={colors.textPrimary} muted={colors.textSecondary} />
          </View>

          {isAssistant ? (
            <SessionLifecycleButtons
              session={featuredSession}
              isAssistant={isAssistant}
              onOpenSession={openSession}
              onCloseSession={closeSession}
            />
          ) : (
            <Text style={[styles.notice, { color: colors.textSecondary, backgroundColor: colors.surfaceMuted }]}>
              {featuredSession.status === 'open'
                ? 'Buka detail sesi untuk mencatat kehadiran.'
                : 'Presensi tersedia setelah sesi dibuka oleh Asisten.'}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Buka detail ${featuredSession.title}`}
            onPress={() => router.push({ pathname: '/schedule/[sessionId]', params: { sessionId: featuredSession.id } })}
            style={({ pressed }) => [styles.detailButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.detailButtonText, { color: colors.textPrimary }]}>Lihat detail sesi</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Belum ada jadwal praktikum</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Jadwal sesi akan tampil di sini saat tersedia.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Detail({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return <View style={styles.detail}><Text style={[styles.detailLabel, { color: muted }]}>{label}</Text><Text style={[styles.detailValue, { color }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 24 },
  heading: { gap: 8, paddingTop: 12 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  classesShortcut: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  classesShortcutText: {
    fontSize: 13,
    fontWeight: '700',
  },
  session: { borderWidth: 1, padding: 18, borderRadius: 12 },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleGroup: { flex: 1 }, course: { fontSize: 13, fontWeight: '600' },
  sessionTitle: { fontSize: 21, fontWeight: '700', marginTop: 4 },
  status: { overflow: 'hidden', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '600' },
  rule: { height: 1, marginVertical: 16 },
  details: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  detail: { minWidth: '28%', flexGrow: 1, gap: 4 },
  detailLabel: { fontSize: 12 }, detailValue: { fontSize: 14, fontWeight: '600' },
  notice: { marginTop: 18, padding: 12, borderRadius: 8, fontSize: 13, lineHeight: 19 },
  detailButton: { minHeight: 46, marginTop: 16, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  detailButtonText: { fontSize: 14, fontWeight: '600' }, pressed: { opacity: 0.7 },
  empty: { padding: 20, borderWidth: 1, borderRadius: 12, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700' }, emptyText: { fontSize: 14, lineHeight: 20 },
});
