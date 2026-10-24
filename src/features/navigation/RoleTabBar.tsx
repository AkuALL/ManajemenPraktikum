import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIdentity } from '@/features/identity';
import { APP_ROUTES, RoleTabItem } from './types';

export function RoleTabBar() {
  const { activeIdentity } = useIdentity();
  const router = useRouter();
  const pathname = usePathname();

  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // Jika belum memilih identitas atau berada di layar detail sesi, jangan tampilkan bottom tab
  if (!activeIdentity || pathname?.includes('/detail') || pathname?.includes('/session')) {
    return null;
  }

  const role = activeIdentity.role;

  const tabs: RoleTabItem[] =
    role === 'assistant'
      ? [
          { key: 'schedule', label: 'Jadwal', route: APP_ROUTES.HOME, role: 'assistant' },
          { key: 'rekap', label: 'Rekap', route: APP_ROUTES.ASSISTANT_REKAP, role: 'assistant' },
        ]
      : [
          { key: 'schedule', label: 'Jadwal', route: APP_ROUTES.HOME, role: 'student' },
          {
            key: 'attendance',
            label: 'Kehadiran saya',
            route: APP_ROUTES.STUDENT_ATTENDANCE,
            role: 'student',
          },
        ];

  const handleTabPress = (route: string) => {
    if (pathname !== route) {
      router.push(route as any);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab) => {
        const isScheduleTab = tab.key === 'schedule';
        const isCurrentRoute = isScheduleTab
          ? pathname === '/' || pathname === '/index' || !pathname
          : pathname === tab.route;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={`Tab ${tab.label}`}
            accessibilityState={{ selected: isCurrentRoute }}
            onPress={() => handleTabPress(tab.route)}
            style={[
              styles.tabButton,
              isCurrentRoute && {
                borderTopColor: colors.actionPrimary,
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isCurrentRoute ? colors.textPrimary : colors.textSecondary,
                  fontWeight: isCurrentRoute ? '700' : '500',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 56,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    minHeight: 48,
  },
  tabLabel: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
