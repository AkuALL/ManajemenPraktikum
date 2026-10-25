import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SessionStatus } from '@/types';
import { AssistantSessionActionControls } from '@/components/assistant';
import { useIdentity } from '@/features/identity';
import { useSchedule } from '@/features/schedule';

const STATUS_LABELS: Record<SessionStatus, { icon: string; label: string }> = {
  upcoming: { icon: '◷', label: 'Belum dibuka' },
  open: { icon: '●', label: 'Berlangsung' },
  closed: { icon: '✓', label: 'Selesai' },
};

export default function AssistantActionsDemoScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { activeIdentity, openIdentitySelector } = useIdentity();
  const { sessions, updateSessionStatus } = useSchedule();
  const [selectedSessionId, setSelectedSessionId] = useState('session-basis-data-01');

  const currentSession =
    sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const statusInfo = STATUS_LABELS[currentSession.status];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        isDark ? styles.bgDark : styles.bgLight,
      ]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          isDark ? styles.headerDark : styles.headerLight,
        ]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Kembali">
          <Text
            style={[
              styles.headerBackText,
              isDark ? styles.textPrimDark : styles.textPrimLight,
            ]}>
            ‹ Jadwal
          </Text>
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            isDark ? styles.textPrimDark : styles.textPrimLight,
          ]}>
          Detail sesi
        </Text>
        <Pressable onPress={openIdentitySelector} hitSlop={8} accessibilityRole="button">
          <Text
            style={[
              styles.headerActionText,
              isDark ? styles.textSecDark : styles.textSecLight,
            ]}>
            Ganti identitas
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Identitas aktif berasal dari pemilih global */}
        <View style={styles.roleRow}>
          <Text style={[styles.roleChipText, isDark ? styles.textSecDark : styles.textSecLight]}>
            Peran aktif: {activeIdentity?.role === 'assistant' ? 'Asisten' : 'Praktikan'}
          </Text>
        </View>

        {/* Sesi selector — horizontal pills */}
        <View style={styles.sessionPillRow}>
          {sessions.map((s) => {
            const isActive = s.id === selectedSessionId;
            const si = STATUS_LABELS[s.status];
            return (
              <Pressable
                key={s.id}
                onPress={() => setSelectedSessionId(s.id)}
                style={[
                  styles.sessionPill,
                  isActive
                    ? isDark
                      ? styles.sessionPillActiveDark
                      : styles.sessionPillActiveLight
                    : isDark
                      ? styles.sessionPillInactiveDark
                      : styles.sessionPillInactiveLight,
                ]}>
                <Text
                  style={[
                    styles.sessionPillName,
                    isActive
                      ? isDark
                        ? styles.sessionPillTextActiveDark
                        : styles.sessionPillTextActiveLight
                      : isDark
                        ? styles.textSecDark
                        : styles.textSecLight,
                  ]}>
                  {s.practicumName}
                </Text>
                <Text
                  style={[
                    styles.sessionPillStatus,
                    isActive
                      ? isDark
                        ? styles.sessionPillTextActiveDark
                        : styles.sessionPillTextActiveLight
                      : isDark
                        ? styles.textSecDark
                        : styles.textSecLight,
                  ]}>
                  {si.icon} {si.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Session Card — sesuai mockup detail sesi */}
        <View
          style={[
            styles.card,
            isDark ? styles.cardDark : styles.cardLight,
          ]}>
          {/* Card Header: nama & status */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.cardLabel,
                  isDark ? styles.textSecDark : styles.textSecLight,
                ]}>
                MATA KULIAH
              </Text>
              <Text
                style={[
                  styles.cardTitle,
                  isDark ? styles.textPrimDark : styles.textPrimLight,
                ]}>
                {currentSession.practicumName}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                isDark ? styles.statusBadgeDark : styles.statusBadgeLight,
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  isDark ? styles.textSecDark : styles.textSecLight,
                ]}>
                {statusInfo.icon} {statusInfo.label}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={[
              styles.divider,
              isDark ? styles.dividerDark : styles.dividerLight,
            ]}
          />

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <InfoField
              label="Kelas"
              value={currentSession.courseClass || '-'}
              isDark={isDark}
            />
            <InfoField
              label="Lokasi"
              value={currentSession.location}
              isDark={isDark}
            />
            <InfoField
              label="Tanggal"
              value={currentSession.date || '-'}
              isDark={isDark}
            />
            <InfoField
              label="Waktu"
              value={`${currentSession.startsAt} – ${currentSession.endsAt}`}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Komponen utama Kaka: Kontrol aksi asisten */}
        <AssistantSessionActionControls
          role={activeIdentity?.role ?? 'student'}
          session={currentSession}
          onStatusChange={updateSessionStatus}
          hideWhenStudent={false}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-component for info field
function InfoField({
  label,
  value,
  isDark,
}: {
  label: string;
  value: string;
  isDark: boolean;
}) {
  return (
    <View style={styles.infoCol}>
      <Text
        style={[
          styles.infoLabel,
          isDark ? styles.textSecDark : styles.textSecLight,
        ]}>
        {label}
      </Text>
      <Text
        style={[
          styles.infoValue,
          isDark ? styles.textPrimDark : styles.textPrimLight,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Layout ──
  safeArea: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: '#F7F7F7',
  },
  bgDark: {
    backgroundColor: '#111111',
  },

  // ── Header ──
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLight: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#D2D2D2',
  },
  headerDark: {
    backgroundColor: '#1C1C1C',
    borderBottomColor: '#414141',
  },
  headerBackText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Content ──
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },

  // ── Role Toggle ──
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  roleChipActiveLight: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  roleChipActiveDark: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  roleChipInactiveLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  roleChipInactiveDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleChipTextActiveLight: {
    color: '#FFFFFF',
  },
  roleChipTextActiveDark: {
    color: '#171717',
  },

  // ── Session Selector ──
  sessionPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionPillActiveLight: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  sessionPillActiveDark: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  sessionPillInactiveLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  sessionPillInactiveDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  sessionPillName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  sessionPillStatus: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  sessionPillTextActiveLight: {
    color: '#FFFFFF',
  },
  sessionPillTextActiveDark: {
    color: '#171717',
  },

  // ── Session Card ──
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D2D2D2',
  },
  cardDark: {
    backgroundColor: '#1C1C1C',
    borderColor: '#414141',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeLight: {
    backgroundColor: '#EEEEEE',
    borderColor: '#D2D2D2',
  },
  statusBadgeDark: {
    backgroundColor: '#292929',
    borderColor: '#414141',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  dividerLight: {
    backgroundColor: '#EEEEEE',
  },
  dividerDark: {
    backgroundColor: '#292929',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCol: {
    width: '46%',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  // ── Text tokens ──
  textPrimLight: {
    color: '#171717',
  },
  textPrimDark: {
    color: '#F5F5F5',
  },
  textSecLight: {
    color: '#555555',
  },
  textSecDark: {
    color: '#C2C2C2',
  },
});
