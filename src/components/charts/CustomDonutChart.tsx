import { useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import Svg, { Path, Circle } from "react-native-svg";
import { Colors, Fonts } from "@/constants/theme";
import type { CategorySummary } from "@/types/grafik";

type Props = {
  data: CategorySummary[];
  total: number;
  type: "expense" | "income";
  onSliceTap: (category: CategorySummary) => void;
};

function formatShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}Jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}Rb`;
  return String(value);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) {
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export function CustomDonutChart({ data, total, type, onSliceTap }: Props) {
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setChartSize({ width, height });
  };

  if (data.length === 0) return <View style={{ height: 260 }} onLayout={handleLayout} />;

  const rawSize = Math.min(chartSize.width || 300, chartSize.height || 300);
  const size = Math.min(rawSize, 220);
  const outerR = size / 2;
  const thickness = 40;
  const innerR = outerR - thickness;
  const prefix = type === "expense" ? "-" : "+";
  const cx = size / 2;
  const cy = size / 2;

  let cumAngle = -90;
  const slices = data.map((d) => {
    const sweep = total > 0 ? (d.amount / total) * 360 : 0;
    const start = cumAngle;
    cumAngle += sweep;
    return { ...d, startAngle: start, sweepAngle: sweep };
  });

  return (
    <View style={{ alignItems: "center", marginVertical: 16 }} onLayout={handleLayout}>
      <View style={{ paddingRight: 4, paddingBottom: 4, position: "relative" }}>
        <View style={[styles.shadow, { width: size, height: size, borderRadius: size / 2 }]} pointerEvents="none" />
        <View style={[styles.chartClip, { width: size, height: size, borderRadius: size / 2 }]}>
          <Pressable style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {slices.length === 1 ? (
                <Circle
                  cx={cx} cy={cy} r={outerR}
                  fill={slices[0].color || Colors.primary}
                  stroke={Colors.black}
                  strokeWidth={2}
                  onPress={() => onSliceTap(slices[0])}
                />
              ) : (
                slices.map((s) => (
                  <Path
                    key={s.id}
                    d={describeArc(cx, cy, outerR, innerR, s.startAngle, s.startAngle + s.sweepAngle)}
                    fill={s.color || Colors.primary}
                    stroke={Colors.black}
                    strokeWidth={2}
                    onPress={() => onSliceTap(s)}
                  />
                ))
              )}
              <Circle cx={cx} cy={cy} r={innerR} fill={Colors.white} stroke={Colors.black} strokeWidth={2} />
            </Svg>
          </Pressable>
          <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center", pointerEvents: "none" }]}>
            <ThemedText style={styles.centerTotal}>{prefix}{formatShort(total)}</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: Colors.black,
  },
  chartClip: {
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: Colors.black,
    overflow: "hidden",
    position: "relative",
  },
  centerTotal: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
