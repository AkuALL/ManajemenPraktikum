import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { LabSession, SessionActionType } from '@/types';

export interface ConfirmSessionModalProps {
  visible: boolean;
  actionType: SessionActionType | null;
  session: LabSession | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSessionModal({
  visible,
  actionType,
  session,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmSessionModalProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  if (!visible || !actionType || !session) {
    return null;
  }

  const isOpenAction = actionType === 'open';

  const title = isOpenAction ? 'Buka Sesi Sekarang?' : 'Tutup Sesi Praktikum?';
  const description = isOpenAction
    ? 'Sesi akan berubah menjadi status Berlangsung. Praktikan dapat mulai mencatat kehadiran pada sesi ini.'
    : 'Praktikan tidak dapat melakukan presensi baru setelah sesi ini diselesaikan. Pastikan seluruh praktikan telah hadir.';

  const confirmButtonLabel = isOpenAction ? 'Buka Sesi' : 'Tutup Sesi';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      <Pressable
        style={styles.backdrop}
        onPress={loading ? undefined : onCancel}
        accessibilityRole="button"
        accessibilityLabel="Tutup dialog konfirmasi">
        <Pressable
          style={[
            styles.card,
            isDark ? styles.cardDark : styles.cardLight,
          ]}
          onPress={(e) => e.stopPropagation()}>
          {/* Header & Icon */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconBadge,
                isOpenAction
                  ? isDark
                    ? styles.iconBadgeOpenDark
                    : styles.iconBadgeOpenLight
                  : isDark
                    ? styles.iconBadgeCloseDark
                    : styles.iconBadgeCloseLight,
              ]}>
              <Text
                style={[
                  styles.iconText,
                  isOpenAction
                    ? isDark
                      ? styles.iconTextOpenDark
                      : styles.iconTextOpenLight
                    : isDark
                      ? styles.iconTextCloseDark
                      : styles.iconTextCloseLight,
                ]}>
                {isOpenAction ? '▶' : '■'}
              </Text>
            </View>
            <View style={styles.titleContainer}>
              <Text
                style={[
                  styles.titleText,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {title}
              </Text>
              <Text
                style={[
                  styles.sessionSubtext,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                {session.practicumName}
                {session.courseClass ? ` · ${session.courseClass}` : ''}
              </Text>
            </View>
          </View>

          {/* Sesi Info Box */}
          <View
            style={[
              styles.infoBox,
              isDark ? styles.infoBoxDark : styles.infoBoxLight,
            ]}>
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.infoLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                Lokasi:
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {session.location}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.infoLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                Waktu:
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {session.startsAt} – {session.endsAt}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text
                style={[
                  styles.infoLabel,
                  isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
                ]}>
                Transisi Status:
              </Text>
              <Text
                style={[
                  styles.infoStatusValue,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                {isOpenAction
                  ? 'Belum dibuka ➔ Berlangsung'
                  : 'Berlangsung ➔ Selesai'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text
            style={[
              styles.descriptionText,
              isDark ? styles.textSecondaryDark : styles.textSecondaryLight,
            ]}>
            {description}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              disabled={loading}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Batal konfirmasi"
              style={({ pressed }) => [
                styles.button,
                styles.buttonCancel,
                isDark ? styles.buttonCancelDark : styles.buttonCancelLight,
                pressed && styles.buttonPressed,
              ]}>
              <Text
                style={[
                  styles.buttonCancelText,
                  isDark ? styles.textPrimaryDark : styles.textPrimaryLight,
                ]}>
                Batal
              </Text>
            </Pressable>

            <Pressable
              disabled={loading}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmButtonLabel}
              style={({ pressed }) => [
                styles.button,
                isOpenAction
                  ? isDark
                    ? styles.buttonConfirmOpenDark
                    : styles.buttonConfirmOpenLight
                  : isDark
                    ? styles.buttonConfirmCloseDark
                    : styles.buttonConfirmCloseLight,
                pressed && styles.buttonPressed,
              ]}>
              {loading ? (
                <ActivityIndicator
                  color={
                    isOpenAction
                      ? isDark
                        ? '#000000'
                        : '#ffffff'
                      : '#ffffff'
                  }
                  size="small"
                />
              ) : (
                <Text
                  style={[
                    styles.buttonConfirmText,
                    isOpenAction
                      ? isDark
                        ? styles.buttonTextDark
                        : styles.buttonTextLight
                      : styles.buttonTextLight,
                  ]}>
                  {confirmButtonLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  cardDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBadgeOpenLight: {
    backgroundColor: '#EEEEEE',
    borderWidth: 1,
    borderColor: '#D2D2D2',
  },
  iconBadgeOpenDark: {
    backgroundColor: '#292929',
    borderWidth: 1,
    borderColor: '#414141',
  },
  iconBadgeCloseLight: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#D2D2D2',
  },
  iconBadgeCloseDark: {
    backgroundColor: '#292929',
    borderWidth: 1,
    borderColor: '#414141',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iconTextOpenLight: {
    color: '#171717',
  },
  iconTextOpenDark: {
    color: '#F5F5F5',
  },
  iconTextCloseLight: {
    color: '#171717',
  },
  iconTextCloseDark: {
    color: '#F5F5F5',
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  sessionSubtext: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  infoBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  infoBoxLight: {
    backgroundColor: '#F7F7F7',
    borderColor: '#E5E5E5',
  },
  infoBoxDark: {
    backgroundColor: '#141414',
    borderColor: '#292929',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoStatusValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonCancel: {
    borderWidth: 1,
  },
  buttonCancelLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  buttonCancelDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  buttonCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonConfirmOpenLight: {
    backgroundColor: '#171717',
  },
  buttonConfirmOpenDark: {
    backgroundColor: '#F5F5F5',
  },
  buttonConfirmCloseLight: {
    backgroundColor: '#171717',
  },
  buttonConfirmCloseDark: {
    backgroundColor: '#F5F5F5',
  },
  buttonConfirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextLight: {
    color: '#FFFFFF',
  },
  buttonTextDark: {
    color: '#171717',
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
