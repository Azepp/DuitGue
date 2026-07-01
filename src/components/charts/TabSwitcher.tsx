import { useRef } from "react";
import { PanResponder, TouchableOpacity, View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import type { TransactionType } from "@/types/grafik";

type Props = {
  value: TransactionType;
  onChange: (value: TransactionType) => void;
};

export function TabSwitcher({ value, onChange }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 15,
      onPanResponderRelease: (_, gs) => {
        const threshold = 50;
        const current = valueRef.current;
        if (current === "expense" && gs.dx < -threshold) {
          onChange("income");
        } else if (current === "income" && gs.dx > threshold) {
          onChange("expense");
        }
      },
    }),
  ).current;

  return (
    <View style={styles.bar} {...panResponder.panHandlers}>
      <View style={styles.wrapper}>
        <View style={styles.shadow} pointerEvents="none" />
        <View style={styles.container}>
          <TouchableOpacity
            style={[styles.chip, value === "expense" && { backgroundColor: Colors.danger }]}
            onPress={() => onChange("expense")}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.text, value === "expense" && styles.textActive]}>Pengeluaran</ThemedText>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={[styles.chip, value === "income" && { backgroundColor: Colors.success }]}
            onPress={() => onChange("income")}
            activeOpacity={0.8}
          >
            <ThemedText style={[styles.text, value === "income" && styles.textActive]}>Pemasukan</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: Spacing.pageX,
  },
  wrapper: {
    paddingRight: 4,
    paddingBottom: 4,
  },
  shadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    backgroundColor: Colors.black,
  },
  container: {
    flexDirection: "row",
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: Colors.white,
  },
  chip: {
    flex: 1,
    paddingVertical: Spacing.twoHalf,
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  divider: {
    width: 3,
    backgroundColor: Colors.black,
  },
  text: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  textActive: {
    color: Colors.white,
  },
});
