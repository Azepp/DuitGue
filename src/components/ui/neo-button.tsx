import { useState, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

export type NeoButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'blue';
  style?: ViewStyle;
  disabled?: boolean;
  icon?: ReactNode;
};

const variantStyles: Record<string, { bg: string; text: string }> = {
  primary: { bg: Colors.primary, text: Colors.black },
  secondary: { bg: Colors.white, text: Colors.black },
  danger: { bg: Colors.danger, text: Colors.black },
  success: { bg: Colors.success, text: Colors.black },
  blue: { bg: Colors.blue, text: Colors.black },
};

const SHADOW_OFFSET = 3;

export function NeoButton({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
  icon,
}: NeoButtonProps) {
  const colors = variantStyles[variant];
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled;

  return (
    <View style={[styles.outer, style]}>
      <View style={styles.shadow} pointerEvents="none" />
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={[
          styles.base,
          {
            backgroundColor: isDisabled ? Colors.gray : colors.bg,
          },
          pressed && styles.pressed,
        ]}
      >
        {icon}
        <ThemedText
          style={[
            styles.text,
            { color: isDisabled ? Colors.background : colors.text },
          ]}
        >
          {title}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  shadow: {
    position: 'absolute',
    top: SHADOW_OFFSET,
    left: SHADOW_OFFSET,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  base: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: {
    transform: [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }],
  },
  text: {
    fontSize: 16,
    fontWeight: 600,
    fontFamily: undefined,
  },
});
