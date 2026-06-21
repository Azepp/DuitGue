import { type ViewProps, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type PageLayoutProps = ViewProps & {
  center?: boolean;
};

export function PageLayout({ style, center, ...rest }: PageLayoutProps) {
  return (
    <ThemedView
      style={[styles.page, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: Spacing.pageX,
    paddingTop: Spacing.pageY,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
