import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/constants/theme";

type YearFilterDropdownProps = {
  years: string[];
  selectedYear: string | "all";
  onSelect: (year: string | "all") => void;
};

const SHADOW_OFFSET = 3;

export function YearFilterDropdown({ years, selectedYear, onSelect }: YearFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  const label = selectedYear === "all" ? "Semua" : selectedYear;

  return (
    <View style={styles.wrapper}>
      <View style={styles.outer}>
        <View style={styles.shadow} pointerEvents="none" />
        <Pressable
          onPress={() => setOpen(!open)}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          style={[styles.base, pressed && styles.pressed]}
        >
          <Text style={styles.text}>{label}</Text>
          <MaterialCommunityIcons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.black}
          />
        </Pressable>
      </View>

      {open && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={[styles.item, selectedYear === "all" && styles.itemSelected]}
              onPress={() => { onSelect("all"); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.itemText, selectedYear === "all" && styles.itemTextSelected]}>
                Semua
              </Text>
              {selectedYear === "all" && (
                <MaterialCommunityIcons name="check" size={16} color={Colors.black} />
              )}
            </TouchableOpacity>

            <View style={styles.separator} />

            {years.map((year) => (
              <TouchableOpacity
                key={year}
                style={[styles.item, selectedYear === year && styles.itemSelected]}
                onPress={() => { onSelect(year); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemText, selectedYear === year && styles.itemTextSelected]}>
                  {year}
                </Text>
                {selectedYear === year && (
                  <MaterialCommunityIcons name="check" size={16} color={Colors.black} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 999,
  },
  outer: {
    position: "relative",
    paddingRight: SHADOW_OFFSET,
    paddingBottom: SHADOW_OFFSET,
  },
  shadow: {
    position: "absolute",
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
    flexDirection: "row",
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: Colors.primary,
  },
  pressed: {
    transform: [{ translateX: SHADOW_OFFSET }, { translateY: SHADOW_OFFSET }],
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
  },
  backdrop: {
    position: "absolute",
    inset: 0,
    zIndex: 998,
  },
  dropdown: {
    position: "absolute",
    top: 48,
    right: 0,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 12,
    width: 128,
    shadowColor: Colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    zIndex: 999,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.black,
    opacity: 0.1,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemSelected: {
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  itemText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.black,
  },
  itemTextSelected: {
    fontWeight: "700",
  },
});
