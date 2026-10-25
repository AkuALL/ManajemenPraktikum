
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LabSession, SessionStatus } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { useSchedule } from '@/features/schedule';

export interface StudentAttendanceFormProps {
  session: LabSession;
}

type FeedbackState =
  | { type: 'success'; time: string }
  | { type: 'duplicate'; time: string }
  | { type: 'ineligible'; reason: string };

function statusLabel(status: SessionStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Belum dibuka';
    case 'open':
      return 'Berlangsung';
    case 'closed':
      return 'Selesai';
  }
}

export function StudentAttendanceForm({
  session,
}: StudentAttendanceFormProps) {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { activeIdentity } = useIdentity();
  const { recordAttendance, getAttendanceForStudent } = useSchedule();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const existingRecord = activeIdentity
    ? getAttendanceForStudent(activeIdentity.userId).find(
        (record) => record.sessionId === session.id
      )
    : undefined;
  const isOpen = session.status === 'open';

  // Sudah tercatat → tampilkan status berhasil tanpa tombol
  if (existingRecord) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.checkmark, { color: colors.textPrimary }]}>✓</Text>
          <View style={styles.textBlock}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Presensi tercatat
            </Text>
            <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
              Kehadiran Anda pada sesi ini telah tercatat pukul{' '}
              {new Date(existingRecord.attendedAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Sesi tidak open → jelaskan alasan (JE-02)
  if (!isOpen) {
    const reason =
      session.status === 'upcoming'
        ? 'Sesi belum dibuka oleh asisten. Presensi dapat dilakukan saat sesi berstatus Berlangsung.'
        : 'Sesi ini sudah selesai. Presensi baru tidak dapat diterima.';

    return (
      <View
        style={[
          styles.card,
          styles.cardMuted,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Presensi tidak tersedia</Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{reason}</Text>
        <View style={[styles.statusPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statusPillText, { color: colors.textSecondary }]}>
            Status sesi: {statusLabel(session.status)}
          </Text>
        </View>
      </View>
    );
  }

  // Sesi open dan belum presensi → tombol konfirmasi (JE-03)
  const handleConfirm = () => {
    setSubmitting(true);
    const result = recordAttendance(session.id);

    setSubmitting(false);
    setConfirmVisible(false);

    if (result.ok) {
      const time = new Date(result.record.attendedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setFeedback({ type: 'success', time });
    } else if (result.reason === 'duplicate') {
      // Duplikat — ini edge case jika race condition
      const record = getAttendanceForStudent(activeIdentity?.userId ?? '').find(
        (item) => item.sessionId === session.id
      );
      const time = record
        ? new Date(record.attendedAt).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '-';
      setFeedback({ type: 'duplicate', time });
    } else {
      setFeedback({
        type: 'ineligible',
        reason:
          result.reason === 'status'
            ? 'Presensi hanya tersedia saat sesi berlangsung.'
            : 'Presensi tidak dapat dicatat.',
      });
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Feedback banner */}
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            feedback.type === 'success'
              ? { backgroundColor: isDark ? '#1A2E1A' : '#F0FDF4', borderColor: isDark ? '#2D4D2D' : '#86EFAC' }
              : { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>
            {feedback.type === 'success'
              ? '✓ Presensi berhasil dicatat'
              : feedback.type === 'duplicate'
                ? 'ℹ Presensi sudah tercatat'
                : 'Presensi tidak dapat dicatat'}
          </Text>
          <Text style={[styles.feedbackBody, { color: colors.textSecondary }]}>
            {feedback.type === 'success'
              ? `Kehadiran Anda dicatat pukul ${feedback.time}.`
              : feedback.type === 'duplicate'
                ? `Kehadiran Anda pada sesi ini sudah tercatat pukul ${feedback.time}.`
                : feedback.reason}
          </Text>
          <Pressable
            onPress={() => setFeedback(null)}
            accessibilityRole="button"
            accessibilityLabel="Tutup notifikasi"
            style={styles.dismissButton}
          >
            <Text style={[styles.dismissText, { color: colors.textSecondary }]}>Tutup</Text>
          </Pressable>
        </View>
      )}

      {/* Tombol presensi */}
      {!feedback && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Catat kehadiran</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Sesi sedang berlangsung. Tekan tombol di bawah untuk mencatat kehadiran Anda.
          </Text>
          <Pressable
            onPress={() => setConfirmVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Catat presensi saya"
            style={({ pressed }) => [
              styles.attendButton,
              { backgroundColor: colors.actionPrimary },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.attendButtonText, { color: colors.actionSecondary }]}>
              Catat presensi saya
            </Text>
          </Pressable>
        </View>
      )}

      {/* Modal konfirmasi presensi */}
      <Modal
        transparent
        visible={confirmVisible}
        animationType="fade"
        onRequestClose={() => {
          if (!submitting) setConfirmVisible(false);
        }}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => { if (!submitting) setConfirmVisible(false); }}
            accessibilityRole="button"
            accessibilityLabel="Tutup dialog konfirmasi presensi"
          >
            <View style={styles.backdrop} />
          </Pressable>

          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Konfirmasi Presensi
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Anda akan mencatat kehadiran sebagai{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {activeIdentity?.displayName}
              </Text>{' '}
              pada sesi{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {session.practicumName}
                {session.courseClass ? ` · ${session.courseClass}` : ''}
              </Text>
              .
            </Text>
            <Text style={[styles.modalNote, { color: colors.textSecondary }]}>
              Waktu kehadiran dicatat menggunakan jam perangkat saat ini. Presensi hanya dapat dilakukan sekali per sesi.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={submitting}
                onPress={() => setConfirmVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Batal konfirmasi presensi"
                style={({ pressed }) => [
                  styles.modalButtonSecondary,
                  { borderColor: colors.border },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Batal</Text>
              </Pressable>

              <Pressable
                disabled={submitting}
                onPress={handleConfirm}
                accessibilityRole="button"
                accessibilityLabel="Konfirmasi catat presensi"
                style={({ pressed }) => [
                  styles.modalButtonPrimary,
                  { backgroundColor: colors.actionPrimary },
                  pressed && styles.buttonPressed,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.actionSecondary} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.actionSecondary }]}>
                    Ya, catat kehadiran
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  cardMuted: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkmark: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendButton: {
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  attendButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  feedbackBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  modalNote: {
    fontSize: 12,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalButtonSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
