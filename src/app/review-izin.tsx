import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { aiStatusLabel, useAssistantLeaveRequests, useLeave } from '@/features/leave';
import { usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LeaveRequest } from '@/types';

function formatServerDate(value: number | null): string {
  return value === null ? 'Menunggu waktu server' : new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function LeaveReviewScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { classes, sessions, loadingClasses } = usePracticum();
  const { requests, loading, error, fromCache, retry } = useAssistantLeaveRequests(classes.map((item) => item.id));
  const { reviewLeave } = useLeave();
  const [pendingOnly, setPendingOnly] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const displayed = pendingOnly ? requests.filter((item) => item.status === 'pending') : requests;

  const decide = (request: LeaveRequest, decision: 'approved' | 'rejected') => {
    const verb = decision === 'approved' ? 'menerima' : 'menolak';
    Alert.alert('Konfirmasi keputusan', `Anda akan ${verb} izin ini. Keputusan tidak dapat diubah.`, [
      { text: 'Batal', style: 'cancel' },
      { text: decision === 'approved' ? 'Terima' : 'Tolak', style: decision === 'rejected' ? 'destructive' : 'default', onPress: () => {
        void (async () => {
          setSubmittingId(request.id);
          try {
            await reviewLeave(request.id, decision, notes[request.id]);
          } catch (decisionError) {
            Alert.alert('Keputusan gagal disimpan', decisionError instanceof Error ? decisionError.message : 'Silakan coba lagi.');
          } finally {
            setSubmittingId(null);
          }
        })();
      } },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>RUANG ASISTEN</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Review izin</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Hasil AI hanya konteks. Keputusan izin selalu dibuat manual oleh Asisten.</Text>
      </View>
      <Pressable onPress={() => setPendingOnly((value) => !value)} style={[styles.filter, { borderColor: colors.border, backgroundColor: pendingOnly ? colors.surfaceMuted : colors.surface }]}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{pendingOnly ? 'Menampilkan: pending' : 'Menampilkan: semua status'}</Text>
      </Pressable>
      {fromCache ? <Text style={[styles.cache, { color: colors.textSecondary }]}>Menampilkan data cache. Menunggu sinkronisasi server.</Text> : null}
      {loading || loadingClasses ? <View style={styles.state}><ActivityIndicator color={colors.actionPrimary} /><Text style={{ color: colors.textSecondary }}>Memuat pengajuan izin...</Text></View> : null}
      {error ? <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Izin belum dapat dimuat</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{error}</Text><Pressable onPress={retry} style={[styles.retry, { borderColor: colors.border }]}><Text style={{ color: colors.textPrimary }}>Coba lagi</Text></Pressable></View> : null}
      {!loading && !loadingClasses && !error && displayed.length === 0 ? <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Tidak ada izin {pendingOnly ? 'pending' : ''}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>Pengajuan dari kelas yang Anda kelola akan muncul di sini secara real-time.</Text></View> : null}
      {displayed.map((request) => {
        const session = sessions.find((item) => item.id === request.sessionId);
        const disabled = request.status !== 'pending' || submittingId === request.id;
        return <View key={request.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{session?.title ?? request.sessionId}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{session?.className ?? request.classId} · dibuat {formatServerDate(request.createdAtMs)}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>ALASAN PRAKTIKAN</Text>
          <Text style={[styles.body, { color: colors.textPrimary }]}>{request.reason}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>KLASIFIKASI AI</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{request.aiStatus === 'success' ? `${request.aiCategory ?? 'Lainnya'}${typeof request.aiConfidence === 'number' ? ` · ${Math.round(request.aiConfidence * 100)}% keyakinan` : ''}` : aiStatusLabel(request.aiStatus)}</Text>
          {request.status === 'pending' ? <><TextInput value={notes[request.id] ?? ''} onChangeText={(value) => setNotes((current) => ({ ...current, [request.id]: value }))} maxLength={500} multiline placeholder="Catatan untuk Praktikan (opsional)" placeholderTextColor={colors.textSecondary} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]} editable={!disabled} /><View style={styles.actions}><Pressable disabled={disabled} onPress={() => decide(request, 'rejected')} style={[styles.decisionButton, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}><Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Tolak</Text></Pressable><Pressable disabled={disabled} onPress={() => decide(request, 'approved')} style={[styles.decisionButton, { backgroundColor: disabled ? colors.disabledSurface : colors.actionPrimary }]}>{submittingId === request.id ? <ActivityIndicator size="small" color={colors.disabledText} /> : <Text style={{ color: colors.actionSecondary, fontWeight: '700' }}>Terima</Text>}</Pressable></View></> : <Text style={[styles.meta, { color: colors.textSecondary }]}>Keputusan: {request.status === 'approved' ? 'diterima' : 'ditolak'} · {formatServerDate(request.reviewedAtMs)}{request.reviewNote ? ` · ${request.reviewNote}` : ''}</Text>}
        </View>;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, paddingBottom: 40, gap: 14 }, header: { gap: 5, paddingTop: 12, marginBottom: 6 }, eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }, title: { fontSize: 28, fontWeight: '800' }, subtitle: { fontSize: 14, lineHeight: 20 },
  filter: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 }, cache: { fontSize: 12, fontStyle: 'italic' }, state: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 }, cardTitle: { fontSize: 16, fontWeight: '700' }, meta: { fontSize: 12, lineHeight: 18 }, label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, marginTop: 4 }, body: { fontSize: 14, lineHeight: 20 }, input: { minHeight: 72, borderWidth: 1, borderRadius: 8, padding: 10, textAlignVertical: 'top', marginTop: 4 }, actions: { flexDirection: 'row', gap: 8, marginTop: 4 }, decisionButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, retry: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 7, marginTop: 4 },
});
