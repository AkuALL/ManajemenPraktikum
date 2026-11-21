import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Info, ShieldAlert } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  registerConfirmDialogHandler,
  type ConfirmActionOptions,
} from '@/lib/cross-platform-alert';

/**
 * Host dialog konfirmasi global bergaya aplikasi untuk seluruh pemanggilan confirmAction.
 */
export function ConfirmDialogHost() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [queue, setQueue] = useState<ConfirmActionOptions[]>([]);
  const active = queue[0] ?? null;

  useEffect(() => {
    return registerConfirmDialogHandler((options) => {
      setQueue((prev) => [...prev, options]);
    });
  }, []);

  if (!active) {
    return null;
  }

  const isDestructive = Boolean(active.destructive);

  const handleCancel = () => {
    const current = active;
    setQueue((prev) => prev.slice(1));
    current.onCancel?.();
  };

  const handleConfirm = () => {
    const current = active;
    setQueue((prev) => prev.slice(1));
    current.onConfirm();
  };

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup dialog konfirmasi"
          onPress={handleCancel}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.backdrop} />
        </Pressable>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDestructive ? colors.rosySoft : colors.balticSoft,
                  borderColor: isDestructive ? colors.rosyBorder : colors.border,
                },
              ]}
            >
              {isDestructive ? (
                <ShieldAlert size={20} color={colors.rosy} strokeWidth={2.2} />
              ) : (
                <Info size={20} color={colors.baltic} strokeWidth={2.2} />
              )}
            </View>

            <View style={styles.titleBlock}>
              <Text
                style={[
                  styles.eyebrow,
                  { color: isDestructive ? colors.rosyDark : colors.textSubtle },
                ]}
              >
                {isDestructive ? 'Tindakan tidak dapat dibatalkan' : 'Konfirmasi tindakan'}
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {active.title}
              </Text>
            </View>
          </View>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {active.message}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={active.cancelText ?? 'Batal'}
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { backgroundColor: colors.background, borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                {active.cancelText ?? 'Batal'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={active.confirmText}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: isDestructive ? colors.rosy : colors.baltic },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.confirmText}>{active.confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(13, 35, 54, 0.56)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#0D2336',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    lineHeight: 22,
  },
  message: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  confirmBtn: {
    flex: 1.25,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.8,
  },
});
