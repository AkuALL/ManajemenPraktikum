import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LabSession } from '@/types';

import { getStatusPresentation } from './status';

type ScheduleListProps = {
  sessions: LabSession[];
  onSelectSession: (session: LabSession) => void;
};

export function ScheduleList({ sessions, onSelectSession }: ScheduleListProps) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  if (sessions.length === 0) {
    return (
      <View
        style={[
          styles.emptyState,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Belum ada jadwal praktikum
        </Text>
        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          Jadwal sesi akan muncul di halaman ini saat sudah tersedia.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {sessions.map((session) => {
        const status = getStatusPresentation(session.status);

        return (
          <Pressable
            key={session.id}
            accessibilityRole="button"
            accessibilityLabel={`Lihat detail sesi ${session.practicumName}`}
            onPress={() => onSelectSession(session)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                <Text style={[styles.practicumName, { color: colors.textPrimary }]}>
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

            <View style={[styles.metaStrip, { backgroundColor: colors.background }]}>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {session.date ?? 'Terjadwal'} · {session.startsAt}–{session.endsAt}
              </Text>
              <Text style={[styles.locationValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {session.location}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLink, { color: colors.baltic }]}>
                Lihat detail sesi
              </Text>
              <ChevronRight size={15} color={colors.baltic} strokeWidth={2.3} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 15,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  practicumName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    lineHeight: 20,
  },
  className: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 12.5,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
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
  metaStrip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  infoValue: {
    flex: 1,
    fontFamily: FontFamily.monoMedium,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  locationValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    maxWidth: '38%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLink: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 24,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
  },
  emptyDescription: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
  },
});
