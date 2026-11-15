import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LabSession, SessionStatusV2, SessionSummary } from '@/types';

import { useAttendance } from './context';
import {
  formatServerTime,
  isSessionSummary,
  toSessionSummary,
} from './port';

export interface StudentAttendanceFormProps {
  session: LabSession | SessionSummary;
}

type FeedbackState =
  | { type: 'success'; time: string }
  | { type: 'duplicate'; time: string }
  | { type: 'error'; reason: string };

function statusLabel(status: SessionStatusV2): string {
  switch (status) {
    case 'scheduled':
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
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { records, submitAttendance } = useAttendance();

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const summary = toSessionSummary(session);
  const sessionTitle = isSessionSummary(session) ? session.id : session.practicumName;
  const sessionClass = isSessionSummary(session) ? session.classId : session.courseClass;

  const existingRecord = records.find((record) => record.sessionId === summary.id);
  const isOpen = summary.status === 'open';

  if (existingRecord) {
    const timeText = formatServerTime(existingRecord.attendedAtMs, 'time');
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
            <Text style={[styles.cardBody, { color: colors.textSecondary }, styles.tabular]}>
              {existingRecord.attendedAtMs === null
                ? 'Kehadiran tercatat dan menunggu konfirmasi waktu server.'
                : `Kehadiran Anda pada sesi ini telah tercatat pukul ${timeText}.`}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!isOpen) {
    const reason =
      summary.status === 'scheduled'
        ? 'Sesi belum dibuka oleh Asisten. Presensi dapat dilakukan saat sesi berlangsung.'
        : 'Sesi ini sudah selesai. Presensi baru tidak dapat diterima.';

    return (
      <View
        style={[
          styles.card,
          styles.cardMuted,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Presensi tidak tersedia
        </Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{reason}</Text>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.statusPillText, { color: colors.textSecondary }]}>
            Status sesi: {statusLabel(summary.status)}
          </Text>
        </View>
      </View>
    );
  }

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await submitAttendance(summary);
      setConfirmVisible(false);

      if (result.ok) {
        setFeedback({
          type: 'success',
          time: formatServerTime(result.record.attendedAtMs, 'time'),
        });
      } else if (result.reason === 'duplicate') {
        const time = result.record
          ? formatServerTime(result.record.attendedAtMs, 'time')
          : '-';
        setFeedback({ type: 'duplicate', time });
      } else {
        setFeedback({ type: 'error', reason: result.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {feedback ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.feedbackBanner,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.feedbackTitle, { color: colors.textPrimary }]}>
            {feedback.type === 'success'
              ? '✓ Presensi berhasil dicatat'
              : feedback.type === 'duplicate'
                ? 'Presensi sudah tercatat'
                : 'Presensi tidak dapat dicatat'}
          </Text>
          <Text style={[styles.feedbackBody, { color: colors.textSecondary }, styles.tabular]}>
            {feedback.type === 'success'
              ? feedback.time === 'Menunggu waktu server'
                ? 'Kehadiran dikirim dan menunggu waktu server.'
                : `Kehadiran Anda dicatat pukul ${feedback.time}.`
              : feedback.type === 'duplicate'
                ? `Kehadiran Anda pada sesi ini sudah tercatat (${feedback.time}).`
                : feedback.reason}
          </Text>
          <Pressable
            onPress={() => setFeedback(null)}
            accessibilityRole="button"
            accessibilityLabel="Tutup notifikasi"
            style={styles.dismissButton}
          >
            <Text style={[styles.dismissText, { color: colors.textPrimary }]}>Tutup</Text>
          </Pressable>
        </View>
      ) : null}

      {!feedback || feedback.type === 'error' ? (
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
            disabled={submitting}
            onPress={() => setConfirmVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Catat presensi saya"
            style={({ pressed }) => [
              styles.attendButton,
              {
                backgroundColor: submitting ? colors.disabledSurface : colors.actionPrimary,
              },
              pressed && !submitting && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.attendButtonText, { color: colors.actionSecondary }]}>
              Catat presensi saya
            </Text>
          </Pressable>
        </View>
      ) : null}

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
            onPress={() => {
              if (!submitting) setConfirmVisible(false);
            }}
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
              Konfirmasi presensi
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              Anda akan mencatat kehadiran sebagai{' '}
              <Text style={{ fontWeight: '600', color: colors.textPrimary }}>
                {user?.displayName ?? '-'}
              </Text>{' '}
              pada sesi{' '}
              <Text style={{ fontWeight: '600', color: colors.textPrimary }}>
                {sessionTitle}
                {sessionClass ? ` · ${sessionClass}` : ''}
              </Text>
              .
            </Text>
            <Text style={[styles.modalNote, { color: colors.textSecondary }]}>
              Waktu kehadiran dicatat menggunakan waktu server. Presensi hanya dapat dilakukan sekali per sesi.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={submitting}
                onPress={() => setConfirmVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Batal konfirmasi presensi"
                style={({ pressed }) => [
                  styles.modalButtonSecondary,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  pressed && !submitting && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Batal</Text>
              </Pressable>

              <Pressable
                disabled={submitting}
                onPress={() => {
                  void handleConfirm();
                }}
                accessibilityRole="button"
                accessibilityLabel="Konfirmasi catat presensi"
                style={({ pressed }) => [
                  styles.modalButtonPrimary,
                  {
                    backgroundColor: submitting ? colors.disabledSurface : colors.actionPrimary,
                  },
                  pressed && !submitting && styles.buttonPressed,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.disabledText} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.actionSecondary }]}>
                    Ya, catat hadir
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
    gap: 12,
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
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600',
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  cardBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendButton: {
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  attendButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  feedbackBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
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
    backgroundColor: 'rgba(23, 23, 23, 0.4)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  modalBody: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  modalNote: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalButtonSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
