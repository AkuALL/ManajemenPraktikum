import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';

export default function RecapScreen() {
  const { activeIdentity } = useIdentity();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  if (activeIdentity?.role !== 'assistant') return <View style={[styles.content, { backgroundColor: colors.background }]}><Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Halaman tidak tersedia</Text><Text style={{ color: colors.textSecondary }}>Rekap hanya tersedia untuk Asisten.</Text></View>;
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
    <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG ASISTEN</Text>
    <Text style={[styles.title, { color: colors.textPrimary }]}>Rekap kehadiran</Text>
    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ringkasan pencatatan sesi praktikum.</Text>
    <View style={[styles.row, { borderColor: colors.border }]}><Text style={[styles.label, { color: colors.textPrimary }]}>Basis Data · Kelas B</Text><Text style={{ color: colors.textSecondary }}>Belum ada catatan</Text></View>
    <Text style={[styles.note, { color: colors.textSecondary }]}>Catatan kehadiran akan tampil setelah tersedia.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({ content: { padding: 24, gap: 8 }, eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }, title: { fontSize: 28, fontWeight: '700', marginTop: 4 }, subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 16 }, row: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16, gap: 6 }, label: { fontSize: 15, fontWeight: '600' }, note: { fontSize: 13, lineHeight: 20, marginTop: 12 } });
