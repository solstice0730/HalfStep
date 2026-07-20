export const env = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api",
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "",
  naverClientId: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? "",
  // 아기 프로필 생성/조회 API(#7)가 붙기 전까지 쓰는 값. #8 댓글에서 팀이 합의한 임시 방식.
  demoBabyId: Number(process.env.EXPO_PUBLIC_DEMO_BABY_ID ?? "1")
} as const;
