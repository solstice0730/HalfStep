import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors } from "@/shared/constants/colors";

// 화면 전체에 깔리는 은은한 그라디언트. 글래스 표면(BlurView)이 blur할 배경에 깊이감을 주기
// 위한 용도라, 절대 위치로 화면 뒤에 한 번만 깔고 그 위에 스크롤 콘텐츠를 올린다.
export function GradientBackdrop() {
  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.background, colors.backgroundBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
