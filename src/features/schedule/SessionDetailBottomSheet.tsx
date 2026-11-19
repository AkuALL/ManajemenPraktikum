import React, { type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FlyAwayBottomSheet } from '@/components/ui/fly-away-bottom-sheet';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LabSession } from '@/types';

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
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const status = session ? getStatusPresentation(session.status) : null;

  return (
    <FlyAwayBottomSheet
      visible={visible && Boolean(session)}
      onClose={onClose}
      title={session?.practicumName ?? 'Detail sesi'}
      subtitle={session ? `Sesi praktikum · ${session.id}` : undefined}
    >
      <View style={styles.container}>
        {session && status ? (
          <View style={styles.chips}>
            <View
              style={[
                styles.classChip,
                { backgroundColor: colors.balticSoft, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.classChipText, { color: colors.baltic }]}>
                {session.courseClass ?? 'Kelas praktikum'}
              </Text>
            </View>
            <View
              style={[
                styles.statusChip,
                { backgroundColor: status.backgroundColor, borderColor: status.borderColor },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: status.dotColor }]} />
              <Text style={[styles.statusChipText, { color: status.textColor }]}>
                {status.label}
              </Text>
            </View>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {session ? <SessionDetail session={session} showHeader={false} /> : null}
          {children}
        </ScrollView>
      </View>
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  classChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  classChipText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  content: {
    gap: 12,
    paddingBottom: 12,
  },
});
