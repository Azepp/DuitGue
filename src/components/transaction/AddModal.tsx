import { useState, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  PanResponder,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { NeoInput } from '@/components/ui/neo-input';
import { NeoDatePicker } from '@/components/ui/date-picker';
import { Colors, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/lib/utils';

type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'pengeluaran' | 'pemasukan';
};

export type TransactionData = {
  id?: string;
  category_id: string;
  category_name: string;
  type: 'pengeluaran' | 'pemasukan';
  amount: number;
  note: string;
  date: string;
};

type AddModalState = {
  visible: boolean;
  category: Category | null;
  isEdit: boolean;
  open: (category: Category, editTx?: { id: string; amount: number; note: string; date: string }) => void;
  close: () => void;
};

const AddModalContext = createContext<AddModalState>({
  visible: false,
  category: null,
  isEdit: false,
  open: () => {},
  close: () => {},
});

function NumpadButton({
  label,
  icon,
  onPress,
  danger,
}: {
  label?: string;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <View style={styles.numpadBtnShadow}>
      <View style={styles.numpadBtnShadowFill} pointerEvents="none" />
      <TouchableOpacity
        style={[styles.numpadBtn, danger && styles.numpadBtnDanger]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {icon ? (
          <MaterialCommunityIcons name={icon} size={24} color={danger ? Colors.white : Colors.black} />
        ) : (
          <Text style={[styles.numpadBtnText, danger && { color: Colors.white }]}>{label}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function AddModalProvider({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit?: (data: TransactionData) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const sheetTranslateY = useRef(new Animated.Value(screenHeight)).current;

  const open = useCallback((cat: Category, editTx?: { id: string; amount: number; note: string; date: string }) => {
    setCategory(cat);
    setAmount(editTx?.amount ?? 0);
    setNote(editTx?.note ?? '');
    setDate(editTx?.date ? new Date(editTx.date + 'T00:00:00') : new Date());
    setIsEdit(!!editTx);
    setEditId(editTx?.id ?? null);
    setShowDatePicker(false);
    setVisible(true);
    sheetTranslateY.setValue(screenHeight);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [sheetTranslateY, screenHeight]);

  const close = useCallback(() => {
    setVisible(false);
    setCategory(null);
    setIsEdit(false);
    setEditId(null);
  }, []);

  const handleSwipeMove = useCallback((dy: number) => {
    if (dy > 0) {
      sheetTranslateY.setValue(dy);
    }
  }, [sheetTranslateY]);

  const handleSwipeRelease = useCallback((dy: number, vy: number) => {
    const threshold = 100;
    if (dy > threshold || vy > 0.5) {
      Animated.timing(sheetTranslateY, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }).start(() => close());
    } else {
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    }
  }, [close, sheetTranslateY, screenHeight]);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => handleSwipeMove(gs.dy),
      onPanResponderRelease: (_, gs) => handleSwipeRelease(gs.dy, gs.vy),
    }),
  ).current;

  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_, gs) => handleSwipeMove(gs.dy),
      onPanResponderRelease: (_, gs) => handleSwipeRelease(gs.dy, gs.vy),
    }),
  ).current;

  const handleNumpadPress = useCallback(
    (value: string) => {
      setAmount((prev) => {
        if (prev > 999999999) return prev;

        if (value === 'backspace') {
          return Math.floor(prev / 10);
        }

        if (value === '00') {
          if (prev === 0) return 0;
          const next = prev * 100;
          return next > 999999999 ? prev : next;
        }

        if (value === '000') {
          if (prev === 0) return 0;
          const next = prev * 1000;
          return next > 999999999 ? prev : next;
        }

        if (value === '+') {
          const next = prev + 10000;
          return next > 999999999 ? prev : next;
        }

        if (value === '-') {
          const next = prev - 10000;
          return next < 0 ? 0 : next;
        }

        if (value === ',') {
          return prev;
        }

        const digit = parseInt(value, 10);
        if (prev === 0) return digit;
        const next = prev * 10 + digit;
        return next > 999999999 ? prev : next;
      });
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!category || amount <= 0) return;

    const data: TransactionData = {
      id: editId ?? undefined,
      category_id: category.id,
      category_name: category.name,
      type: category.type,
      amount,
      note,
      date: date.toISOString().split('T')[0],
    };
    onSubmit?.(data);
    close();
  }, [category, amount, note, date, editId, close, onSubmit]);

  const formatDate = useCallback((d: Date) => {
    const today = new Date();
    if (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    ) {
      return 'Hari ini';
    }
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const numpadRows: { label?: string; icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']; value: string; danger?: boolean }[][] =
    [
      [
        { label: '7', value: '7' },
        { label: '8', value: '8' },
        { label: '9', value: '9' },
        { icon: 'backspace-outline', value: 'backspace', danger: true },
      ],
      [
        { label: '4', value: '4' },
        { label: '5', value: '5' },
        { label: '6', value: '6' },
        { icon: 'plus', value: '+' },
      ],
      [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { icon: 'minus', value: '-' },
      ],
      [
        { label: '0', value: '0' },
        { label: '00', value: '00' },
        { label: '000', value: '000' },
        { label: ',', value: ',' },
      ],
    ];

  const contextValue = useMemo(() => ({ visible, category, isEdit, open, close }), [visible, category, isEdit, open, close]);

  const sheetContent = (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }], paddingBottom: insets.bottom + Spacing.four }]} {...sheetPanResponder.panHandlers}>
      <View style={styles.handleArea} {...handlePanResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      <View style={styles.inputWrapper}>
        <Text style={styles.fieldLabel}>Catatan:</Text>
        <NeoInput
          placeholder="Cth: Makan siang di warteg"
          value={note}
          onChangeText={setNote}
          maxLength={200}
        />
      </View>

      <View style={styles.amountSection}>
        <Text style={styles.fieldLabel}>Jumlah Duit:</Text>
        <View style={styles.amountDisplay}>
          <Text
            style={[
              styles.amountText,
              category?.type === 'pengeluaran' && { color: Colors.danger },
              category?.type === 'pemasukan' && { color: Colors.success },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatRupiah(amount)}
          </Text>
        </View>
      </View>

      <View style={styles.confirmBar}>
        <View style={styles.confirmPillShadow}>
          <View style={styles.pillShadowFill} pointerEvents="none" />
          <TouchableOpacity style={styles.confirmPill} onPress={close}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.black} />
            <Text style={styles.pillText}>{category?.name}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.confirmPillShadow}>
          <View style={styles.pillShadowFill} pointerEvents="none" />
          <TouchableOpacity
            style={styles.confirmPill}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar-outline" size={18} color={Colors.black} />
            <Text style={styles.pillText}>{formatDate(date)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <NeoDatePicker
        visible={showDatePicker}
        date={date}
        onDateChange={(d) => setDate(d)}
        onClose={() => setShowDatePicker(false)}
      />

      <View style={styles.numpadGrid}>
        {numpadRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numpadRow}>
            {row.map((btn) => (
              <NumpadButton
                key={btn.value}
                label={btn.label}
                icon={btn.icon}
                danger={btn.danger}
                onPress={() => handleNumpadPress(btn.value)}
              />
            ))}
          </View>
        ))}
      </View>

      {amount <= 0 ? (
        <TouchableOpacity
          style={[styles.submitBtn, styles.submitBtnDisabled]}
          disabled
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>Gaskeun</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.submitShadow}>
          <View style={styles.submitShadowFill} pointerEvents="none" />
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>Gaskeun</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  return (
    <AddModalContext.Provider value={contextValue}>
      {children}
      {Platform.OS === 'android' ? (
        visible && (
          <View style={styles.overlayAbsolute}>
            <Pressable style={{ flex: 1 }} onPress={close} />
            {sheetContent}
          </View>
        )
      ) : (
        <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
          <View style={styles.overlay}>
            {sheetContent}
          </View>
        </Modal>
      )}
    </AddModalContext.Provider>
  );
}

export function useAddModal() {
  return useContext(AddModalContext);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderColor: Colors.black,
    paddingHorizontal: Spacing.pageX,
    paddingTop: Spacing.two,
  },
  handleArea: {
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  handle: {
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.black,
    alignSelf: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  inputWrapper: {
    marginBottom: Spacing.three,
  },
  amountSection: {
    marginBottom: Spacing.three,
  },
  amountDisplay: {
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 12,
    padding: Spacing.three,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  amountText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.black,
  },
  confirmBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  confirmPillShadow: {
    flex: 1,
    paddingRight: 3,
    paddingBottom: 3,
  },
  pillShadowFill: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: Colors.black,
  },
  confirmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.black,
  },
  numpadGrid: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  numpadBtnShadow: {
    flex: 1,
    paddingRight: 3,
    paddingBottom: 3,
  },
  numpadBtnShadowFill: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
  },
  numpadBtn: {
    height: 56,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numpadBtnDanger: {
    backgroundColor: Colors.danger,
  },
  numpadBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.black,
  },
  submitShadow: {
    paddingRight: 4,
    paddingBottom: 4,
  },
  submitShadowFill: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
  },
  submitBtn: {
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 12,
    padding: Spacing.three,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: Colors.gray,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
  },
});
