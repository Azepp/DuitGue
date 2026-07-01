import { useCallback, useEffect, useRef } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import type { PeriodType } from "@/types/grafik";

type Props = {
  options: string[];
  periodType: PeriodType;
  value: string;
  onChange: (value: string) => void;
};

export function PeriodValueSelector({ options, periodType, value, onChange }: Props) {
  const flatRef = useRef<FlatList>(null);
  const initialScrollDone = useRef(false);

  const renderLabel = useCallback(
    (opt: string) => {
      if (periodType === "year") return opt;
      if (periodType === "month") return opt.split("-")[2];
      return `Minggu ${opt.split("W")[1]}`;
    },
    [periodType],
  );

  useEffect(() => {
    if (!options.length || !value) return;
    const idx = options.indexOf(value);
    if (idx === -1) return;
    flatRef.current?.scrollToIndex({
      index: idx,
      animated: initialScrollDone.current,
      viewPosition: 0.5,
    });
    initialScrollDone.current = true;
  }, [options, value]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={options}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => {
          const active = item === value;
          return (
            <Pressable
              style={[styles.item, active && styles.itemActive]}
              onPress={() => onChange(item)}
            >
              <ThemedText style={[styles.label, active && styles.labelActive]}>
                {renderLabel(item)}
              </ThemedText>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.pageX,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.black,
    shadowColor: Colors.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.black,
    fontFamily: Fonts.bold,
  },
});
