import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { PracticumClass } from '../types';

interface ClassCardProps {
  practicumClass: PracticumClass;
  isAssistant: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  hasLiveSession?: boolean;
  scheduleSummary?: string;
  onShowQr?: (cls: PracticumClass) => void;
  onManageMembers: (cls: PracticumClass) => void;
  onEdit: (cls: PracticumClass) => void;
  onDelete: (classId: string) => Promise<void>;
  isDeleting?: boolean;
}

export const ClassCard = React.memo(function ClassCard({
  practicumClass,
  isAssistant,
  expanded = true,
  onToggleExpand,
  hasLiveSession = false,
  scheduleSummary,
  onShowQr,
  onManageMembers,
  onEdit,
  isDeleting = false,
}: ClassCardProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const memberCount = practicumClass.memberCount ?? practicumClass.memberUids?.length ?? 0;
  const titleText = `${practicumClass.courseName} · ${practicumClass.className}`;

  if (!expanded) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onToggleExpand}
        style={({ pressed }) => [
          styles.collapsedCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.collapsedLeft}>
          <Text style={[styles.collapsedTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {titleText}
          </Text>
          <View style={[styles.memberPill, { backgroundColor: colors.pacificSoft }]}>
            <Text style={[styles.memberPillText, { color: colors.pacificDark }]}>
              {memberCount} praktikan
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.textSubtle} strokeWidth={2.2} />
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.expandedCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onToggleExpand}
        style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]}
      >
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {titleText}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {[practicumClass.lab || 'Ruang Lab', scheduleSummary].filter(Boolean).join(' · ')}
          </Text>
        </View>

        <View style={styles.rightCluster}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: hasLiveSession ? colors.rosySoft : colors.pacificSoft,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: hasLiveSession ? colors.rosy : colors.pacific },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: hasLiveSession ? colors.rosyDark : colors.pacificDark },
              ]}
            >
              {hasLiveSession ? 'Live' : 'Aktif'}
            </Text>
          </View>
          <ChevronDown size={18} color={colors.baltic} strokeWidth={2.2} />
        </View>
      </Pressable>

      {isAssistant ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={isDeleting}
            onPress={() => onManageMembers(practicumClass)}
            style={({ pressed }) => [
              styles.btnMembers,
              { backgroundColor: colors.pacificSoft },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.btnMembersText, { color: colors.pacificDark }]} numberOfLines={1}>
              Anggota ({memberCount})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isDeleting}
            onPress={() => onEdit(practicumClass)}
            style={({ pressed }) => [
              styles.btnEdit,
              { backgroundColor: colors.background },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.btnEditText, { color: colors.textPrimary }]}>Ubah</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isDeleting}
            onPress={() => onShowQr?.(practicumClass)}
            style={({ pressed }) => [
              styles.btnQr,
              { backgroundColor: colors.rosy },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.btnQrText} numberOfLines={1}>
              Tampilkan QR
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  collapsedCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  collapsedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    flexShrink: 1,
  },
  memberPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  memberPillText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  expandedCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15.5,
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12,
  },
  rightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnMembers: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  btnMembersText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  btnEdit: {
    width: 72,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnEditText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  btnQr: {
    flex: 1.05,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  btnQrText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: '#FCFCFA',
  },
  pressed: {
    opacity: 0.78,
  },
});
