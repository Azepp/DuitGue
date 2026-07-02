import { useState, useCallback, useMemo, createContext, useContext } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { NeoInput } from '@/components/ui/neo-input';
import { NeoDatePicker } from '@/components/ui/date-picker';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const formatNumber = (n: number) => {
  const s = n.toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

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
        activeOpacity={0.8}
        style={[styles.numpadBtn, danger && styles.numpadBtnDanger]}
        onPress={onPress}
      >
        {icon ? (
          <MaterialCommunityIcons name={icon} size={24} color={danger ? Colors.white : Colors.black} />
        ) : (
          <ThemedText style={[styles.numpadBtnText, danger && { color: Colors.white }]}>{label}</ThemedText>
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
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [operation, setOperation] = useState<'add' | 'sub' | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  const [sheetTranslateY] = useState(() => new Animated.Value(screenHeight));

  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) {
            sheetTranslateY.setValue(gs.dy);
          }
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 100 || gs.vy > 0.5) {
            close();
          } else {
            Animated.spring(sheetTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
            }).start();
          }
        },
      }).panHandlers,
    [],
  );

  const isCalcMode = pendingAmount !== null && operation !== null;

  const open = useCallback((cat: Category, editTx?: { id: string; amount: number; note: string; date: string }) => {
    setCategory(cat);
    setAmount(editTx?.amount ?? 0);
    setPendingAmount(null);
    setOperation(null);
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
    Animated.timing(sheetTranslateY, {
      toValue: screenHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setCategory(null);
      setIsEdit(false);
      setEditId(null);
      setPendingAmount(null);
      setOperation(null);
    });
  }, [sheetTranslateY, screenHeight]);

  const handleNumpadPress = (value: string) => {
    if (value === '+' || value === '-') {
      let newPending: number;
      if (operation === 'add') newPending = (pendingAmount ?? 0) + amount;
      else if (operation === 'sub') newPending = (pendingAmount ?? 0) - amount;
      else newPending = amount;

      setPendingAmount(newPending);
      setOperation(value === '+' ? 'add' : 'sub');
      setAmount(0);
      return;
    }

    if (value === '=') {
      let result: number;
      if (operation === 'add') result = (pendingAmount ?? 0) + amount;
      else if (operation === 'sub') result = (pendingAmount ?? 0) - amount;
      else result = amount;

      setPendingAmount(null);
      setOperation(null);
      setAmount(result < 0 ? 0 : result > 999999999 ? 999999999 : result);
      return;
    }

    setAmount((prev) => {
      if (prev > 999999999) return prev;

      if (value === 'backspace') return Math.floor(prev / 10);
      if (value === 'ac') return 0;

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

      const digit = parseInt(value, 10);
      if (prev === 0) return digit;
      const next = prev * 10 + digit;
      return next > 999999999 ? prev : next;
    });
  };

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
        { label: 'AC', value: 'ac', danger: true },
      ],
      [
        { label: '1', value: '1' },
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { icon: 'plus', value: '+' },
      ],
      [
        { label: '0', value: '0' },
        { label: '00', value: '00' },
        { label: '000', value: '000' },
        { icon: 'minus', value: '-' },
      ],
    ];

  const contextValue = useMemo(() => ({ visible, category, isEdit, open, close }), [visible, category, isEdit, open, close]);

  const sheetContent = (
    <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }], paddingBottom: insets.bottom + Spacing.four }]}>
      <TouchableOpacity style={styles.backdropExtender} activeOpacity={1} onPress={close} />

      <View style={styles.handleArea} {...panHandlers}>
        <View style={styles.handle} />
      </View>

      <View style={styles.inputWrapper}>
        <ThemedText style={styles.fieldLabel}>Catatan:</ThemedText>
        <NeoInput
          placeholder="Cth: Makan siang di warteg"
          value={note}
          onChangeText={setNote}
          maxLength={200}
          style={{ fontFamily: Fonts.semiBold }}
        />
      </View>

      <View style={styles.amountSection}>
        <ThemedText style={styles.fieldLabel}>Jumlah Duit:</ThemedText>
        {isCalcMode && (
          <ThemedText style={styles.pendingText}>
            {formatNumber(pendingAmount ?? 0)} {operation === 'add' ? '+' : '-'}
          </ThemedText>
        )}
        <View style={styles.amountDisplay}>
          <ThemedText
            style={[
              styles.amountText,
              category?.type === 'pengeluaran' && { color: Colors.danger },
              category?.type === 'pemasukan' && { color: Colors.success },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatNumber(amount)}
          </ThemedText>
        </View>
      </View>

      <View style={styles.confirmBar}>
        <View style={styles.confirmPillShadow}>
          <View style={styles.pillShadowFill} pointerEvents="none" />
          <TouchableOpacity style={styles.confirmPill} onPress={close}>
            <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.black} />
            <ThemedText style={styles.pillText}>{category?.name}</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.confirmPillShadow}>
          <View style={styles.pillShadowFill} pointerEvents="none" />
          <TouchableOpacity
            style={styles.confirmPill}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar-outline" size={18} color={Colors.black} />
            <ThemedText style={styles.pillText}>{formatDate(date)}</ThemedText>
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

      {amount <= 0 && !isCalcMode ? (
        <TouchableOpacity
          style={[styles.submitBtn, styles.submitBtnDisabled]}
          disabled
          activeOpacity={0.8}
        >
          <ThemedText style={styles.submitBtnText}>Gaskeun</ThemedText>
        </TouchableOpacity>
      ) : (
        <View style={styles.submitShadow}>
          <View style={styles.submitShadowFill} pointerEvents="none" />
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={isCalcMode ? handleNumpadPress.bind(null, '=') : handleSubmit}
            activeOpacity={0.8}
          >
            {isCalcMode ? (
              <MaterialCommunityIcons name="equal" size={24} color={Colors.black} />
            ) : (
              <ThemedText style={styles.submitBtnText}>Gaskeun</ThemedText>
            )}
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
            <View style={styles.overlay}>
              {sheetContent}
            </View>
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
    zIndex: 1000,
  },
  backdropExtender: {
    position: 'absolute',
    bottom: '100%',
    left: -100,
    right: -100,
    height: 2000,
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
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: Spacing.one,
  },
  inputWrapper: {
    marginBottom: Spacing.three,
  },
  amountSection: {
    marginBottom: Spacing.three,
  },
  pendingText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.half,
  },
  amountDisplay: {
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: 12,
    paddingVertical: Spacing.threeHalf,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: Colors.black,
    lineHeight: 44,
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
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
