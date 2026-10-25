import { StyleSheet, Text, View } from 'react-native';

import { LabSession } from '@/types';

import { getStatusPresentation } from './status';

type SessionDetailProps = {
  session: LabSession;
  showHeader?: boolean;
};

export function SessionDetail({ session, showHeader = true }: SessionDetailProps) {
  const status = getStatusPresentation(session.status);

  return (
    <View style={styles.card}>
      {showHeader && (
        <>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.eyebrow}>DETAIL SESI</Text>
              <Text style={styles.title}>{session.practicumName}</Text>
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

          <View style={styles.divider} />
        </>
      )}
      <DetailRow label="Tanggal" value={session.date ?? 'Belum ditentukan'} />
      <DetailRow label="Waktu" value={`${session.startsAt}–${session.endsAt}`} />
      <DetailRow label="Lokasi" value={session.location} />
      <DetailRow label="Asisten" value={session.assistantName ?? 'Belum ditentukan'} />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E1EC',
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: '#172033',
    fontSize: 22,
    fontWeight: '800',
  },
  className: {
    color: '#516078',
    fontSize: 15,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: '#E2E8F0',
    height: 1,
  },
  detailRow: {
    gap: 3,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  detailValue: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 22,
  },
});
