import { Platform } from "react-native";

// Apple Human Interface Guidelines의 SF Pro 텍스트 스타일 스케일을 React Native 값으로 옮긴 것.
// iOS는 시스템 폰트(San Francisco)를 기본으로 사용하고, Android/웹은 각 플랫폼 기본 산세리프로
// 대체된다 (별도 폰트 파일을 번들하지 않음).
const systemFontWeight = Platform.select({ ios: "600", default: "700" }) as "600" | "700";

export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700" as const, letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "700" as const, letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700" as const, letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: "600" as const, letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: systemFontWeight, letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400" as const, letterSpacing: -0.41 },
  bodyEmphasized: { fontSize: 17, lineHeight: 22, fontWeight: "600" as const, letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400" as const, letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: "400" as const, letterSpacing: -0.24 },
  subheadEmphasized: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const, letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400" as const, letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const, letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: "500" as const, letterSpacing: 0.07 }
} as const;

export type TypographyToken = keyof typeof typography;
