/**
 * Token Tema Global Sistem Manajemen Praktikum - Sprint 1
 * Dikelola oleh: Galang (Owner Tema Global)
 * Referensi: design_baseline.md Bagian 2.2 (Monokrom Penuh)
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Monokrom Design Baseline Sprint 1
    background: '#F7F7F7',
    surface: '#FFFFFF',
    surfaceMuted: '#EEEEEE',
    textPrimary: '#171717',
    textSecondary: '#555555',
    border: '#D2D2D2',
    actionPrimary: '#171717',
    actionSecondary: '#FFFFFF',
    disabledSurface: '#E5E5E5',
    disabledText: '#555555',

    // Kompatibilitas komponen dasar starter
    text: '#171717',
    backgroundElement: '#EEEEEE',
    backgroundSelected: '#E0E1E6',
  },
  dark: {
    // Monokrom Design Baseline Sprint 1
    background: '#111111',
    surface: '#1C1C1C',
    surfaceMuted: '#292929',
    textPrimary: '#F5F5F5',
    textSecondary: '#C2C2C2',
    border: '#414141',
    actionPrimary: '#F5F5F5',
    actionSecondary: '#1C1C1C',
    disabledSurface: '#303030',
    disabledText: '#B5B5B5',

    // Kompatibilitas komponen dasar starter
    text: '#F5F5F5',
    backgroundElement: '#292929',
    backgroundSelected: '#2E3135',
  },
} as const;

export type ThemeColors = typeof Colors.light;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
