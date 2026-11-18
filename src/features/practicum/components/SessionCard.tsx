import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { formatSessionDate, formatSessionTime } from '../port';
import { PracticumSession } from '../types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionLifecycleButtons } from './SessionLifecycleButtons';

interface SessionCardProps {
  session: PracticumSession;
  isAssistant: boolean;
  onOpenSession: (sessionId: string) => Promise<void>;
  onCloseSession: (sessionId: string) => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onEditSession?: (session: PracticumSession) => void;
}

export function SessionCard({
  session,
  isAssistant,
  onOpenSession,
  onCloseSession,
  onDeleteSession,
  onEditSession,
}: SessionCardProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const [actionBusy, setActionBusy] = useState(false);

  const getStatusBadge = () => {
    switch (session.status) {
      case 'open':
        return {
          label: 'Sedang Berlangsung',
          bgColor: 'rgba(16, 185, 129, 0.15)',
          textColor: '#10b981',
        };
      case 'closed':
        return {
          label: 'Selesai',
          bgColor: colors.surfaceMuted,
          textColor: colors.textSecondary,
        };
      default:
        return {
          label: 'Belum Dibuka',
          bgColor: 'rgba(59, 130, 246, 0.15)',
          textColor: '#3b82f6',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          {session.className && (
            <Text style={[styles.classTag, { color: colors.textSecondary }]}>
              {session.className} {session.courseName ? `• ${session.courseName}` : ''}
            </Text>
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{session.title}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
          <Text style={[styles.statusText, { color: badge.textColor }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Waktu</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {formatSessionTime(session.startsAt)} – {formatSessionTime(session.endsAt)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lokasi</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {session.location}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tanggal</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {formatSessionDate(session.date, session.startsAt)}
          </Text>
        </View>
      </View>

      {/* Kontrol Buka / Tutup Sesi untuk Asisten */}
      {isAssistant && (
        <SessionLifecycleButtons
          session={session}
          isAssistant={isAssistant}
          onOpenSession={onOpenSession}
          onCloseSession={onCloseSession}
          onDeleteSession={session.status === 'scheduled' ? onDeleteSession : undefined}
          onBusyChange={setActionBusy}
        />
      )}

      {/* Footer Navigasi & Edit */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {isAssistant && session.status === 'scheduled' && onEditSession && (
          <TouchableOpacity
            style={[styles.smallBtn, { borderColor: colors.border }]}
            onPress={() => onEditSession(session)}
            disabled={actionBusy}
          >
            <Text style={[styles.smallBtnText, { color: colors.textSecondary }]}>Edit Sesi</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.detailBtn, { borderColor: colors.border }]}
          onPress={() =>
            router.push({
              pathname: '/schedule/[sessionId]',
              params: { sessionId: session.id },
            })
          }
          disabled={actionBusy}
        >
          <Text style={[styles.detailBtnText, { color: colors.textPrimary }]}>
            Lihat Detail Sesi ➔
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  classTag: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  detailItem: {
    minWidth: '28%',
    flexGrow: 1,
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
