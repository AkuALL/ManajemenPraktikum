import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
} from 'react-native';
import { LabSession, SessionStatus, UserRole } from '@/types';
import { ConfirmSessionModal } from './confirm-session-modal';
import { AssistantActionFeedback } from './assistant-action-feedback';
import { useSessionActions } from '@/hooks/use-session-actions';

export interface AssistantSessionActionControlsProps {
  role: UserRole;
  session: LabSession;
  onStatusChange?: (sessionId: string, newStatus: SessionStatus) => void;
  hideWhenStudent?: boolean;
}

export function AssistantSessionActionControls({
  role,
  session,
  onStatusChange,
  hideWhenStudent = true,
}: AssistantSessionActionControlsProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const {
    isAssistant,
    modalVisible,
    activeAction,
    isProcessing,
    feedback,
    requestOpenSession,
    requestCloseSession,
    handleCancelModal,
    handleConfirmAction,
    dismissFeedback,
  } = useSessionActions({
    role,
    session,
    onStatusChange,
  });

  // Guard: Jika peran adalah Praktikan
  if (!isAssistant) {
    if (hideWhenStudent) {
      return null;
    }
    return (
      <View
        style={[
          styles.nonAssistantCard,
          isDark ? styles.nonAssistantCardDark : styles.nonAssistantCardLight,
        ]}>
        <Text
          style={[
            styles.nonAssistantText,
            isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
          ]}>
          Aksi sesi hanya tersedia untuk peran Asisten.
        </Text>
      </View>
    );
  }

  const isUpcoming = session.status === 'upcoming';
  const isOpen = session.status === 'open';
  const isClosed = session.status === 'closed';

  return (
    <View style={styles.container}>
      {/* Feedback Toast/Banner jika ada aksi yang dieksekusi */}
      <AssistantActionFeedback
        feedback={feedback}
        onDismiss={dismissFeedback}
      />

      {/* Bagian Kontrol Aksi Asisten */}
      <View
        style={[
          styles.actionCard,
          isDark ? styles.actionCardDark : styles.actionCardLight,
        ]}>
        <View style={styles.cardHeader}>
          <Text
            style={[
              styles.sectionTitle,
              isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
            ]}>
            KONTROL SESI ASISTEN
          </Text>
          <View
            style={[
              styles.roleBadge,
              isDark ? styles.roleBadgeDark : styles.roleBadgeLight,
            ]}>
            <Text
              style={[
                styles.roleBadgeText,
                isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
              ]}>
              Asisten Lab
            </Text>
          </View>
        </View>

        {/* Kondisi 1: Sesi Belum Dibuka (Upcoming) */}
        {isUpcoming && (
          <View style={styles.actionGroup}>
            <Text
              style={[
                styles.actionDescription,
                isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
              ]}>
              Sesi berstatus Belum dibuka. Buka sesi ini agar praktikan dapat mulai
              melakukan presensi kehadiran mandiri.
            </Text>

            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                requestOpenSession();
              }}
              accessibilityRole="button"
              accessibilityLabel="Buka sesi praktikum"
              style={({ pressed }) => [
                styles.primaryButton,
                isDark
                  ? styles.primaryButtonDark
                  : styles.primaryButtonLight,
                pressed && styles.buttonPressed,
              ]}>
              <Text
                style={[
                  styles.primaryButtonText,
                  isDark ? styles.primaryButtonTextDark : styles.primaryButtonTextLight,
                ]}>
                ▶ Buka sesi
              </Text>
            </Pressable>
          </View>
        )}

        {/* Kondisi 2: Sesi Sedang Berlangsung (Open) */}
        {isOpen && (
          <View style={styles.actionGroup}>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.pulseDot} />
              <Text
                style={[
                  styles.liveStatusText,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                Sesi sedang berlangsung & presensi aktif
              </Text>
            </View>

            <Text
              style={[
                styles.actionDescription,
                isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
              ]}>
              Setelah praktikum berakhir, tutup sesi ini untuk menghentikan
              pencatatan presensi peserta.
            </Text>

            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                requestCloseSession();
              }}
              accessibilityRole="button"
              accessibilityLabel="Tutup sesi praktikum"
              style={({ pressed }) => [
                styles.secondaryButton,
                isDark
                  ? styles.secondaryButtonDark
                  : styles.secondaryButtonLight,
                pressed && styles.buttonPressed,
              ]}>
              <Text
                style={[
                  styles.secondaryButtonText,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                ■ Tutup sesi
              </Text>
            </Pressable>
          </View>
        )}

        {/* Kondisi 3: Sesi Sudah Selesai (Closed) */}
        {isClosed && (
          <View style={styles.closedSessionCard}>
            <Text
              style={[
                styles.closedTitle,
                isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
              ]}>
              ✓ Sesi Telah Selesai
            </Text>
            <Text
              style={[
                styles.closedDescription,
                isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
              ]}>
              Sesi ini sudah ditutup. Tidak ada aksi perubahan status lebih lanjut
              yang dapat dijalankan.
            </Text>
          </View>
        )}
      </View>

      {/* Modal Konfirmasi Buka / Tutup */}
      <ConfirmSessionModal
        visible={modalVisible}
        actionType={activeAction}
        session={session}
        loading={isProcessing}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  actionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  actionCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  actionCardDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeLight: {
    backgroundColor: '#EEEEEE',
    borderColor: '#D2D2D2',
  },
  roleBadgeDark: {
    backgroundColor: '#292929',
    borderColor: '#414141',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionGroup: {
    gap: 12,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonLight: {
    backgroundColor: '#171717',
  },
  primaryButtonDark: {
    backgroundColor: '#F5F5F5',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonTextLight: {
    color: '#FFFFFF',
  },
  primaryButtonTextDark: {
    color: '#171717',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1.5,
  },
  secondaryButtonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#171717',
  },
  secondaryButtonDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#F5F5F5',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#171717',
  },
  liveStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closedSessionCard: {
    paddingVertical: 8,
    gap: 4,
  },
  closedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  closedDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  nonAssistantCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  nonAssistantCardLight: {
    backgroundColor: '#F7F7F7',
    borderColor: '#E5E5E5',
  },
  nonAssistantCardDark: {
    backgroundColor: '#141414',
    borderColor: '#292929',
  },
  nonAssistantText: {
    fontSize: 12,
    textAlign: 'center',
  },
  textPrimaryLight: {
    color: '#171717',
  },
  textPrimaryDark: {
    color: '#F5F5F5',
  },
  textSecondaryLight: {
    color: '#555555',
  },
  textSecondaryDark: {
    color: '#C2C2C2',
  },
});
