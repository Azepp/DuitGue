import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

const FONT_BY_WEIGHT: Record<string, string> = {
  '100': 'SpaceGrotesk_300Light',
  '200': 'SpaceGrotesk_300Light',
  '300': 'SpaceGrotesk_300Light',
  '400': 'SpaceGrotesk_400Regular',
  '500': 'SpaceGrotesk_500Medium',
  '600': 'SpaceGrotesk_600SemiBold',
  '700': 'SpaceGrotesk_700Bold',
  '800': 'SpaceGrotesk_700Bold',
  '900': 'SpaceGrotesk_700Bold',
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const flatStyle = style ? StyleSheet.flatten(style) : {};
  const fontWeight = flatStyle.fontWeight;
  const weightFont = fontWeight ? FONT_BY_WEIGHT[String(fontWeight)] : undefined;

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], letterSpacing: -0.5 },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
        weightFont && { fontFamily: weightFont },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.medium,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.bold,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.medium,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: Fonts.semiBold,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontFamily: Fonts.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontFamily: Fonts.sans,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
    fontFamily: Fonts.sans,
  },
  code: {
    fontFamily: Platform.select({ android: Fonts.bold }) ?? Fonts.medium,
    fontSize: 12,
  },
});
