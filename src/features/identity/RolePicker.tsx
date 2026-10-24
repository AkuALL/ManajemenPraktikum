import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UserRole } from '@/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface RolePickerProps {
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
}

export function RolePicker({ selectedRole, onSelectRole }: RolePickerProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PERAN</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Pilih peran Asisten"
          accessibilityState={{ selected: selectedRole === 'assistant' }}
          onPress={() => onSelectRole('assistant')}
          style={[
            styles.roleButton,
            {
              borderColor: selectedRole === 'assistant' ? colors.actionPrimary : colors.border,
              backgroundColor:
                selectedRole === 'assistant' ? colors.actionPrimary : colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.roleButtonText,
              {
                color:
                  selectedRole === 'assistant'
                    ? isDark
                      ? Colors.light.textPrimary
                      : Colors.dark.textPrimary
                    : colors.textPrimary,
              },
            ]}
          >
            Asisten
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Pilih peran Praktikan"
          accessibilityState={{ selected: selectedRole === 'student' }}
          onPress={() => onSelectRole('student')}
          style={[
            styles.roleButton,
            {
              borderColor: selectedRole === 'student' ? colors.actionPrimary : colors.border,
              backgroundColor:
                selectedRole === 'student' ? colors.actionPrimary : colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.roleButtonText,
              {
                color:
                  selectedRole === 'student'
                    ? isDark
                      ? Colors.light.textPrimary
                      : Colors.dark.textPrimary
                    : colors.textPrimary,
              },
            ]}
          >
            Praktikan
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
