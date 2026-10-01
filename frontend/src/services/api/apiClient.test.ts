import assert from "node:assert/strict";
import test from "node:test";

import { fetchWithAuth, resolveAccessToken, setAuthFailureHandler, setTokenRefreshHandler } from "./apiClient";

type FetchCall = { url: string; auth: string | undefined };

function installFetch(handler: (call: FetchCall, index: number) => Response) {
  const calls: FetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call = { url: String(input), auth: headers.Authorization };
    calls.push(call);
    return handler(call, calls.length - 1);
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("401이면 refresh 핸들러로 토큰을 갱신해 한 번 재시도한다", async () => {
  let refreshCount = 0;
  setTokenRefreshHandler(async (stale) => {
    refreshCount += 1;
    return `${stale}-fresh`;
  });
  const { calls, restore } = installFetch((call) => new Response("{}", { status: call.auth === "Bearer old-fresh" ? 200 : 401 }));
  try {
    const response = await fetchWithAuth("http://api/x", { method: "GET" }, "old");
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map((call) => call.auth), ["Bearer old", "Bearer old-fresh"]);
    assert.equal(refreshCount, 1);
    // 이후 요청은 옛 토큰을 넘겨도 최신 토큰으로 바꿔 보낸다.
    assert.equal(resolveAccessToken("old"), "old-fresh");
    await fetchWithAuth("http://api/y", { method: "GET" }, "old");
    assert.equal(calls[2].auth, "Bearer old-fresh");
    assert.equal(refreshCount, 1);
  } finally {
    restore();
    setTokenRefreshHandler(null);
  }
});

test("갱신에 실패하면 로그아웃 핸들러를 부른다", async () => {
  let failures = 0;
  setTokenRefreshHandler(async () => null);
  setAuthFailureHandler(() => { failures += 1; });
  const { calls, restore } = installFetch(() => new Response("{}", { status: 401 }));
  try {
    const response = await fetchWithAuth("http://api/x", { method: "GET" }, "dead");
    assert.equal(response.status, 401);
    assert.equal(calls.length, 1);
    assert.equal(failures, 1);
  } finally {
    restore();
    setTokenRefreshHandler(null);
    setAuthFailureHandler(null);
  }
});
