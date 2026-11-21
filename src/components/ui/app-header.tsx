import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';

import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { APP_ROUTES } from '@/features/navigation';
import { useColorScheme } from '@/hooks/use-color-scheme';

import {
  NotificationsBottomSheet,
  useUnreadNotificationsCount,
} from './notifications-bottom-sheet';

function getInitials(name?: string | null): string {
  if (!name) return 'MP';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function getFirstName(name?: string | null): string {
  if (!name) return 'Pengguna';
  return name.trim().split(/\s+/)[0] || 'Pengguna';
}

type AppHeaderProps = {
  eyebrow: string;
  title: string;
  monoBadge: string;
  statusBadge: string;
  hasUnreadNotification?: boolean;
};

export function AppHeader({
  eyebrow,
  title,
  monoBadge,
  statusBadge,
  hasUnreadNotification = false,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const unreadCount = useUnreadNotificationsCount();
  const showUnread = hasUnreadNotification || unreadCount > 0;
  const [bellShake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!showUnread) {
      bellShake.setValue(0);
      return undefined;
    }

    const triggerShake = () => {
      Animated.sequence([
        Animated.timing(bellShake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: 0.8, duration: 55, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: -0.8, duration: 55, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: 0.4, duration: 50, useNativeDriver: true }),
        Animated.timing(bellShake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    };

    triggerShake();
    const timer = setInterval(triggerShake, 5000);
    return () => {
      clearInterval(timer);
      bellShake.setValue(0);
    };
  }, [bellShake, showUnread]);

  const bellRotate = bellShake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-18deg', '0deg', '18deg'],
  });

  const initials = getInitials(user?.displayName);

  const handleAvatarPress = () => {
    if (pathname === APP_ROUTES.PROFIL) {
      return;
    }
    router.push(APP_ROUTES.PROFIL as never);
  };

  return (
    <>
      <View style={[styles.outerWrap, { maxWidth: MaxContentWidth }]}>
        <View style={[styles.balticCard, { backgroundColor: colors.baltic }]}>
          <View style={styles.orb} pointerEvents="none" />

          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow} numberOfLines={1}>
                {eyebrow}
              </Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka notifikasi"
                onPress={() => setNotificationsVisible(true)}
                style={({ pressed }) => [styles.bellBtn, pressed && styles.pressed]}
              >
                <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
                  <Bell size={17} color="#FCFCFA" strokeWidth={2} />
                </Animated.View>
                {showUnread ? (
                  <View style={styles.unreadDot} />
                ) : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profil akun"
                onPress={handleAvatarPress}
                style={({ pressed }) => [
                  styles.avatarCircle,
                  { backgroundColor: colors.pacific },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.avatarText}>{initials}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.chipRow}>
            <View style={styles.monoChip}>
              <Text style={styles.monoChipText} numberOfLines={1}>
                {monoBadge}
              </Text>
            </View>

            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: colors.pacific }]} />
              <Text style={styles.statusChipText} numberOfLines={1}>
                {statusBadge}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <NotificationsBottomSheet
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </>
  );
}

type SubScreenHeaderProps = {
  backLabel: string;
  onBack: () => void;
  title: string;
  subtitle?: string;
  rightBadgeLabel?: string;
  rightBadgeTone?: 'rosy' | 'mono' | 'pacific';
};

export function SubScreenHeader({
  backLabel,
  onBack,
  title,
  subtitle,
  rightBadgeLabel,
  rightBadgeTone = 'rosy',
}: SubScreenHeaderProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const badgeBg =
    rightBadgeTone === 'rosy'
      ? colors.rosy
      : rightBadgeTone === 'pacific'
        ? colors.pacific
        : 'rgba(13, 35, 54, 0.34)';

  return (
    <View style={[styles.outerWrap, { maxWidth: MaxContentWidth }]}>
      <View style={[styles.balticCard, { backgroundColor: colors.baltic }]}>
        <View style={styles.orb} pointerEvents="none" />

        <View style={styles.subTopRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Kembali ke ${backLabel}`}
            onPress={onBack}
            style={({ pressed }) => [styles.backPill, pressed && styles.pressed]}
          >
            <ChevronLeft size={15} color="#FCFCFA" strokeWidth={2.4} />
            <Text style={styles.backPillText}>{backLabel}</Text>
          </Pressable>

          {rightBadgeLabel ? (
            <View style={[styles.subRightBadge, { backgroundColor: badgeBg }]}>
              <Text
                style={
                  rightBadgeTone === 'mono' ? styles.monoChipText : styles.subRightBadgeText
                }
                numberOfLines={1}
              >
                {rightBadgeLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.subTitleBlock}>
          <Text style={styles.subTitle} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subSubtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  balticCard: {
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  orb: {
    position: 'absolute',
    top: -48,
    right: -32,
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: 'rgba(31, 167, 193, 0.16)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  eyebrow: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11.5,
    color: 'rgba(252, 252, 250, 0.78)',
  },
  heroTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    lineHeight: 28,
    color: '#FCFCFA',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(252, 252, 250, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F97316',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: '#FCFCFA',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  monoChip: {
    backgroundColor: 'rgba(13, 35, 54, 0.28)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  monoChipText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 11,
    color: '#BCE8F2',
    fontVariant: ['tabular-nums'],
  },
  statusChip: {
    backgroundColor: 'rgba(252, 252, 250, 0.14)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    color: '#FCFCFA',
    fontVariant: ['tabular-nums'],
  },
  subTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(252, 252, 250, 0.16)',
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 12,
    height: 30,
  },
  backPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 15,
    color: '#FCFCFA',
  },
  subRightBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  subRightBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: '#FCFCFA',
    fontVariant: ['tabular-nums'],
  },
  subTitleBlock: {
    marginTop: 12,
    gap: 3,
  },
  subTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    lineHeight: 25,
    color: '#FCFCFA',
  },
  subSubtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(252, 252, 250, 0.84)',
  },
  pressed: {
    opacity: 0.78,
  },
});
