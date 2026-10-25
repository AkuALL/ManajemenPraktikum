import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useIdentity } from '@/features/identity';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LabSession } from '@/types';
import { useSchedule } from './context';

export function StudentAttendanceAction({ session }: { session: LabSession }) {
  const { activeIdentity } = useIdentity();
  const { getAttendanceForStudent, recordAttendance } = useSchedule();
  const [feedback, setFeedback] = useState<string | null>(null);
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  if (activeIdentity?.role !== 'student') return null;

  const attendance = getAttendanceForStudent(activeIdentity.userId)
    .find((record) => record.sessionId === session.id);

  const handleAttendance = () => {
    const result = recordAttendance(session.id);
    setFeedback(result.ok ? 'Kehadiran berhasil dicatat.' : result.reason === 'duplicate'
      ? 'Kehadiran Anda untuk sesi ini sudah tercatat.'
      : result.reason === 'status'
        ? 'Presensi hanya tersedia saat sesi berlangsung.'
        : 'Presensi tidak dapat dicatat.');
  };

  if (attendance) {
    return (
      <View style={[styles.notice, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{feedback ?? 'Kehadiran tercatat'}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {new Date(attendance.attendedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
        </Text>
      </View>
    );
  }

  if (session.status !== 'open') {
    return (
      <View style={[styles.notice, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {session.status === 'closed' ? 'Sesi sudah selesai' : 'Sesi belum dibuka'}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Presensi tersedia saat sesi praktikum berlangsung.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.action}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Catat kehadiran untuk ${session.practicumName}`}
        onPress={handleAttendance}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.actionPrimary }, pressed && styles.pressed]}>
        <Text style={[styles.buttonText, { color: isDark ? Colors.light.textPrimary : Colors.dark.textPrimary }]}>
          Catat kehadiran
        </Text>
      </Pressable>
      {feedback ? <Text accessibilityRole="alert" style={[styles.feedback, { color: colors.textSecondary }]}>{feedback}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { marginTop: 20, gap: 8 },
  button: { minHeight: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  feedback: { fontSize: 13, lineHeight: 19 },
  notice: { marginTop: 20, padding: 14, borderWidth: 1, borderRadius: 8, gap: 4 },
  title: { fontSize: 14, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 19 },
});
