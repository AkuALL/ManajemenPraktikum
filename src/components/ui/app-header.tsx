import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, LogOut } from 'lucide-react-native';

import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { APP_ROUTES } from '@/features/navigation';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { FlyAwayBottomSheet } from './fly-away-bottom-sheet';

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
}: AppHeaderProps) {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();
  const [accountVisible, setAccountVisible] = useState(false);

  const initials = getInitials(user?.displayName);

  const handleAvatarPress = () => {
    if (user?.role === 'student') {
      router.push(APP_ROUTES.PROFIL as never);
      return;
    }
    setAccountVisible(true);
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
                accessibilityLabel="Notifikasi dinonaktifkan sementara"
                accessibilityState={{ disabled: true }}
                disabled
                style={[styles.bellBtn, styles.bellBtnDisabled]}
              >
                <Bell size={17} color="rgba(252, 252, 250, 0.55)" strokeWidth={2} />
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

      <FlyAwayBottomSheet
        visible={accountVisible}
        onClose={() => setAccountVisible(false)}
        title={user?.displayName ?? 'Asisten Lab'}
        subtitle={user?.identifier ? `Kode Asisten · ${user.identifier}` : 'Akun Asisten Aktif'}
        maxHeight="52%"
      >
        <View style={styles.accountSheetBody}>
          <View
            style={[
              styles.accountInfoCard,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <View style={styles.accountInfoRow}>
              <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>Peran</Text>
              <Text style={[styles.accountValue, { color: colors.textPrimary }]}>
                Asisten Lab
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.accountInfoRow}>
              <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>Kode Asisten</Text>
              <Text style={[styles.accountMonoValue, { color: colors.textPrimary }]}>
                {user?.identifier ?? '-'}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAccountVisible(false);
              void logout();
            }}
            style={({ pressed }) => [
              styles.logoutBtn,
              { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
              pressed && styles.pressed,
            ]}
          >
            <LogOut size={16} color={colors.rosy} strokeWidth={2} />
            <Text style={[styles.logoutBtnText, { color: colors.rosy }]}>Keluar Akun</Text>
          </Pressable>
        </View>
      </FlyAwayBottomSheet>
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
  bellBtnDisabled: {
    opacity: 0.45,
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
  accountSheetBody: {
    gap: 12,
    paddingBottom: 6,
  },
  accountInfoCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  accountInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },
  accountValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13.5,
  },
  accountMonoValue: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
  },
  logoutBtn: {
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
