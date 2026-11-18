import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { PracticumClass } from '../types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ClassCardProps {
  practicumClass: PracticumClass;
  isAssistant: boolean;
  onManageMembers: (cls: PracticumClass) => void;
  onEdit: (cls: PracticumClass) => void;
  onDelete: (classId: string) => Promise<void>;
  isDeleting?: boolean;
}

export function ClassCard({
  practicumClass,
  isAssistant,
  onManageMembers,
  onEdit,
  onDelete,
  isDeleting = false,
}: ClassCardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const handleDeletePress = () => {
    if (isDeleting) return;

    Alert.alert(
      'Hapus Kelas',
      `Yakin ingin menghapus kelas "${practicumClass.className} - ${practicumClass.courseName}"? Seluruh anggota dan sesi terkait yang belum dimulai juga akan dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => void onDelete(practicumClass.id),
        },
      ]
    );
  };

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
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.className, { color: colors.textSecondary }]}>
            {practicumClass.className}
          </Text>
          <Text style={[styles.courseName, { color: colors.textPrimary }]}>
            {practicumClass.courseName}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.badgeText, { color: colors.textPrimary }]}>
            {practicumClass.memberCount ?? 0} Praktikan
          </Text>
        </View>
      </View>

      {practicumClass.lab ? (
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Lokasi Lab:</Text>
          <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
            {practicumClass.lab}
          </Text>
        </View>
      ) : null}

      {isAssistant && (
        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={() => onManageMembers(practicumClass)}
            disabled={isDeleting}
          >
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
              Anggota
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.border }]}
            onPress={() => onEdit(practicumClass)}
            disabled={isDeleting}
          >
            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, isDeleting && styles.disabledButton]}
            onPress={handleDeletePress}
            disabled={isDeleting}
          >
            <Text style={styles.deleteButtonText}>{isDeleting ? 'Menghapus...' : 'Hapus'}</Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleContainer: {
    flex: 1,
  },
  className: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  courseName: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
