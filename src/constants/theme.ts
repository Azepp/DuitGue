/**
 * Colors used in the app — light mode only.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  primary: '#FFD200',
  success: '#01CA47',
  danger: '#FF6060',
  blue: '#52E8ED',
  orange: '#FF9D00',
  purple: '#D026E3',

  black: '#1A1A1A',
  white: '#FFFFFF',
  gray: '#BFC9D1',
  grayLight: '#F5F5F5',

  text: '#1A1A1A',
  background: '#F5F5F5',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#E0E1E6',
  textSecondary: '#60646C',
} as const;

export type ThemeColor = keyof typeof Colors;

const fontFamily = 'SpaceGrotesk_400Regular';

export const Fonts = Platform.select({
  ios: {
    sans: fontFamily,
    serif: fontFamily,
    rounded: fontFamily,
    mono: fontFamily,
    light: 'SpaceGrotesk_300Light',
    regular: 'SpaceGrotesk_400Regular',
    medium: 'SpaceGrotesk_500Medium',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  default: {
    sans: fontFamily,
    serif: fontFamily,
    rounded: fontFamily,
    mono: fontFamily,
    light: 'SpaceGrotesk_300Light',
    regular: 'SpaceGrotesk_400Regular',
    medium: 'SpaceGrotesk_500Medium',
    semiBold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  web: {
    sans: `'Space Grotesk', var(--font-display)`,
    serif: `'Space Grotesk', var(--font-serif)`,
    rounded: `'Space Grotesk', var(--font-rounded)`,
    mono: `'Space Grotesk', var(--font-mono)`,
    light: `'Space Grotesk', var(--font-display)`,
    regular: `'Space Grotesk', var(--font-display)`,
    medium: `'Space Grotesk', var(--font-display)`,
    semiBold: `'Space Grotesk', var(--font-display)`,
    bold: `'Space Grotesk', var(--font-display)`,
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
  three: 16,
  threeHalf: 20,
  four: 24,
  five: 32,
  six: 64,
  pageX: 24,
  pageY: 20,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
