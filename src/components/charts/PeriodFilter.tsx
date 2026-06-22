import { TouchableOpacity, View, StyleSheet, Text } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import type { PeriodType } from "@/types/grafik";

type Props = {
  value: PeriodType;
  onChange: (value: PeriodType) => void;
};

const OPTIONS: { label: string; value: PeriodType }[] = [
  { label: "Pekan", value: "week" },
  { label: "Bulan", value: "month" },
  { label: "Tahun", value: "year" },
];

export function PeriodFilter({ value, onChange }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.wrapper}>
        <View style={styles.shadow} pointerEvents="none" />
        <View style={styles.container}>
          {OPTIONS.map((opt, i) => (
            <View key={opt.value} style={{ flex: 1, flexDirection: "row" }}>
              <TouchableOpacity
                style={[styles.chip, value === opt.value && { backgroundColor: Colors.primary }]}
                onPress={() => onChange(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.text, value === opt.value && styles.textActive]}>{opt.label}</Text>
              </TouchableOpacity>
              {i < OPTIONS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
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
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
    textAlign: "center",
  },
  textActive: {
    color: Colors.black,
  },
});
