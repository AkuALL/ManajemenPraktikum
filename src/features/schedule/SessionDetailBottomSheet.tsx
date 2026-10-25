import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LabSession } from '@/types';

import { SessionDetail } from './SessionDetail';
import { getStatusPresentation } from './status';

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
  const status = session ? getStatusPresentation(session.status) : null;

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
            <View style={styles.titleGroup}>
              <Text numberOfLines={1} style={styles.heading}>
                {session?.practicumName ?? 'Detail sesi'}
              </Text>
              {session && <Text style={styles.sessionCode}>Sesi praktikum · {session.id}</Text>}
            </View>
            <Pressable
              accessibilityLabel="Tutup detail sesi"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          {session && status && (
            <View style={styles.chips}>
              <View style={styles.classChip}>
                <Text style={styles.classChipText}>▣ {session.courseClass ?? 'Kelas praktikum'}</Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: status.backgroundColor, borderColor: status.borderColor },
                ]}>
                <Text style={[styles.statusChipText, { color: status.textColor }]}>
                  {status.icon} {status.label}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {session && <SessionDetail session={session} showHeader={false} />}
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'transparent',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '86%',
    overflow: 'hidden',
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#D9E0E9',
    borderRadius: 99,
    height: 4,
    width: 42,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  titleGroup: {
    flex: 1,
    gap: 3,
  },
  heading: {
    color: '#1E2942',
    fontSize: 17,
    fontWeight: '800',
  },
  sessionCode: {
    color: '#8A94A6',
    fontSize: 12,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  closeButtonText: {
    color: '#25324A',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 30,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  classChip: {
    backgroundColor: '#EEF1F5',
    borderColor: '#D9E0E9',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  classChipText: {
    color: '#536078',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: '#E7EBF0',
    height: 1,
  },
  content: {
    backgroundColor: '#F8FAFC',
    gap: 12,
    padding: 20,
    paddingBottom: 32,
  },
  pressed: {
    opacity: 0.65,
  },
});
