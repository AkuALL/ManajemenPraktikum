import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirmAction } from '@/lib/cross-platform-alert';

import { useAuth } from './context';

export function AccountBar() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  if (!user) return null;

  const roleLabel = user.role === 'assistant' ? 'Asisten' : 'Praktikan';

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.brandContainer}>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Praktikum</Text>
        <Text style={[styles.roleSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
          {roleLabel} · {user.displayName} · {user.identifier}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Keluar dari akun ${user.displayName}`}
        disabled={signingOut}
        onPress={() =>
          confirmAction({
            title: 'Keluar dari Akun?',
            message: 'Anda akan keluar dari sesi saat ini dan perlu masuk kembali.',
            confirmText: 'Keluar Akun',
            destructive: true,
            onConfirm: () => void handleLogout(),
          })
        }
        style={({ pressed }) => [
          styles.actionBadge,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}
      >
        {signingOut ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <Text style={[styles.actionBadgeText, { color: colors.textPrimary }]}>Keluar</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  roleSubtext: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  actionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 36,
    minWidth: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
});
