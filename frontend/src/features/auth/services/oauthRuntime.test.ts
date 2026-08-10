import assert from "node:assert/strict";
import test from "node:test";

import { resolveOAuthRedirectUris, resolveOAuthRuntime } from "./oauthRuntime";

test("rejects real OAuth in Expo Go because it cannot own the app callback", () => {
  assert.deepEqual(
    resolveOAuthRuntime({ platform: "ios", isExpoGo: true, webRedirectUri: "https://example.test/login" }),
    {
      redirectUri: "halfstep://login",
      supported: false,
      unavailableReason: "실제 OAuth 로그인은 HalfStep 개발 빌드에서 사용할 수 있습니다."
    }
  );
});

test("uses the stable HalfStep callback in an iOS development build", () => {
  assert.deepEqual(
    resolveOAuthRuntime({ platform: "ios", isExpoGo: false, webRedirectUri: "https://example.test/login" }),
    { redirectUri: "halfstep://login", supported: true, unavailableReason: null }
  );
});

test("keeps the origin callback on web", () => {
  assert.equal(
    resolveOAuthRuntime({ platform: "web", isExpoGo: false, webRedirectUri: "https://example.test/login" }).redirectUri,
    "https://example.test/login"
  );
});

test("routes native Kakao authorization through the HTTPS backend callback", () => {
  assert.deepEqual(
    resolveOAuthRedirectUris({
      apiBaseUrl: "https://api.example.test/api/",
      appRedirectUri: "halfstep://login",
      platform: "ios",
      provider: "kakao"
    }),
    {
      authorizationRedirectUri: "https://api.example.test/api/auth/kakao/callback",
      returnUri: "halfstep://login",
      usesRelay: true
    }
  );
});

test("does not relay the Kakao callback on web", () => {
  assert.deepEqual(
    resolveOAuthRedirectUris({
      apiBaseUrl: "https://api.example.test/api",
      appRedirectUri: "https://app.example.test/login",
      platform: "web",
      provider: "kakao"
    }),
    {
      authorizationRedirectUri: "https://app.example.test/login",
      returnUri: "https://app.example.test/login",
      usesRelay: false
    }
  );
});
