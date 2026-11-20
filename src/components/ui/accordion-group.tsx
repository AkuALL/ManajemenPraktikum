import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AccordionGroupProps = {
  title: string;
  badgeText?: string;
  badgeTone?: 'pacific' | 'rosy' | 'muted';
  expanded: boolean;
  onToggle: () => void;
  children?: ReactNode;
};

export function AccordionGroup({
  title,
  badgeText,
  badgeTone = 'pacific',
  expanded,
  onToggle,
  children,
}: AccordionGroupProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const badgeBg =
    badgeTone === 'rosy'
      ? colors.rosySoft
      : badgeTone === 'pacific'
        ? colors.pacificSoft
        : colors.surfaceMuted;

  const badgeColor =
    badgeTone === 'rosy'
      ? colors.rosyDark
      : badgeTone === 'pacific'
        ? colors.pacificDark
        : colors.textSecondary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]}
      >
        <View style={styles.leftGroup}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {badgeText ? (
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
            </View>
          ) : null}
        </View>

        {expanded ? (
          <ChevronDown size={18} color={colors.baltic} strokeWidth={2.2} />
        ) : (
          <ChevronRight size={18} color={colors.textSubtle} strokeWidth={2.2} />
        )}
      </Pressable>

      {expanded && children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  leftGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15.5,
    lineHeight: 20,
    flexShrink: 1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  body: {
    marginTop: 12,
    gap: 8,
  },
  pressed: {
    opacity: 0.78,
  },
});
