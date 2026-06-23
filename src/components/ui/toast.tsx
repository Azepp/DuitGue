import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';

type ToastType = 'success' | 'error';

type ToastContextValue = {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('success');
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hide = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setMessage(null));
  }, [translateY]);

  const showToast = useCallback(
    (msg: string, toastType: ToastType = 'success', duration: number = 1500) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setType(toastType);
      setMessage(msg);
      translateY.setValue(-100);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }).start();
      timerRef.current = setTimeout(hide, duration);
    },
    [translateY, hide],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <View style={[styles.wrapper, { top: insets.top + Spacing.two }]} pointerEvents="none">
          <Animated.View
            style={[
              styles.toast,
              type === 'error' && styles.toastError,
              { transform: [{ translateY }] },
            ]}
          >
            <View style={styles.shadowFill} pointerEvents="none" />
            <View style={[styles.content, type === 'error' && styles.contentError]}>
              <MaterialCommunityIcons
                name={type === 'error' ? 'close' : 'check'}
                size={20}
                color={Colors.white}
              />
              <Text style={styles.text}>{message}</Text>
            </View>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.pageX,
    right: Spacing.pageX,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    paddingRight: 4,
    paddingBottom: 4,
  },
  toastError: {},
  shadowFill: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: Colors.black,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 2.5,
    borderColor: Colors.black,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    backgroundColor: Colors.success,
  },
  contentError: {
    backgroundColor: Colors.danger,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    flexShrink: 1,
  },
});
