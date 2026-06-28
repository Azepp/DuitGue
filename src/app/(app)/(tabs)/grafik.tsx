import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, PanResponder, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/constants/theme";
import { useTransactionSummary, usePeriodOptions } from "@/hooks/useTransactionSummary";
import { TabSwitcher, PeriodFilter, PeriodValueSelector, CustomDonutChart, CategoryProgressBar, CategoryTooltip } from "@/components/charts";
import type { TransactionType, PeriodType, CategorySummary } from "@/types/grafik";

export default function GrafikScreen() {
  const insets = useSafeAreaInsets();
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [periodValue, setPeriodValue] = useState("");
  const [tooltip, setTooltip] = useState<{ category: CategorySummary; x: number; y: number } | null>(null);

  const { data: periodOptions } = usePeriodOptions(periodType);
  const resolvedOptions = periodOptions ?? [];

  const slideAnim = useRef(new Animated.Value(0)).current;
  const txTypeRef = useRef(txType);
  txTypeRef.current = txType;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 15,
      onPanResponderMove: (_, gs) => {
        slideAnim.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        const threshold = 50;
        const current = txTypeRef.current;
        if (gs.dx < -threshold && current === "expense") {
          setTxType("income");
          setTooltip(null);
        } else if (gs.dx > threshold && current === "income") {
          setTxType("expense");
          setTooltip(null);
        }
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const currentPeriodValue = useMemo(() => {
    const now = new Date();
    if (periodType === "year") return String(now.getFullYear());
    if (periodType === "month") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const months = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
      ];
      return `${y}-${m}-${months[now.getMonth()]}`;
    }
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const day = now.getDate();
    const weekNum = Math.ceil(day / 7);
    return `${y}-${m}-W${weekNum}`;
  }, [periodType]);

  useEffect(() => {
    if (!periodValue && resolvedOptions.length > 0) {
      const match = resolvedOptions.find((o) => o === currentPeriodValue);
      setPeriodValue(match || resolvedOptions[0]);
    }
  }, [resolvedOptions, periodValue, currentPeriodValue]);

  const effectiveValue = periodValue || resolvedOptions[0] || "";

  const { data: summary, isLoading } = useTransactionSummary(txType, periodType, effectiveValue);

  const categories = summary?.categories ?? [];
  const total = summary?.total ?? 0;

  const handlePeriodTypeChange = useCallback((pt: PeriodType) => {
    setPeriodType(pt);
    setPeriodValue("");
    setTooltip(null);
  }, []);

  const handleTxTypeChange = useCallback((t: TransactionType) => {
    setTxType(t);
    setTooltip(null);
  }, []);

  const chartRef = useRef<View>(null);

  const handleSliceTap = useCallback((cat: CategorySummary) => {
    chartRef.current?.measureInWindow((px, py, w, h) => {
      setTooltip({ category: cat, x: px + w / 2, y: py + h / 2 });
    });
  }, []);

  const handleTooltipClose = useCallback(() => {
    setTooltip(null);
  }, []);

  const handlePeriodValueChange = useCallback((v: string) => {
    setPeriodValue(v);
    setTooltip(null);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filterSection}>
          <TabSwitcher value={txType} onChange={handleTxTypeChange} />
          <View style={styles.spacer} />
          <PeriodFilter value={periodType} onChange={handlePeriodTypeChange} />
        </View>

        <PeriodValueSelector
          options={resolvedOptions}
          periodType={periodType}
          value={effectiveValue}
          onChange={handlePeriodValueChange}
        />

        <Animated.View
          ref={chartRef}
          collapsable={false}
          style={[styles.chartSection, { transform: [{ translateX: slideAnim }] }]}
          {...panResponder.panHandlers}
        >
          {isLoading ? (
            <View style={styles.loadingState}>
              <View style={styles.skeleton}>
                <ActivityIndicator size="large" color={Colors.black} />
              </View>
            </View>
          ) : categories.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="chart-donut-variant" size={48} color={Colors.gray} />
              <Text style={styles.emptyText}>Belum ada transaksi di periode ini</Text>
            </View>
          ) : (
            <CustomDonutChart
              data={categories}
              total={total}
              type={txType}
              onSliceTap={handleSliceTap}
            />
          )}
        </Animated.View>

        {!isLoading && categories.length > 0 && (
          <View style={styles.listSection}>
            {categories.map((cat) => (
              <CategoryProgressBar key={cat.id} category={cat} />
            ))}
          </View>
        )}
      </ScrollView>

      {tooltip && (
        <CategoryTooltip
          category={tooltip.category}
          x={tooltip.x}
          y={tooltip.y}
          onClose={handleTooltipClose}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  filterSection: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  spacer: {
    height: Spacing.two,
  },
  chartSection: {
    marginBottom: Spacing.three,
  },
  loadingState: {
    height: 260,
    justifyContent: "center",
    alignItems: "center",
  },
  skeleton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.grayLight,
  },
  emptyState: {
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gray,
  },
  listSection: {
    paddingHorizontal: Spacing.pageX,
  },
});
