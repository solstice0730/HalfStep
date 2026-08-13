import * as AuthSession from "expo-auth-session";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";

import { env } from "@/config/env";
import {
  resolveOAuthRedirectUris,
  resolveOAuthRuntime
} from "@/features/auth/services/oauthRuntime";
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
  const webRedirectUri = useMemo(
    () => AuthSession.makeRedirectUri({ path: "login" }),
    []
  );
  const runtime = useMemo(
    () =>
      resolveOAuthRuntime({
        isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
        platform: Platform.OS,
        webRedirectUri
      }),
    [webRedirectUri]
  );
  const redirectUris = useMemo(
    () =>
      resolveOAuthRedirectUris({
        apiBaseUrl: env.apiBaseUrl,
        appRedirectUri: runtime.redirectUri,
        platform: Platform.OS,
        provider
      }),
    [provider, runtime.redirectUri]
  );
  const discovery = useMemo(
    () => ({
      authorizationEndpoint: config.authorizationEndpoint
    }),
    [config.authorizationEndpoint]
  );

  const [request, authResponse, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.clientId,
      redirectUri: redirectUris.authorizationRedirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: config.scopes,
      usePKCE: config.usePKCE
    },
    discovery
  );
  const [relayResponse, setRelayResponse] = useState<typeof authResponse>(null);
  const response = redirectUris.usesRelay ? relayResponse : authResponse;

  const promptOAuthAsync = useCallback(async () => {
    if (!redirectUris.usesRelay) {
      return promptAsync();
    }
    if (!request) {
      return null;
    }

    const authorizationUrl = await request.makeAuthUrlAsync(discovery);
    const browserResult = await WebBrowser.openAuthSessionAsync(
      authorizationUrl,
      redirectUris.returnUri
    );
    const nextResponse =
      browserResult.type === "success"
        ? request.parseReturnUrl(browserResult.url)
        : ({ type: browserResult.type } as AuthSession.AuthSessionResult);
    setRelayResponse(nextResponse);
    return nextResponse;
  }, [discovery, promptAsync, redirectUris, request]);

  const getAuthorizationCode = useCallback(() => {
    if (response?.type !== "success" || !response.params.code) {
      return null;
    }
    return {
      code: response.params.code,
      codeVerifier: request?.codeVerifier,
      redirectUri: redirectUris.authorizationRedirectUri
    };
  }, [redirectUris.authorizationRedirectUri, request?.codeVerifier, response]);

  return {
    canStart: Boolean(config.clientId && request && runtime.supported),
    getAuthorizationCode,
    promptAsync: promptOAuthAsync,
    response,
    unavailableReason: runtime.unavailableReason
  };
}
