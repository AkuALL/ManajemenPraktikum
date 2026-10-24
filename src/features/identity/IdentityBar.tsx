import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from './context';

interface IdentityBarProps {
  title?: string;
}

export function IdentityBar({ title = 'Praktikum' }: IdentityBarProps) {
  const { activeIdentity, openIdentitySelector } = useIdentity();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const roleLabel =
    activeIdentity?.role === 'assistant'
      ? 'Asisten'
      : activeIdentity?.role === 'student'
      ? 'Praktikan'
      : 'Belum dipilih';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.brandContainer}>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>{title}</Text>
        {activeIdentity && (
          <Text style={[styles.roleSubtext, { color: colors.textSecondary }]}>
            {roleLabel}
          </Text>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Ganti identitas. Pengguna aktif saat ini: ${activeIdentity?.displayName ?? 'Belum ada'}`}
        onPress={openIdentitySelector}
        style={[
          styles.switchBadge,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.switchBadgeText, { color: colors.textPrimary }]}>
          {activeIdentity?.displayName ? `${activeIdentity.displayName} ▾` : 'Pilih peran ▾'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandContainer: {
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleSubtext: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  switchBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
