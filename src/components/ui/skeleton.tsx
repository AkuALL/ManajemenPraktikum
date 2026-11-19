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
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.92,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
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
  radius = 6,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const isDark = useColorScheme() === 'dark';
  const boneColor = isDark ? '#2A2F3A' : '#E5E7EB';

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
            <SkeletonBox width={74} height={24} radius={8} />
          </View>

          <View style={styles.metaRow}>
            <SkeletonBox width="30%" height={13} />
            <SkeletonBox width="34%" height={13} />
            <SkeletonBox width="24%" height={13} />
          </View>

          {showActions ? (
            <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
              <SkeletonBox width={88} height={32} radius={8} />
              <SkeletonBox width={112} height={32} radius={8} />
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
          <SkeletonBox width={58} height={24} radius={6} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

export function AppShellSkeleton() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  return (
    <SkeletonGroup label="Memeriksa sesi" style={styles.shell}>
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.topBarText}>
          <SkeletonBox width={132} height={14} />
          <SkeletonBox width={96} height={11} />
        </View>
        <SkeletonBox width={64} height={28} radius={8} />
      </View>

      <View style={styles.shellBody}>
        <View style={styles.headingGroup}>
          <SkeletonBox width={110} height={11} />
          <SkeletonBox width="62%" height={28} radius={8} />
          <SkeletonBox width="84%" height={14} />
        </View>

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
            <SkeletonBox width={78} height={26} radius={8} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metaRow}>
            <SkeletonBox width="28%" height={14} />
            <SkeletonBox width="32%" height={14} />
            <SkeletonBox width="26%" height={14} />
          </View>
          <SkeletonBox width="100%" height={42} radius={8} />
        </View>
      </View>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <SkeletonBox width={54} height={14} />
        <SkeletonBox width={54} height={14} />
        <SkeletonBox width={54} height={14} />
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
    borderRadius: 12,
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
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarText: {
    gap: 6,
  },
  shellBody: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: 24,
    gap: 24,
  },
  headingGroup: {
    gap: 10,
    paddingTop: 8,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  bottomBar: {
    height: 56,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
});
