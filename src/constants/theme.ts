/**
 * Casual Academic Design System Tokens
 * Referensi Figma: Board 00 (Header B3 + Footer B2) & Variable Collection Color
 */

import '@/global.css';

import { Platform } from 'react-native';

export const FontFamily = {
  displaySemiBold: 'Baloo2_600SemiBold',
  displayBold: 'Baloo2_700Bold',
  sansRegular: 'Rubik_400Regular',
  sansMedium: 'Rubik_500Medium',
  sansSemiBold: 'Rubik_600SemiBold',
  sansBold: 'Rubik_700Bold',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const Colors = {
  light: {
    // 5-Color Casual Academic Palette
    background: '#F2F4F6',
    surface: '#FCFCFA',
    surfaceMuted: '#E5EBF0',
    border: '#DCE4EA',
    borderStrong: '#B9C7D4',

    textPrimary: '#0D2336',
    textSecondary: '#4E6273',
    textSubtle: '#6E8091',

    baltic: '#12597F',
    balticSoft: '#E9F1F6',
    pacific: '#1FA7C1',
    pacificSoft: '#E8F7FA',
    pacificDark: '#0E6F83',
    pacificLight: '#BCE8F2',
    rosy: '#D55036',
    rosyDark: '#AE3B24',
    rosySoft: '#FCF0ED',
    rosyBorder: '#F3D3CC',

    dockBg: '#0D2336',
    scrim: 'rgba(13, 35, 54, 0.48)',

    actionPrimary: '#D55036',
    actionSecondary: '#FCFCFA',
    disabledSurface: '#E5EBF0',
    disabledText: '#6E8091',

    // Starter & Navigation Compatibility
    text: '#0D2336',
    backgroundElement: '#E5EBF0',
    backgroundSelected: '#E8F7FA',
  },
  dark: {
    background: '#091826',
    surface: '#0D2336',
    surfaceMuted: '#15324B',
    border: '#1C3D58',
    borderStrong: '#2B5373',

    textPrimary: '#FCFCFA',
    textSecondary: '#BCE8F2',
    textSubtle: '#8AA2B5',

    baltic: '#12597F',
    balticSoft: '#15324B',
    pacific: '#1FA7C1',
    pacificSoft: '#103946',
    pacificDark: '#BCE8F2',
    pacificLight: '#1FA7C1',
    rosy: '#D55036',
    rosyDark: '#F3A99B',
    rosySoft: '#3B1B15',
    rosyBorder: '#632B20',

    dockBg: '#0D2336',
    scrim: 'rgba(9, 24, 38, 0.64)',

    actionPrimary: '#D55036',
    actionSecondary: '#FCFCFA',
    disabledSurface: '#15324B',
    disabledText: '#8AA2B5',

    // Starter & Navigation Compatibility
    text: '#FCFCFA',
    backgroundElement: '#15324B',
    backgroundSelected: '#103946',
  },
} as const;

export type ThemeColors = typeof Colors.light | typeof Colors.dark;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.sansRegular,
    serif: FontFamily.displayBold,
    rounded: FontFamily.displayBold,
    mono: FontFamily.monoMedium,
  },
  default: {
    sans: FontFamily.sansRegular,
    serif: FontFamily.displayBold,
    rounded: FontFamily.displayBold,
    mono: FontFamily.monoMedium,
  },
  web: {
    sans: FontFamily.sansRegular,
    serif: FontFamily.displayBold,
    rounded: FontFamily.displayBold,
    mono: FontFamily.monoMedium,
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

export const BottomTabInset = Platform.select({ ios: 104, android: 96, default: 96 }) ?? 96;
export const MaxContentWidth = 560;
