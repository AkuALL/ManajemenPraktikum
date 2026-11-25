import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { formatSessionDate, formatSessionTime } from '../port';
import type { PracticumSession } from '../types';
import { SessionLifecycleButtons } from './SessionLifecycleButtons';

interface SessionCardProps {
  session: PracticumSession;
  isAssistant: boolean;
  onOpenSession: (sessionId: string) => Promise<void>;
  onCloseSession: (sessionId: string) => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onEditSession?: (session: PracticumSession) => void;
}

export const SessionCard = React.memo(function SessionCard({
  session,
  isAssistant,
  onOpenSession,
  onCloseSession,
  onDeleteSession,
  onEditSession,
}: SessionCardProps) {
  const router = useRouter();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [actionBusy, setActionBusy] = useState(false);

  const badge =
    session.status === 'open'
      ? {
          label: 'Live',
          bgColor: colors.rosySoft,
          textColor: colors.rosy,
          dotColor: colors.rosy,
        }
      : session.status === 'closed'
        ? {
            label: 'Selesai',
            bgColor: colors.pacificSoft,
            textColor: colors.pacificDark,
            dotColor: colors.pacific,
          }
        : {
            label: 'Terjadwal',
            bgColor: colors.balticSoft,
            textColor: colors.baltic,
            dotColor: colors.baltic,
          };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          {session.className ? (
            <Text style={[styles.classTag, { color: colors.textSubtle }]} numberOfLines={1}>
              {session.className} {session.courseName ? `· ${session.courseName}` : ''}
            </Text>
          ) : null}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{session.title}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
          <View style={[styles.dot, { backgroundColor: badge.dotColor }]} />
          <Text style={[styles.statusText, { color: badge.textColor }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={[styles.metaStrip, { backgroundColor: colors.background }]}>
        <Text style={[styles.metaText, { color: colors.textPrimary }]} numberOfLines={1}>
          {formatSessionDate(session.date, session.startsAt)} ·{' '}
          {formatSessionTime(session.startsAt)}–{formatSessionTime(session.endsAt)}
        </Text>
        <Text style={[styles.metaLocation, { color: colors.textSecondary }]} numberOfLines={1}>
          {session.location}
        </Text>
      </View>

      {isAssistant ? (
        <SessionLifecycleButtons
          session={session}
          isAssistant={isAssistant}
          onOpenSession={onOpenSession}
          onCloseSession={onCloseSession}
          onDeleteSession={session.status === 'scheduled' ? onDeleteSession : undefined}
          onBusyChange={setActionBusy}
        />
      ) : null}

      <View style={styles.footer}>
        {isAssistant && session.status === 'scheduled' && onEditSession ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onEditSession(session)}
            disabled={actionBusy}
            style={({ pressed }) => [
              styles.smallBtn,
              { backgroundColor: colors.background, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.smallBtnText, { color: colors.textSecondary }]}>
              Reschedule / Ubah
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/schedule/[sessionId]',
              params: { sessionId: session.id },
            })
          }
          disabled={actionBusy}
          style={({ pressed }) => [
            styles.detailBtn,
            { backgroundColor: colors.balticSoft },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.detailBtnText, { color: colors.baltic }]}>Detail Sesi</Text>
          <ChevronRight size={14} color={colors.baltic} strokeWidth={2.3} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  classTag: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11.5,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    lineHeight: 20,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
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
  metaText: {
    flex: 1,
    fontFamily: FontFamily.monoMedium,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
  },
  metaLocation: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 11.5,
    maxWidth: '38%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  smallBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  smallBtnText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
  },
  detailBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
