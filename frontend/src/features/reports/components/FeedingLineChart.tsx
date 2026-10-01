import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { colors } from "@/shared/constants/colors";

interface FeedingLineChartProps {
  points: { date: string; totalMl: number }[];
  height?: number;
}

const PADDING_X = 14;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 26;
const LINE_COLOR = "#E98AA3";

const dayLabel = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

// 영상 07의 일별 수유량 라인 차트: 부드러운 곡선 + 아래 면 그라디언트 + 점.
export function FeedingLineChart({ points, height = 150 }: FeedingLineChartProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const max = Math.max(1, ...points.map((point) => point.totalMl));
  const min = Math.min(...points.map((point) => point.totalMl), max);
  const range = Math.max(1, max - min);
  const innerWidth = Math.max(0, width - PADDING_X * 2);
  const innerHeight = height - PADDING_TOP - PADDING_BOTTOM;
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: PADDING_X + stepX * index,
    y: PADDING_TOP + innerHeight - ((point.totalMl - min) / range) * innerHeight * 0.85 - innerHeight * 0.05
  }));

  const linePath = coords.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = coords[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${PADDING_TOP + innerHeight} L ${coords[0].x} ${PADDING_TOP + innerHeight} Z`
      : "";

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && coords.length > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="feedingArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={LINE_COLOR} stopOpacity={0.35} />
              <Stop offset="1" stopColor={LINE_COLOR} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#feedingArea)" />
          <Path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={3} strokeLinecap="round" />
          {coords.map((point, index) => (
            <Circle key={points[index].date} cx={point.x} cy={point.y} r={4.5} fill="#FFFFFF" stroke={LINE_COLOR} strokeWidth={2.5} />
          ))}
        </Svg>
      )}
      <View style={styles.labels}>
        {points.map((point) => (
          <Text key={point.date} style={styles.label}>{dayLabel(point.date)}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 4,
    position: "absolute",
    right: 4
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700"
  }
});
