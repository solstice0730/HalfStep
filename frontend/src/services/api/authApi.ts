import { env } from "@/config/env";
import type { AuthSession, OAuthProvider } from "@/features/auth/types/auth";

type SocialLoginResponse = {
  success: boolean;
  data: AuthSession & { isNewUser: boolean };
};

export async function socialLogin(provider: OAuthProvider, providerAccessToken: string): Promise<AuthSession> {
  const response = await fetch(`${env.apiBaseUrl}/auth/social`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      provider,
      accessToken: providerAccessToken
    })
  });

  if (!response.ok) {
    throw new Error("소셜 로그인에 실패했습니다.");
  }

  const payload = (await response.json()) as SocialLoginResponse;
  return {
    accessToken: payload.data.accessToken,
    refreshToken: payload.data.refreshToken,
    user: payload.data.user
  };
}

export async function socialLoginWithCode(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<AuthSession> {
  const response = await fetch(`${env.apiBaseUrl}/auth/social/code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      provider,
      code,
      redirectUri,
      codeVerifier
    })
  });

  if (!response.ok) {
    throw new Error("소셜 로그인에 실패했습니다.");
  }

  const payload = (await response.json()) as SocialLoginResponse;
  return {
    accessToken: payload.data.accessToken,
    refreshToken: payload.data.refreshToken,
    user: payload.data.user
  };
}

export async function logout(accessToken: string, refreshToken: string): Promise<void> {
  const response = await fetch(`${env.apiBaseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    throw new Error("로그아웃에 실패했습니다.");
  }
}
