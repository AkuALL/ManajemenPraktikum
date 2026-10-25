import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AssistantSessionActionControls } from '@/components/assistant';
import { Colors, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { LabSession } from '@/types';

const INITIAL_SESSION: LabSession = {
  id: 'ses-01', practicumName: 'Basis Data', courseClass: 'Kelas B',
  location: 'Lab Komputer 2', date: '27 Okt 2026', startsAt: '13.00', endsAt: '15.00', status: 'upcoming',
};

export default function HomeScreen() {
  const [session, setSession] = useState(INITIAL_SESSION);
  const { activeIdentity } = useIdentity();
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const isAssistant = activeIdentity?.role === 'assistant';

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{isAssistant ? 'RUANG ASISTEN' : 'RUANG PRAKTIKAN'}</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Jadwal praktikum</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isAssistant ? 'Kelola sesi dan lihat rekap kegiatan.' : 'Lihat jadwal dan catatan kehadiran Anda.'}
        </Text>
      </View>

      <View style={[styles.session, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sessionTop}>
          <View>
            <Text style={[styles.course, { color: colors.textSecondary }]}>{session.courseClass}</Text>
            <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>{session.practicumName}</Text>
          </View>
          <Text style={[styles.status, { color: colors.textPrimary, backgroundColor: colors.surfaceMuted }]}>
            {session.status === 'upcoming' ? 'Belum dibuka' : session.status === 'open' ? 'Berlangsung' : 'Selesai'}
          </Text>
        </View>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <View style={styles.details}>
          <Detail label="Tanggal" value={session.date ?? '—'} color={colors.textPrimary} muted={colors.textSecondary} />
          <Detail label="Waktu" value={`${session.startsAt}–${session.endsAt}`} color={colors.textPrimary} muted={colors.textSecondary} />
          <Detail label="Lokasi" value={session.location} color={colors.textPrimary} muted={colors.textSecondary} />
        </View>
        {isAssistant ? (
          <AssistantSessionActionControls role="assistant" session={session} onStatusChange={(_, status) => setSession((current) => ({ ...current, status }))} />
        ) : (
          <View style={[styles.notice, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.noticeTitle, { color: colors.textPrimary }]}>
              {session.status === 'open' ? 'Presensi tersedia' : 'Informasi sesi'}
            </Text>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              {session.status === 'open' ? 'Sesi sedang berlangsung. Catat kehadiran melalui menu Kehadiran saya.' : 'Presensi dapat dilakukan saat sesi dibuka oleh asisten.'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.accessSection}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Akses {isAssistant ? 'asisten' : 'praktikan'}</Text>
        <AccessRow title={isAssistant ? 'Kelola sesi' : 'Jadwal praktikum'} description={isAssistant ? 'Buka atau tutup sesi sesuai waktu kegiatan.' : 'Periksa kelas, waktu, dan lokasi praktikum.'} color={colors.textPrimary} muted={colors.textSecondary} border={colors.border} />
        <AccessRow title={isAssistant ? 'Rekap kehadiran' : 'Kehadiran saya'} description={isAssistant ? 'Tinjau catatan kehadiran peserta.' : 'Lihat riwayat kehadiran Anda.'} color={colors.textPrimary} muted={colors.textSecondary} border={colors.border} />
      </View>
      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>Data tersimpan sementara pada perangkat ini.</Text>
    </ScrollView>
  );
}

function Detail({ label, value, color, muted }: { label: string; value: string; color: string; muted: string }) {
  return <View style={styles.detail}><Text style={[styles.detailLabel, { color: muted }]}>{label}</Text><Text style={[styles.detailValue, { color }]}>{value}</Text></View>;
}

function AccessRow({ title, description, color, muted, border }: { title: string; description: string; color: string; muted: string; border: string }) {
  return <View style={[styles.accessRow, { borderBottomColor: border }]}><Text style={[styles.accessTitle, { color }]}>{title}</Text><Text style={[styles.accessDescription, { color: muted }]}>{description}</Text></View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 24 },
  heading: { gap: 8, paddingTop: 12 }, eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 }, subtitle: { fontSize: 15, lineHeight: 22 },
  session: { borderWidth: 1, padding: 18, borderRadius: 12 }, sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  course: { fontSize: 13, fontWeight: '600' }, sessionTitle: { fontSize: 21, fontWeight: '700', marginTop: 4 },
  status: { overflow: 'hidden', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, fontWeight: '600' },
  rule: { height: 1, marginVertical: 16 }, details: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }, detail: { minWidth: '28%', flexGrow: 1, gap: 4 },
  detailLabel: { fontSize: 12 }, detailValue: { fontSize: 14, fontWeight: '600' },
  notice: { marginTop: 20, padding: 14, borderRadius: 8, gap: 4 }, noticeTitle: { fontSize: 14, fontWeight: '700' }, noticeText: { fontSize: 13, lineHeight: 19 },
  accessSection: { gap: 0 }, sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  accessRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 }, accessTitle: { fontSize: 15, fontWeight: '600' }, accessDescription: { fontSize: 13, lineHeight: 19 },
  disclaimer: { fontSize: 12, lineHeight: 18 },
});
