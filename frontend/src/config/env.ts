const bundledApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
let demoApiBaseUrl: string | null = null;

export function demoApiUrlForHost(value: string): string | null {
  const host = value.trim();
  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
      || octets.some((octet) => octet < 0 || octet > 255)) return null;
  const privateHost = octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
  return privateHost ? `http://${host}:8000/api` : null;
}

export function setDemoApiHost(host: string): boolean {
  const url = demoApiUrlForHost(host);
  if (!url) return false;
  demoApiBaseUrl = url;
  return true;
}

export const env = {
  get apiBaseUrl() { return demoApiBaseUrl ?? bundledApiBaseUrl; },
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  kakaoRestApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? "",
  naverClientId: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? "",
  // 외부 테스터용 빌드(__DEV__=false)에서도 개발용 테스트 로그인을 보이게 한다. 백엔드 OAUTH_DEV_TOKENS_ENABLED와 함께 켠다.
  enableDevLogin: process.env.EXPO_PUBLIC_ENABLE_DEV_LOGIN === "true"
} as const;
