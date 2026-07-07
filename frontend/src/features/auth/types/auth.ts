export type OAuthProvider = "google" | "kakao" | "naver";

export type AuthUser = {
  id: string;
  nickname: string | null;
  email: string | null;
  provider: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};
