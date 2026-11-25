import { useRouter } from 'expo-router';
import { useMemo, useState, useSyncExternalStore } from 'react';
import {
    Animated,
    PanResponder,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useAssistantLeaveRequests, useLeave } from '@/features/leave';
import { APP_ROUTES } from '@/features/navigation';
import { formatSessionTime, usePracticum } from '@/features/practicum';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirmAction } from '@/lib/cross-platform-alert';

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
  targetRoute?: string;
  timestampMs: number;
};

type NotificationCenterState = {
  readIds: string[];
  dismissedIds: string[];
};

let centerState: NotificationCenterState = {
  readIds: [],
  dismissedIds: [],
};
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return centerState;
}

function markAllNotificationsRead(ids: string[]) {
  centerState = { ...centerState, readIds: Array.from(new Set([...centerState.readIds, ...ids])) };
  emitChange();
}

function markNotificationRead(id: string) {
  if (centerState.readIds.includes(id)) return;
  centerState = { ...centerState, readIds: [...centerState.readIds, id] };
  emitChange();
}

function dismissNotificationIds(ids: string[]) {
  const next = Array.from(new Set([...centerState.dismissedIds, ...ids]));
  if (next.length === centerState.dismissedIds.length) return;
  centerState = { ...centerState, dismissedIds: next };
  emitChange();
}

function formatReasonPreview(reason: string): string {
  const normalized = reason.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Menunggu konfirmasi asisten';
  if (normalized.length <= 68) return normalized;
  return `${normalized.slice(0, 67)}…`;
}

function parseIsoMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function useNotificationItems(enabled: boolean): NotificationItem[] {
  const { user } = useAuth();
  const isAssistant = user?.role === 'assistant';
  const { classes, sessions } = usePracticum({
    classes: enabled && isAssistant,
    sessions: enabled,
  });
  const classIds = useMemo(() => classes.map((c) => c.id), [classes]);
  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const { requests: assistantRequests } = useAssistantLeaveRequests(
    classIds,
    undefined,
    enabled && isAssistant,
  );
  const { requests } = useLeave();
  const { readIds, dismissedIds } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  return useMemo<NotificationItem[]>(() => {
    const result: NotificationItem[] = [];

    if (isAssistant) {
      assistantRequests
        .filter((req) => req.status === 'pending')
        .map((req) => {
          const session = sessions.find((s) => s.id === req.sessionId);
          const cls = classById.get(req.classId);
          const id = `${user?.uid}-assistant-leave-${req.id}`;
          return {
            id,
            title: `Pengajuan izin baru · ${session?.courseName ?? session?.title ?? cls?.courseName ?? 'Praktikum'}`,
            meta: formatReasonPreview(req.reason),
            unread: !readIds.includes(id),
            targetRoute: APP_ROUTES.ASSISTANT_LEAVE_REVIEW,
            timestampMs: req.hasPendingWrites
              ? Number.MAX_SAFE_INTEGER
              : (req.createdAtMs ?? req.updatedAtMs ?? 0),
          };
        })
        .sort((a, b) => b.timestampMs - a.timestampMs)
        .slice(0, 5)
        .forEach((item) => result.push(item));
    }

    if (user?.role === 'student') {
      requests
        .map((req) => {
          const session = sessions.find((s) => s.id === req.sessionId);
          const statusText =
            req.status === 'approved'
              ? 'disetujui'
              : req.status === 'rejected'
                ? 'ditolak'
                : 'menunggu konfirmasi';
          const id = `${user?.uid}-leave-${req.id}-${req.status}`;
          return {
            id,
            title: `Izin ${session?.courseName ?? session?.title ?? 'Praktikum'} ${statusText}`,
            meta: req.reviewedBy ? 'Diperbarui asisten' : 'Pengajuan aktif',
            unread: !readIds.includes(id) && req.status !== 'pending',
            timestampMs: req.hasPendingWrites
              ? Number.MAX_SAFE_INTEGER
              : (req.reviewedAtMs ?? req.updatedAtMs ?? req.createdAtMs ?? 0),
          };
        })
        .sort((a, b) => b.timestampMs - a.timestampMs)
        .slice(0, 3)
        .forEach((item) => result.push(item));
    }

    sessions
      .filter((s) => s.status === 'open')
      .map((s) => ({
        session: s,
        timestampMs: parseIsoMs(s.openedAt ?? s.updatedAt ?? s.startsAt),
      }))
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 2)
      .forEach(({ session: s, timestampMs }) => {
        const id = `${user?.uid}-session-${s.id}`;
        result.push({
          id,
          title: `${s.courseName ?? s.title} sedang dibuka`,
          meta: `${formatSessionTime(s.startsAt)} · ${s.location}`,
          unread: !readIds.includes(id),
          timestampMs,
        });
      });

    sessions
      .filter((s) => s.status === 'scheduled')
      .map((s) => ({
        session: s,
        timestampMs: parseIsoMs(s.updatedAt ?? s.createdAt ?? s.startsAt),
      }))
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 2)
      .forEach(({ session: s, timestampMs }) => {
        result.push({
          id: `${user?.uid}-upcoming-${s.id}`,
          title: `Sesi baru ? ${s.title}`,
          meta: `${formatSessionTime(s.startsAt)} · ${s.location}`,
          unread: user?.role === 'student' && !readIds.includes(`${user.uid}-upcoming-${s.id}`),
          targetRoute: APP_ROUTES.SCHEDULE,
          timestampMs,
        });
      });

    return result
      .filter((item) => !dismissedIds.includes(item.id))
      .sort((a, b) => b.timestampMs - a.timestampMs);
  }, [
    assistantRequests,
    classById,
    dismissedIds,
    isAssistant,
    readIds,
    requests,
    sessions,
    user,
  ]);
}

