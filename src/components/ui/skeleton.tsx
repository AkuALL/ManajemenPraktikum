import React, { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors, MaxContentWidth } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function SkeletonGroup({
  label = 'Memuat data',
  style,
  children,
}: {
  label?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [opacity] = useState(() => new Animated.Value(0.55));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.92,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[style, { opacity }]}
    >
      {children}
    </Animated.View>
  );
}

export function SkeletonBox({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const isDark = useColorScheme() === 'dark';
  const boneColor = isDark ? Colors.dark.surfaceMuted : Colors.light.surfaceMuted;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[{ width, height, borderRadius: radius, backgroundColor: boneColor }, style]}
    />
  );
}

export function CardListSkeleton({
  count = 3,
  showActions = false,
  label = 'Memuat daftar',
}: {
  count?: number;
  showActions?: boolean;
  label?: string;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  return (
    <SkeletonGroup label={label} style={styles.list}>
      {Array.from({ length: count }, (_, idx) => (
        <View
          key={idx}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <SkeletonBox width="42%" height={11} />
              <SkeletonBox width="78%" height={18} />
            </View>
            <SkeletonBox width={74} height={24} radius={12} />
          </View>

          <View style={styles.metaRow}>
            <SkeletonBox width="30%" height={13} />
            <SkeletonBox width="34%" height={13} />
            <SkeletonBox width="24%" height={13} />
          </View>

          {showActions ? (
            <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
              <SkeletonBox width={88} height={32} radius={12} />
              <SkeletonBox width={112} height={32} radius={12} />
            </View>
          ) : null}
        </View>
      ))}
    </SkeletonGroup>
  );
}

export function RowListSkeleton({
  count = 4,
  label = 'Memuat daftar',
}: {
  count?: number;
  label?: string;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  return (
    <SkeletonGroup label={label}>
      {Array.from({ length: count }, (_, idx) => (
        <View
          key={idx}
          style={[styles.rowItem, { borderBottomColor: colors.border }]}
        >
          <View style={styles.rowTextGroup}>
            <SkeletonBox width="56%" height={14} />
            <SkeletonBox width="36%" height={11} />
          </View>
          <SkeletonBox width={58} height={24} radius={12} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

export function AppShellSkeleton() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  return (
    <SkeletonGroup label="Memeriksa sesi" style={styles.shell}>
      <View style={[styles.balticCardSkeleton, { backgroundColor: colors.baltic }]}>
        <SkeletonBox width={120} height={11} radius={6} style={{ opacity: 0.35 }} />
        <SkeletonBox width={160} height={22} radius={8} style={{ opacity: 0.35 }} />
        <View style={styles.balticBottomRow}>
          <SkeletonBox width={110} height={26} radius={13} style={{ opacity: 0.3 }} />
          <SkeletonBox width={92} height={26} radius={13} style={{ opacity: 0.3 }} />
        </View>
      </View>

      <View style={styles.shellBody}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              <SkeletonBox width="45%" height={12} />
              <SkeletonBox width="80%" height={20} />
            </View>
            <SkeletonBox width={78} height={26} radius={12} />
          </View>
          <SkeletonBox width="100%" height={36} radius={12} />
          <View style={styles.metaRow}>
            <SkeletonBox width="48%" height={40} radius={12} />
            <SkeletonBox width="48%" height={40} radius={12} />
          </View>
        </View>
      </View>

      <View style={[styles.bottomDock, { backgroundColor: colors.dockBg }]}>
        <SkeletonBox width={54} height={14} radius={7} style={{ opacity: 0.28 }} />
        <SkeletonBox width={54} height={14} radius={7} style={{ opacity: 0.28 }} />
        <SkeletonBox width={54} height={14} radius={7} style={{ opacity: 0.28 }} />
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitleGroup: {
    flex: 1,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  footerRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowTextGroup: {
    flex: 1,
    gap: 6,
  },
  shell: {
    flex: 1,
    paddingTop: 8,
  },
  balticCardSkeleton: {
    marginHorizontal: 14,
    borderRadius: 26,
    padding: 16,
    gap: 12,
    maxWidth: MaxContentWidth - 28,
    alignSelf: 'center',
    width: '92%',
  },
  balticBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  shellBody: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: 14,
    gap: 16,
  },
  bottomDock: {
    marginHorizontal: 14,
    marginBottom: 14,
    height: 62,
    borderRadius: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    maxWidth: 460,
    alignSelf: 'center',
    width: '92%',
  },
});
