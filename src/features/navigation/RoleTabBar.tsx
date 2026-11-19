import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import {
  CheckCircle2,
  Clock,
  Home,
  Layers,
  List,
  MapPin,
  ScanLine,
  User,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily } from '@/constants/theme';
import { useIdentity } from '@/features/identity';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { APP_ROUTES } from './types';

type DockTab = {
  key: string;
  label: string;
  route: string;
  isScan?: boolean;
  disabled?: boolean;
};

export function RoleTabBar() {
  const { activeIdentity } = useIdentity();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  if (
    !activeIdentity ||
    pathname === '/scan' ||
    pathname === '/izin' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname?.includes('/assistant-actions-demo')
  ) {
    return null;
  }

  const role = activeIdentity.role;

  const tabs: DockTab[] =
    role === 'assistant'
      ? [
          { key: 'beranda', label: 'Beranda', route: APP_ROUTES.HOME },
          { key: 'kelas', label: 'Kelas', route: APP_ROUTES.CLASSES },
          { key: 'rekap', label: 'Rekap', route: APP_ROUTES.ASSISTANT_REKAP },
          { key: 'izin', label: 'Izin', route: APP_ROUTES.ASSISTANT_LEAVE_REVIEW },
        ]
      : [
          { key: 'beranda', label: 'Beranda', route: APP_ROUTES.HOME },
          { key: 'peta', label: 'Peta', route: APP_ROUTES.PETA, disabled: true },
          { key: 'scan', label: 'Scan', route: APP_ROUTES.SCAN, isScan: true },
          { key: 'riwayat', label: 'Riwayat', route: APP_ROUTES.STUDENT_ATTENDANCE },
          { key: 'profil', label: 'Profil', route: APP_ROUTES.PROFIL },
        ];

  const isTabSelected = (tab: DockTab): boolean => {
    if (tab.key === 'beranda') {
      return pathname === '/' || pathname.startsWith('/schedule');
    }
    if (tab.key === 'kelas') {
      return pathname === APP_ROUTES.CLASSES || pathname === APP_ROUTES.MASTER_LAB;
    }
    return pathname === tab.route;
  };

  const renderIcon = (key: string, color: string) => {
    const size = 19;
    const strokeWidth = 1.9;
    switch (key) {
      case 'beranda':
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
      case 'peta':
        return <MapPin size={size} color={color} strokeWidth={strokeWidth} />;
      case 'riwayat':
        return <Clock size={size} color={color} strokeWidth={strokeWidth} />;
      case 'profil':
        return <User size={size} color={color} strokeWidth={strokeWidth} />;
      case 'kelas':
        return <Layers size={size} color={color} strokeWidth={strokeWidth} />;
      case 'rekap':
        return <List size={size} color={color} strokeWidth={strokeWidth} />;
      case 'izin':
        return <CheckCircle2 size={size} color={color} strokeWidth={strokeWidth} />;
      default:
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
    }
  };

  const handlePress = (tab: DockTab) => {
    if (tab.disabled) return;
    if (tab.isScan) {
      router.push(tab.route as never);
      return;
    }
    if (pathname !== tab.route) {
      router.replace(tab.route as never);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockOverlay, { bottom: Math.max(insets.bottom, 10) }]}
    >
      <View
        accessibilityRole="tablist"
        style={[
          styles.dockCapsule,
          { backgroundColor: colors.dockBg, borderColor: 'rgba(252, 252, 250, 0.08)' },
        ]}
      >
        {tabs.map((tab) => {
          if (tab.isScan) {
            return (
              <View key={tab.key} style={styles.scanSlot}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel="Buka Scan QR Presensi"
                  onPress={() => handlePress(tab)}
                  style={({ pressed }) => [
                    styles.scanSquircle,
                    {
                      backgroundColor: colors.rosy,
                      borderColor: colors.dockBg,
                    },
                    pressed && styles.scanPressed,
                  ]}
                >
                  <ScanLine size={20} color="#FCFCFA" strokeWidth={2.1} />
                  <Text style={styles.scanLabel}>{tab.label}</Text>
                </Pressable>
              </View>
            );
          }

          const disabled = Boolean(tab.disabled);
          const selected = !disabled && isTabSelected(tab);
          const color = disabled
            ? 'rgba(252, 252, 250, 0.36)'
            : selected
              ? colors.pacific
              : 'rgba(252, 252, 250, 0.72)';

          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={`Tab ${tab.label}`}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => handlePress(tab)}
              style={({ pressed }) => [
                styles.tabSlot,
                disabled && styles.tabDisabled,
                !disabled && pressed && styles.tabPressed,
              ]}
            >
              {renderIcon(tab.key, color)}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color,
                    fontFamily: selected ? FontFamily.sansBold : FontFamily.sansMedium,
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.activeDot,
                  { backgroundColor: selected ? colors.pacific : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  dockCapsule: {
    width: '100%',
    maxWidth: 460,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: '#0D2336',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 12,
  },
  tabSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10.5,
    lineHeight: 13,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  scanSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanSquircle: {
    width: 66,
    height: 54,
    borderRadius: 22,
    borderWidth: 4,
    marginTop: -20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#D55036',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.36,
    shadowRadius: 12,
    elevation: 10,
  },
  scanLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 10,
    lineHeight: 12,
    color: '#FCFCFA',
  },
  tabPressed: {
    opacity: 0.72,
  },
  tabDisabled: {
    opacity: 0.45,
  },
  scanPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});
