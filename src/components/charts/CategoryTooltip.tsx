import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { formatRupiah } from "@/lib/utils";
import type { CategorySummary } from "@/types/grafik";

type Props = {
  category: CategorySummary;
  x: number;
  y: number;
  onClose: () => void;
};

export function CategoryTooltip({ category, x, y, onClose }: Props) {
  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
      <View style={[styles.card, { left: Math.max(8, x - 80), top: Math.max(8, y - 40) }]}>
        <View style={styles.shadow} pointerEvents="none" />
        <View style={styles.content}>
          <View style={[styles.iconBox, { backgroundColor: category.color }]}>
            <MaterialCommunityIcons name={category.icon as any} size={18} color={Colors.white} />
          </View>
          <View style={styles.info}>
            <ThemedText style={styles.name}>{category.name}</ThemedText>
            <ThemedText style={styles.detail}>
              {formatRupiah(category.amount)}{" "}
              <ThemedText style={[styles.percent, { color: category.color }]}>
                {category.percentage}%
              </ThemedText>
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: 200,
    paddingRight: 3,
    paddingBottom: 3,
    zIndex: 999,
  },
  shadow: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.black,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    padding: Spacing.twoHalf,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.black,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  detail: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    marginTop: 2,
  },
  percent: {
    fontFamily: Fonts.bold,
  },
});
