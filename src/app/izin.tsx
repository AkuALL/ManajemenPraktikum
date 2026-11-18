import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { aiStatusLabel, useLeave } from '@/features/leave';
import { usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LeaveRequest } from '@/types';

function formatServerDate(value: number | null): string {
  if (value === null) return 'Menunggu waktu server';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function statusLabel(status: LeaveRequest['status']): string {
  if (status === 'approved') return 'Diterima';
  if (status === 'rejected') return 'Ditolak';
  return 'Menunggu review';
}

export default function MyLeaveRequestsScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { sessions } = usePracticum();
  const { requests, loading, error, fromCache, classificationErrors, retryClassification, retry } = useLeave();

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG PRAKTIKAN</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Izin saya</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Pantau pengajuan izin dan keputusan Asisten. Ajukan izin dari detail sesi yang belum selesai.</Text>
      </View>

      {fromCache ? <Text style={[styles.cache, { color: colors.textSecondary }]}>Menampilkan data cache. Menunggu sinkronisasi server.</Text> : null}
      {loading ? <View style={styles.state}><ActivityIndicator color={colors.actionPrimary} /><Text style={{ color: colors.textSecondary }}>Memuat pengajuan izin...</Text></View> : null}
      {error ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Izin belum dapat dimuat</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={retry} style={[styles.retry, { borderColor: colors.border }]}><Text style={{ color: colors.textPrimary }}>Coba lagi</Text></Pressable>
        </View>
      ) : null}

      {!loading && !error && requests.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Belum ada pengajuan izin</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Buka detail sesi terjadwal atau berlangsung untuk membuat pengajuan izin.</Text>
        </View>
      ) : null}

      {requests.map((request) => {
        const session = sessions.find((item) => item.id === request.sessionId);
        const classificationError = classificationErrors[request.id];
        return (
          <View key={request.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{session?.title ?? 'Sesi praktikum'}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{session?.className ?? request.classId} · {formatServerDate(request.createdAtMs)}</Text>
              </View>
              <Text style={[styles.status, { color: colors.textPrimary, backgroundColor: colors.surfaceMuted }]}>{statusLabel(request.status)}</Text>
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ALASAN</Text>
            <Text style={[styles.body, { color: colors.textPrimary }]}>{request.reason}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>KLASIFIKASI AI</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {request.aiStatus === 'success' ? `${request.aiCategory ?? 'Lainnya'}${typeof request.aiConfidence === 'number' ? ` · ${Math.round(request.aiConfidence * 100)}% keyakinan` : ''}` : aiStatusLabel(request.aiStatus)}
            </Text>
            {classificationError ? <Text accessibilityRole="alert" style={[styles.meta, { color: colors.textSecondary }]}>{classificationError}</Text> : null}
            {request.aiStatus === 'failed' ? <Pressable onPress={() => void retryClassification(request.id)} style={[styles.retry, { borderColor: colors.border }]}><Text style={{ color: colors.textPrimary }}>Coba klasifikasi lagi</Text></Pressable> : null}
            {request.status !== 'pending' ? (
              <View style={[styles.decision, { borderTopColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>KEPUTUSAN ASISTEN</Text>
                <Text style={[styles.body, { color: colors.textPrimary }]}>{statusLabel(request.status)} · {formatServerDate(request.reviewedAtMs)}</Text>
                {request.reviewNote ? <Text style={[styles.meta, { color: colors.textSecondary }]}>Catatan: {request.reviewNote}</Text> : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 14 },
  header: { gap: 5, paddingTop: 12, marginBottom: 6 }, eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }, title: { fontSize: 28, fontWeight: '800' }, subtitle: { fontSize: 14, lineHeight: 20 },
  cache: { fontSize: 12, fontStyle: 'italic' }, state: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }, cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' }, cardTitle: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, lineHeight: 18 }, label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, marginTop: 4 }, body: { fontSize: 14, lineHeight: 20 },
  status: { fontSize: 12, fontWeight: '700', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden' }, retry: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 7, marginTop: 4 },
  decision: { borderTopWidth: 1, paddingTop: 10, marginTop: 4, gap: 4 },
});
