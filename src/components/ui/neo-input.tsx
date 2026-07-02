import { useState } from 'react';
import {
  TextInput,
  View,
  TouchableOpacity,
  type TextInputProps,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';

export type NeoInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

const SHADOW_OFFSET = 3;

export function NeoInput({ label, error, style, placeholder, secureTextEntry, ...rest }: NeoInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={styles.wrapper}>
      {label && (
        <ThemedText type="smallBold">
          {label}
        </ThemedText>
      )}
      <View style={[styles.outer, isFocused && styles.outerFocused, error && styles.outerError]}>
        <View style={styles.shadow} pointerEvents="none" />
        <View style={styles.container}>
          <TextInput
            style={[styles.input, style]}
            placeholder={placeholder}
            placeholderTextColor={Colors.gray}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            secureTextEntry={isPassword ? !showPassword : false}
            underlineColorAndroid="transparent"
            {...rest}
          />
          {isPassword && (
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={Colors.black}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {error && (
        <ThemedText type="small" style={{ color: Colors.danger }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  outer: {
    position: 'relative',
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  outerFocused: {
    paddingRight: 0,
    paddingBottom: 0,
  },
  outerError: {},
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 16,
    color: Colors.black,
    padding: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  eyeButton: {
    paddingRight: 16,
    paddingVertical: 14,
  },
});
