import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { formatRupiah } from "@/lib/utils";
import type { CategorySummary } from "@/types/grafik";

type Props = {
  category: CategorySummary;
};

export function CategoryProgressBar({ category }: Props) {
  return (
    <View style={styles.shadow}>
      <View style={styles.shadowFill} pointerEvents="none" />
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <View style={[styles.iconBox, { backgroundColor: category.color }]}>
              <MaterialCommunityIcons name={category.icon as any} size={16} color={Colors.white} />
            </View>
            <Text style={styles.name}>{category.name}</Text>
          </View>
          <Text style={styles.amount}>{formatRupiah(category.amount)}</Text>
        </View>
        <View style={styles.barRow}>
          <View style={styles.barOuter}>
            <View style={[styles.barFill, { width: `${category.percentage}%` as any, backgroundColor: category.color }]} />
          </View>
          <Text style={styles.percentLabel}>{category.percentage}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    marginBottom: Spacing.two,
    paddingRight: 3,
    paddingBottom: 3,
  },
  shadowFill: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: Colors.black,
  },
  card: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    backgroundColor: Colors.white,
    padding: Spacing.twoHalf,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.two,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.black,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
  },
  amount: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.black,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  barOuter: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: Colors.black,
    borderRadius: 3,
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.black,
    width: 40,
    textAlign: "right",
  },
});
