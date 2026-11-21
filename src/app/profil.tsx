import { LogOut } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, getFirstName } from '@/components/ui/app-header';
import { Colors, FontFamily, MaxContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirmAction } from '@/lib/cross-platform-alert';

export default function ProfilScreen() {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();

  if (!user) return null;

  const isAssistant = user.role === 'assistant';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppHeader
          eyebrow={isAssistant ? 'Profil Asisten' : 'Profil Praktikan'}
          title={`Hai, ${getFirstName(user.displayName)}`}
          monoBadge={isAssistant ? user.identifier : `NIM ${user.identifier}`}
          statusBadge="Aktif"
        />

        <View style={styles.bodyContainer}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ProfileRow label="Nama lengkap" value={user.displayName} colors={colors} />
            <ProfileRow
              label={isAssistant ? 'Kode Asisten' : 'NIM'}
              value={user.identifier}
              colors={colors}
              mono
            />
            <ProfileRow
              label="Peran"
              value={isAssistant ? 'Asisten Lab' : 'Praktikan'}
              colors={colors}
            />
            <ProfileRow label="Semester" value="Semester Genap 2026/2027" colors={colors} isLast />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              confirmAction({
                title: 'Keluar dari Akun?',
                message:
                  'Anda akan keluar dari sesi saat ini dan perlu masuk kembali untuk mengakses aplikasi.',
                confirmText: 'Keluar Akun',
                destructive: true,
                onConfirm: () => void logout(),
              })
            }
            style={({ pressed }) => [
              styles.logoutBtn,
              { backgroundColor: colors.rosySoft, borderColor: colors.rosyBorder },
              pressed && styles.pressed,
            ]}
          >
            <LogOut size={16} color={colors.rosy} strokeWidth={2.1} />
            <Text style={[styles.logoutText, { color: colors.rosy }]}>Keluar Akun</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileRow({
  label,
  value,
  colors,
  mono = false,
  isLast = false,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)[keyof typeof Colors];
  mono?: boolean;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[styles.rowLabel, { color: colors.textSubtle }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          { color: colors.textPrimary },
          mono && styles.monoValue,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 112,
    gap: 14,
  },
  bodyContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: FontFamily.sansRegular,
    fontSize: 13,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13.5,
  },
  monoValue: {
    fontFamily: FontFamily.monoMedium,
    fontVariant: ['tabular-nums'],
  },
  logoutBtn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.78,
  },
});
