type OAuthRuntimeInput = {
  isExpoGo: boolean;
  platform: string;
  webRedirectUri: string;
};

type OAuthRuntime = {
  redirectUri: string;
  supported: boolean;
  unavailableReason: string | null;
};

type OAuthRedirectUrisInput = {
  apiBaseUrl: string;
  appRedirectUri: string;
  platform: string;
  provider: string;
};

type OAuthRedirectUris = {
  authorizationRedirectUri: string;
  returnUri: string;
  usesRelay: boolean;
};

const NATIVE_REDIRECT_URI = "halfstep://login";
const EXPO_GO_UNAVAILABLE_REASON =
  "실제 OAuth 로그인은 HalfStep 개발 빌드에서 사용할 수 있습니다.";

export function resolveOAuthRuntime(input: OAuthRuntimeInput): OAuthRuntime {
  if (input.platform === "web") {
    return {
      redirectUri: input.webRedirectUri,
      supported: true,
      unavailableReason: null
    };
  }

  if (input.isExpoGo) {
    return {
      redirectUri: NATIVE_REDIRECT_URI,
      supported: false,
      unavailableReason: EXPO_GO_UNAVAILABLE_REASON
    };
  }

  return {
    redirectUri: NATIVE_REDIRECT_URI,
    supported: true,
    unavailableReason: null
  };
}

export function resolveOAuthRedirectUris(input: OAuthRedirectUrisInput): OAuthRedirectUris {
  if (input.provider !== "kakao" || input.platform === "web") {
    return {
      authorizationRedirectUri: input.appRedirectUri,
      returnUri: input.appRedirectUri,
      usesRelay: false
    };
  }

  return {
    authorizationRedirectUri: `${input.apiBaseUrl.replace(/\/$/, "")}/auth/kakao/callback`,
    returnUri: input.appRedirectUri,
    usesRelay: true
  };
}
