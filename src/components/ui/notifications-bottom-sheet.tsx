import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useLeave } from '@/features/leave';
import { formatSessionTime, usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { FlyAwayBottomSheet } from './fly-away-bottom-sheet';

type NotificationsBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
};

type NotificationItem = {
  id: string;
  title: string;
  meta: string;
  unread: boolean;
};

export function NotificationsBottomSheet({
  visible,
  onClose,
}: NotificationsBottomSheetProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { sessions } = usePracticum({ classes: false, sessions: visible });
  const { requests } = useLeave();
  const [markedReadAll, setMarkedReadAll] = useState(false);

  const items = useMemo<NotificationItem[]>(() => {
    const result: NotificationItem[] = [];

    if (user?.role === 'student') {
      requests.slice(0, 3).forEach((req) => {
        const session = sessions.find((s) => s.id === req.sessionId);
        const statusText =
          req.status === 'approved'
            ? 'disetujui'
            : req.status === 'rejected'
              ? 'ditolak'
              : 'menunggu konfirmasi';
        result.push({
          id: `leave-${req.id}`,
          title: `Izin ${session?.courseName ?? session?.title ?? 'Praktikum'} ${statusText}`,
          meta: req.reviewedBy ? 'Diperbarui asisten' : 'Pengajuan aktif',
          unread: !markedReadAll && req.status !== 'pending',
        });
      });
    }

    sessions
      .filter((s) => s.status === 'open')
      .slice(0, 2)
      .forEach((s) => {
        result.push({
          id: `session-${s.id}`,
          title: `${s.courseName ?? s.title} sedang dibuka`,
          meta: `${formatSessionTime(s.startsAt)} · ${s.location}`,
          unread: !markedReadAll,
        });
      });

    sessions
      .filter((s) => s.status === 'scheduled')
      .slice(0, 2)
      .forEach((s) => {
        result.push({
          id: `upcoming-${s.id}`,
          title: `Pengingat sesi ${s.title}`,
          meta: `${formatSessionTime(s.startsAt)} · ${s.location}`,
          unread: false,
        });
      });

    if (result.length === 0) {
      result.push({
        id: 'empty-info',
        title: 'Semua jadwal praktikum sinkron',
        meta: 'Belum ada pembaruan baru untuk akun ini',
        unread: false,
      });
    }

    return result;
  }, [markedReadAll, requests, sessions, user?.role]);

  const unreadCount = items.filter((item) => item.unread).length;

  return (
    <FlyAwayBottomSheet
      visible={visible}
      onClose={onClose}
      title="Notifikasi"
      subtitle={unreadCount > 0 ? `${unreadCount} pembaruan terbaru` : 'Semua sudah terbaca'}
      maxHeight="72%"
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={() => setMarkedReadAll(true)}
          style={({ pressed }) => [
            styles.markBtn,
            { backgroundColor: colors.surfaceMuted },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.markBtnText, { color: colors.textPrimary }]}>
            Tandai Semua Dibaca
          </Text>
        </Pressable>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.row,
              {
                backgroundColor: item.unread ? colors.pacificSoft : colors.background,
                borderColor: item.unread ? colors.pacificLight : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: item.unread ? colors.rosy : colors.borderStrong },
              ]}
            />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.meta}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 300,
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 11.5,
    lineHeight: 16,
  },
  markBtn: {
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.78,
  },
});
