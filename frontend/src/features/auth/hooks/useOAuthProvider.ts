import * as AuthSession from "expo-auth-session";
import { useCallback, useMemo } from "react";

import { env } from "@/config/env";
import type { OAuthProvider } from "@/features/auth/types/auth";

type OAuthProviderConfig = {
  authorizationEndpoint: string;
  clientId: string;
  scopes?: string[];
  usePKCE: boolean;
};

const providerConfigs: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: env.googleClientId,
    scopes: ["openid", "profile", "email"],
    usePKCE: true
  },
  kakao: {
    authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
    clientId: env.kakaoRestApiKey,
    usePKCE: true
  },
  naver: {
    authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
    clientId: env.naverClientId,
    usePKCE: false
  }
};

export function useOAuthProvider(provider: OAuthProvider) {
  const config = providerConfigs[provider];
  const redirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ path: "login", scheme: "halfstep" }),
    []
  );
  const discovery = useMemo(
    () => ({
      authorizationEndpoint: config.authorizationEndpoint
    }),
    [config.authorizationEndpoint]
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: config.scopes,
      usePKCE: config.usePKCE
    },
    discovery
  );

  const getAuthorizationCode = useCallback(() => {
    if (response?.type !== "success" || !response.params.code) {
      return null;
    }
    return {
      code: response.params.code,
      codeVerifier: request?.codeVerifier,
      redirectUri
    };
  }, [redirectUri, request?.codeVerifier, response]);

  return {
    canStart: Boolean(config.clientId && request),
    getAuthorizationCode,
    promptAsync,
    response
  };
}
