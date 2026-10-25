import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';

export default function AttendanceScreen() {
  const { activeIdentity } = useIdentity();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  if (activeIdentity?.role !== 'student') return <View style={[styles.content, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Halaman tidak tersedia</Text><Text style={{ color: colors.textSecondary }}>Kehadiran pribadi hanya tersedia untuk Praktikan.</Text></View>;
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG PRAKTIKAN</Text>
    <Text style={[styles.title, { color: colors.textPrimary }]}>Kehadiran saya</Text>
    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Riwayat sesi dan catatan kehadiran Anda.</Text>
    <View style={[styles.row, { borderColor: colors.border }]}><Text style={[styles.label, { color: colors.textPrimary }]}>Belum ada riwayat</Text><Text style={{ color: colors.textSecondary }}>Kehadiran akan tercatat setelah Anda mengikuti sesi.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 24, gap: 8 }, eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }, title: { fontSize: 28, fontWeight: '700', marginTop: 4 }, subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 16 }, row: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16, gap: 6 }, label: { fontSize: 15, fontWeight: '600' } });
