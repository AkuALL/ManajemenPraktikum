import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { APP_ROUTES } from '@/features/navigation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionSummary } from '@/types';

import { useLeave } from './context';
import { LeaveRequestBottomSheet } from './LeaveRequestBottomSheet';
import { isLeaveEligibleStatus } from './port';

export function LeaveRequestAction({
  session,
  sessionTitle,
}: {
  session: SessionSummary;
  sessionTitle: string;
}) {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { requests } = useLeave();
  const [sheetVisible, setSheetVisible] = useState(false);

  const existing = requests.find((request) => request.sessionId === session.id);
  const eligible = isLeaveEligibleStatus(session.status);

  if (existing) {
    const label =
      existing.status === 'approved'
        ? 'Izin Disetujui'
        : existing.status === 'rejected'
          ? 'Izin Ditolak'
          : 'Izin Pending';

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(APP_ROUTES.STUDENT_ATTENDANCE as never)}
        style={({ pressed }) => [
          styles.statusBtn,
          {
            backgroundColor:
              existing.status === 'approved' ? colors.pacificSoft : colors.rosySoft,
            borderColor:
              existing.status === 'approved' ? colors.pacificLight : colors.rosyBorder,
          },
          pressed && styles.pressed,
        ]}
      >
        <CheckCircle2
          size={15}
          color={existing.status === 'approved' ? colors.pacificDark : colors.rosyDark}
          strokeWidth={2}
        />
        <Text
          style={[
            styles.statusBtnText,
            {
              color: existing.status === 'approved' ? colors.pacificDark : colors.rosyDark,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  if (!eligible) {
    return (
      <View
        style={[
          styles.disabledBtn,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.disabledBtnText, { color: colors.textSubtle }]}>
          Sesi Selesai
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ajukan izin untuk ${sessionTitle}`}
        onPress={() => setSheetVisible(true)}
        style={({ pressed }) => [
          styles.leaveBtn,
          { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
          pressed && styles.pressed,
        ]}
      >
        <CheckCircle2 size={15} color={colors.rosyDark} strokeWidth={2.1} />
        <Text style={[styles.leaveBtnText, { color: colors.rosyDark }]}>Ajukan Izin</Text>
      </Pressable>

      <LeaveRequestBottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        session={session}
        sessionSubtitle={sessionTitle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  leaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  leaveBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  statusBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  statusBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  disabledBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  disabledBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.78,
  },
});
