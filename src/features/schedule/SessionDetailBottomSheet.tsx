import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LabSession } from '@/types';

import { SessionDetail } from './SessionDetail';

type SessionDetailBottomSheetProps = {
  children?: ReactNode;
  onClose: () => void;
  session: LabSession | null;
  visible: boolean;
};

export function SessionDetailBottomSheet({
  children,
  onClose,
  session,
  visible,
}: SessionDetailBottomSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="Tutup detail sesi"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.heading}>Detail sesi</Text>
            <Pressable
              accessibilityLabel="Tutup detail sesi"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeButtonText}>Tutup</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {session && <SessionDetail session={session} />}
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.44)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    backgroundColor: '#F4F7FB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '86%',
    overflow: 'hidden',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#94A3B8',
    borderRadius: 99,
    height: 4,
    width: 42,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heading: {
    color: '#172033',
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 56,
  },
  closeButtonText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    gap: 12,
    padding: 20,
    paddingBottom: 32,
  },
  pressed: {
    opacity: 0.65,
  },
});
