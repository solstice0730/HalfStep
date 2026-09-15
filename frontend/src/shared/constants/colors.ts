// Apple HIG 스타일 팔레트: 은은한 블러시 그라디언트 배경 위에 반투명 "글래스" 표면을 올리는
// 구조. Hyo(feature/home-ui-hyo) 팔레트의 브랜드 컬러(primary/accent 핑크)는 그대로 유지하고,
// surface/border를 유리 질감에 맞게 재정의했다.
// success만 원래 값 유지: success(#D86F8A)는 accent/primary와 같은 핑크 계열이라
// "성공" 의미가 시각적으로 구분되지 않아 접근성/의미 전달을 해침.
export const colors = {
  // 배경: 단색 대신 위/아래 두 톤을 두어 GradientBackdrop에서 부드러운 대각선 그라디언트로 사용.
  background: "#F7F1EC",
  backgroundTop: "#FDF2ED",
  backgroundBottom: "#F1E9E9",
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
  // 헤어라인 보더: 반투명 다크를 사용해 유리 표면/불투명 표면 어디서나 은은하게 보이도록 함.
  border: "rgba(47,41,38,0.09)",
  success: "#6BAB64",
  warning: "#D6A04D",
  danger: "#D96B62",

  // --- Glassmorphism 전용 토큰 ---
  // 실제 블러(BlurView) 위에 얹는 반투명 표면. tint="light" 블러와 함께 사용.
  glass: "rgba(255,255,255,0.5)",
  glassStrong: "rgba(255,255,255,0.68)",
  glassSubtle: "rgba(255,255,255,0.32)",
  glassBorder: "rgba(255,255,255,0.6)",
  glassHighlight: "rgba(255,255,255,0.9)",
  glassShadow: "rgba(47,41,38,0.18)",
  // 다크 표면(카메라 등) 위에서 쓰는 글래스 톤.
  glassOnDark: "rgba(20,16,15,0.38)",
  glassOnDarkBorder: "rgba(255,255,255,0.22)",
  overlay: "rgba(32,26,23,0.45)"
} as const;
