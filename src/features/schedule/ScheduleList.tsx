import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LabSession } from '@/types';

import { getStatusPresentation } from './status';

type ScheduleListProps = {
  sessions: LabSession[];
  onSelectSession: (session: LabSession) => void;
};

export function ScheduleList({ sessions, onSelectSession }: ScheduleListProps) {
  if (sessions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Belum ada jadwal praktikum</Text>
        <Text style={styles.emptyDescription}>
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
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                <Text style={styles.practicumName}>{session.practicumName}</Text>
                <Text style={styles.className}>{session.courseClass ?? 'Kelas praktikum'}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: status.backgroundColor,
                    borderColor: status.borderColor,
                  },
                ]}>
                <Text style={[styles.statusText, { color: status.textColor }]}>
                  {status.icon} {status.label}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Waktu</Text>
              <Text style={styles.infoValue}>
                {session.date ?? 'Tanggal belum ditentukan'} · {session.startsAt}–{session.endsAt}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lokasi</Text>
              <Text style={styles.infoValue}>{session.location}</Text>
            </View>
            <Text style={styles.detailLink}>Lihat detail sesi →</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E1EC',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardPressed: {
    opacity: 0.78,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    gap: 3,
  },
  practicumName: {
    color: '#172033',
    fontSize: 17,
    fontWeight: '700',
  },
  className: {
    color: '#516078',
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  detailLink: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 6,
    padding: 24,
  },
  emptyTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyDescription: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
