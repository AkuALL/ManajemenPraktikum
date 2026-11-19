import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LabSession } from '@/types';

import { getStatusPresentation } from './status';

type SessionDetailProps = {
  session: LabSession;
  showHeader?: boolean;
};

export function SessionDetail({ session, showHeader = true }: SessionDetailProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const status = getStatusPresentation(session.status);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {showHeader ? (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.textSubtle }]}>DETAIL SESI</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {session.practicumName}
            </Text>
            <Text style={[styles.className, { color: colors.textSecondary }]}>
              {session.courseClass ?? 'Kelas praktikum'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: status.backgroundColor,
                borderColor: status.borderColor,
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: status.dotColor }]} />
            <Text style={[styles.statusText, { color: status.textColor }]}>
              {status.label}
            </Text>
          </View>
        </View>
      ) : null}

      <DetailRow label="Ruangan" value={session.location} borderColor={colors.border} colors={colors} />
      <DetailRow
        label="Jadwal"
        value={`${session.date ?? 'Belum ditentukan'} · ${session.startsAt}–${session.endsAt}`}
        borderColor={colors.border}
        colors={colors}
        mono
      />
      <DetailRow
        label="Asisten jaga"
        value={session.assistantName ?? 'Asisten Praktikum'}
        borderColor={colors.border}
        colors={colors}
        isLast
      />
    </View>
  );
}

function DetailRow({
  label,
  value,
  borderColor,
  colors,
  mono = false,
  isLast = false,
}: {
  label: string;
  value: string;
  borderColor: string;
  colors: (typeof Colors)[keyof typeof Colors];
  mono?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: borderColor },
      ]}
    >
      <Text style={[styles.detailLabel, { color: colors.textSubtle }]}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          { color: colors.textPrimary },
          mono && styles.monoValue,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.7,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    lineHeight: 22,
  },
  className: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
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
  statusText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 13,
  },
  detailLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  monoValue: {
    fontVariant: ['tabular-nums'],
  },
});
