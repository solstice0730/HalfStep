export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api",
  demoBabyId: Number(process.env.EXPO_PUBLIC_DEMO_BABY_ID ?? "1"),
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "",
  naverClientId: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? ""
} as const;
