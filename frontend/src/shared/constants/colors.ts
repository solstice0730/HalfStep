// Hyo (feature/home-ui-hyo) 팔레트를 앱 전역 기준으로 채택.
// success만 원래 값 유지: Hyo의 success(#D86F8A)는 accent/primary와 같은 핑크 계열이라
// "성공" 의미가 시각적으로 구분되지 않아 접근성/의미 전달을 해침.
export const colors = {
  background: "#F7F5F2",
  surface: "#FFFFFF",
  surfaceSoft: "#FFF1EC",
  primary: "#ECA5AF",
  primaryDark: "#2F2926",
  secondary: "#6F625C",
  accent: "#ECA5AF",
  blueSoft: "#EFF6F8",
  peachSoft: "#FFF1EC",
  greenSoft: "#EEF7F1",
  lavenderSoft: "#F4F1FA",
  text: "#2F2926",
  textMuted: "#756A64",
  border: "#E5DED8",
  success: "#6BAB64",
  warning: "#D6A04D",
  danger: "#D96B62"
} as const;
