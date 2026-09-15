import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView, type BlurTint } from "expo-blur";

import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";

type GlassSurfaceProps = PropsWithChildren<{
  /** 바깥 레이어: 마진, 너비, 그림자 등 레이아웃에 관여. */
  style?: StyleProp<ViewStyle>;
  /** 안쪽 레이어: 패딩/정렬 등 콘텐츠 배치. 기본값은 spacing.lg 패딩. */
  contentStyle?: StyleProp<ViewStyle>;
  /** BlurView intensity, 1-100. @default 40 */
  intensity?: number;
  tint?: BlurTint;
  radius?: number;
  /** 다크 배경(카메라, 모달 스크림) 위에 올릴 때 true. 테두리/틴트 톤이 반전된다. */
  onDark?: boolean;
  /** 그림자 없이 평평하게 (탭바처럼 자체 그림자를 별도로 그릴 때). */
  noShadow?: boolean;
}>;

// Apple HIG의 "Material" 개념을 흉내 낸 유리 표면: 실제 배경 블러 위에 옅은 반투명 틴트와
// 하이라이트 보더를 더해 카드/시트/탭바 등에서 재사용한다.
export function GlassSurface({
  children,
  style,
  contentStyle,
  intensity = 40,
  tint = "light",
  radius = theme.radius.lg,
  onDark = false,
  noShadow = false
}: GlassSurfaceProps) {
  return (
    <View style={[{ borderRadius: radius }, !noShadow && styles.shadow, style]}>
      <View style={[styles.clip, { borderRadius: radius }]}>
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: onDark ? colors.glassOnDark : colors.glass,
              borderColor: onDark ? colors.glassOnDarkBorder : colors.glassBorder,
              borderWidth: StyleSheet.hairlineWidth * 1.5,
              borderRadius: radius
            }
          ]}
        />
        <View style={[styles.defaultContent, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: colors.glassShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 6
  },
  clip: {
    overflow: "hidden"
  },
  defaultContent: {
    padding: theme.spacing.lg
  }
});
