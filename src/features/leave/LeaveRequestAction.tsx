import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionSummary } from '@/types';

import { useLeave } from './context';
import { isLeaveEligibleStatus, validateLeaveReason } from './port';

export function LeaveRequestAction({
  session,
  sessionTitle,
}: {
  session: SessionSummary;
  sessionTitle: string;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { requests, submitLeave } = useLeave();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const existing = requests.find((request) => request.sessionId === session.id);
  const eligible = isLeaveEligibleStatus(session.status);

  if (existing) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Izin sudah diajukan</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Status keputusan: {existing.status === 'pending' ? 'menunggu review Asisten' : existing.status === 'approved' ? 'diterima' : 'ditolak'}.
        </Text>
      </View>
    );
  }

  if (!eligible) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Izin tidak tersedia</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Sesi sudah selesai sehingga pengajuan izin baru tidak dapat dibuat.</Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    const validationError = validateLeaveReason(reason);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    const result = await submitLeave(session, reason);
    if (result.ok) {
      setReason('');
      setMessage('Izin tersimpan. Klasifikasi AI diproses sebagai informasi pendukung.');
    } else {
      setMessage(result.message);
    }
    setSubmitting(false);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Ajukan izin</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>Tuliskan alasan ketidakhadiran untuk sesi {sessionTitle}. Keputusan tetap dibuat oleh Asisten.</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        editable={!submitting}
        multiline
        maxLength={1000}
        accessibilityLabel="Alasan izin"
        placeholder="Contoh: Saya sakit dan tidak dapat mengikuti praktikum."
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
      />
      <Text style={[styles.counter, { color: colors.textSecondary }]}>{reason.trim().length}/1000 karakter</Text>
      {message ? <Text accessibilityRole="alert" style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
      <Pressable
        disabled={submitting}
        onPress={() => void handleSubmit()}
        accessibilityRole="button"
        accessibilityLabel="Kirim pengajuan izin"
        style={({ pressed }) => [styles.button, { backgroundColor: submitting ? colors.disabledSurface : colors.actionPrimary }, pressed && !submitting && styles.pressed]}
      >
        {submitting ? <ActivityIndicator size="small" color={colors.disabledText} /> : <Text style={[styles.buttonText, { color: colors.actionSecondary }]}>Kirim pengajuan izin</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  input: { minHeight: 104, borderWidth: 1, borderRadius: 8, padding: 12, textAlignVertical: 'top', fontSize: 14 },
  counter: { fontSize: 12, textAlign: 'right' },
  message: { fontSize: 13, lineHeight: 18 },
  button: { minHeight: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
