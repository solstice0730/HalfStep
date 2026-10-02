import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { colors } from "@/shared/constants/colors";

type BlobProps = {
  size: number;
  color: string;
  opacity: number;
  gradientId: string;
  style: ViewStyle;
};

// 가장자리가 자연스럽게 사라지는 컬러 블롭. CSS filter: blur 대신 RadialGradient로
// 웹/iOS/Android 모두에서 동일하게 부드러운 빛번짐을 만든다.
function Blob({ size, color, opacity, gradientId, style }: BlobProps) {
  return (
    <View style={[styles.blob, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

// 화면 전체에 깔리는 그라디언트 + 컬러 블롭. 글래스 표면(BlurView)이 blur할 배경에
// 색 변화를 줘야 유리 질감이 살아나므로, 절대 위치로 한 번만 깔고 그 위에 콘텐츠를 올린다.
export function GradientBackdrop() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <LinearGradient
        colors={[colors.backgroundTop, colors.background, colors.backgroundBottom]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Blob gradientId="blobPink" size={360} color="#ECA5AF" opacity={0.55} style={{ top: "8%", left: -140 }} />
      <Blob gradientId="blobPinkRight" size={340} color="#F2B6BF" opacity={0.5} style={{ top: "34%", right: -140 }} />
      <Blob gradientId="blobPeach" size={320} color="#F4C9CE" opacity={0.55} style={{ bottom: "6%", left: -40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    overflow: "hidden",
    pointerEvents: "none"
  },
  blob: {
    position: "absolute"
  }
});