export function useUnreadNotificationsCount(): number {
  const items = useNotificationItems(true);
  return useMemo(() => items.filter((item) => item.unread).length, [items]);
}

type SwipeableNotificationRowProps = {
  item: NotificationItem;
  colors: typeof Colors.light | typeof Colors.dark;
  onPress: (item: NotificationItem) => void;
  onDismiss: (id: string) => void;
};

function SwipeableNotificationRow({
  item,
  colors,
  onPress,
  onDismiss,
}: SwipeableNotificationRowProps) {
  const [translateX] = useState(() => new Animated.Value(0));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dx > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx > 0) {
            translateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx >= 90 || gestureState.vx >= 0.65) {
            Animated.timing(translateX, {
              toValue: 360,
              duration: 180,
              useNativeDriver: true,
            }).start(() => onDismiss(item.id));
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        },
      }),
    [item.id, onDismiss, translateX],
  );

  const opacity = translateX.interpolate({
    inputRange: [0, 180],
    outputRange: [1, 0.2],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.row,
        {
          backgroundColor: item.unread ? colors.pacificSoft : colors.surfaceMuted,
          borderColor: item.unread ? colors.pacific : colors.border,
          transform: [{ translateX }],
          opacity,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress(item)}
        style={({ pressed }) => [
          styles.rowPressable,
          !item.unread && styles.rowRead,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: item.unread ? '#F97316' : colors.borderStrong },
          ]}
        />
        <View style={styles.rowText}>
          <Text
            style={[
              styles.rowTitle,
              { color: item.unread ? colors.textPrimary : colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.meta}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function NotificationsBottomSheet({
  visible,
  onClose,
}: NotificationsBottomSheetProps) {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const items = useNotificationItems(visible);

  const unreadCount = items.filter((item) => item.unread).length;
  const readCount = items.length - unreadCount;

  const handlePressItem = (item: NotificationItem) => {
    markNotificationRead(item.id);
    if (item.targetRoute) {
      onClose();
      router.push(item.targetRoute as never);
    }
  };

  const handleDismiss = (id: string) => {
    dismissNotificationIds([id]);
  };

  const handleClearRead = () => {
    const readIds = items.filter((item) => !item.unread).map((item) => item.id);
    if (readIds.length === 0) return;
    confirmAction({
      title: 'Hapus Notifikasi Terbaca?',
      message: `${readIds.length} notifikasi yang sudah dibaca akan dihapus dari daftar ini.`,
      confirmText: 'Hapus Semua',
      destructive: true,
      onConfirm: () => dismissNotificationIds(readIds),
    });
  };

  return (
    <FlyAwayBottomSheet
      visible={visible}
      onClose={onClose}
      title="Notifikasi"
      subtitle={
        items.length === 0
          ? 'Belum ada pembaruan'
          : unreadCount > 0
            ? `${unreadCount} pembaruan terbaru`
            : 'Semua sudah terbaca'
      }
      maxHeight="72%"
      footer={
        <View style={styles.footerRow}>
          <Pressable
            accessibilityRole="button"
            disabled={unreadCount === 0}
            onPress={() => markAllNotificationsRead(items.filter((item) => item.unread).map((item) => item.id))}
            style={({ pressed }) => [
              styles.markBtn,
              { backgroundColor: colors.surfaceMuted },
              unreadCount === 0 && styles.disabledBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.markBtnText, { color: colors.textPrimary }]}>
              Tandai Semua Dibaca
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={readCount === 0}
            onPress={handleClearRead}
            style={({ pressed }) => [
              styles.markBtn,
              { backgroundColor: colors.rosySoft },
              readCount === 0 && styles.disabledBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.markBtnText, { color: colors.rosy }]}>
              Hapus Semua
            </Text>
          </Pressable>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <SwipeableNotificationRow
            key={item.id}
            item={item}
            colors={colors}
            onPress={handlePressItem}
            onDismiss={handleDismiss}
          />
        ))}
      </ScrollView>
    </FlyAwayBottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 300,
    minHeight: 80,
  },
  list: {
    gap: 8,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowPressable: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowRead: {
    opacity: 0.52,
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
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  markBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  markBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    textAlign: 'center',
  },
  disabledBtn: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
