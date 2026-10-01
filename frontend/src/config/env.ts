export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api",
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "",
  naverClientId: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? "",
  // 외부 테스터용 빌드(__DEV__=false)에서도 개발용 테스트 로그인을 보이게 한다. 백엔드 OAUTH_DEV_TOKENS_ENABLED와 함께 켠다.
  enableDevLogin: process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === "true"
} as const;
