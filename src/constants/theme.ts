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

const fontFamily = 'SpaceGrotesk';

export const Fonts = Platform.select({
  ios: {
    sans: fontFamily,
    serif: fontFamily,
    rounded: fontFamily,
    mono: fontFamily,
  },
  default: {
    sans: fontFamily,
    serif: fontFamily,
    rounded: fontFamily,
    mono: fontFamily,
  },
  web: {
    sans: `'${fontFamily}', var(--font-display)`,
    serif: `'${fontFamily}', var(--font-serif)`,
    rounded: `'${fontFamily}', var(--font-rounded)`,
    mono: `'${fontFamily}', var(--font-mono)`,
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
