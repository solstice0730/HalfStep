import { env } from "@/config/env";

export type ApiErrorKind = "network" | "auth" | "validation" | "notFound" | "server" | "timeout" | "malformed" | "unavailable";

export class ApiRequestError extends Error {
  kind: ApiErrorKind;

  constructor(kind: ApiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface ApiMeta {
  cursor: string | null;
  hasNext: boolean;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken: string;
  body?: unknown | FormData;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

let authFailureHandler: (() => void | Promise<void>) | null = null;

export function setAuthFailureHandler(handler: (() => void | Promise<void>) | null) {
  authFailureHandler = handler;
}

export function notifyAuthFailure() {
  void authFailureHandler?.();
}

// --- access token 자동 갱신 -------------------------------------------------------------
// 화면들은 useAuth()에서 받은 accessToken을 클로저로 들고 있어 갱신 직후에도 옛 토큰을 넘길 수 있다.
// 그래서 "옛 토큰 → 새 토큰" 매핑을 기억해 두고 요청 직전에 최신 토큰으로 바꿔 쓴다.
type TokenRefreshHandler = (staleAccessToken: string) => Promise<string | null>;

let tokenRefreshHandler: TokenRefreshHandler | null = null;
let inflightRefresh: Promise<string | null> | null = null;
const rotatedTokens = new Map<string, string>();

export function setTokenRefreshHandler(handler: TokenRefreshHandler | null) {
  tokenRefreshHandler = handler;
  if (!handler) rotatedTokens.clear();
}

export function resolveAccessToken(token: string): string {
  let current = token;
  for (let hops = 0; hops < 8 && rotatedTokens.has(current); hops += 1) {
    current = rotatedTokens.get(current)!;
  }
  return current;
}

async function refreshAccessToken(staleToken: string): Promise<string | null> {
  const latest = resolveAccessToken(staleToken);
  if (latest !== staleToken) return latest;
  if (!tokenRefreshHandler) return null;
  if (!inflightRefresh) {
    inflightRefresh = tokenRefreshHandler(staleToken).finally(() => {
      inflightRefresh = null;
    });
  }
  const fresh = await inflightRefresh;
  if (fresh && fresh !== staleToken) rotatedTokens.set(staleToken, fresh);
  return fresh;
}

function withBearer(init: RequestInit, token: string): RequestInit {
  return { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` } };
}

/** 인증 fetch. 401이면 refresh token으로 한 번 갱신해 재시도하고, 그래도 401이면 로그아웃 핸들러를 부른다. */
export async function fetchWithAuth(url: string, init: RequestInit, accessToken: string): Promise<Response> {
  const token = resolveAccessToken(accessToken);
  let response = await fetch(url, withBearer(init, token));
  if (response.status !== 401) return response;

  const fresh = await refreshAccessToken(token);
  if (fresh) {
    response = await fetch(url, withBearer(init, fresh));
  }
  if (response.status === 401) notifyAuthFailure();
  return response;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return `${env.apiBaseUrl}${path}${params.length ? `?${params.join("&")}` : ""}`;
}

export async function readErrorDetail(response: Response): Promise<string | null> {
  try {
    const payload = (await response.clone().json()) as { detail?: unknown };
    return typeof payload.detail === "string" && payload.detail ? payload.detail : null;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions): Promise<{ data: T; meta?: ApiMeta }> {
  const { method = "GET", accessToken, body, query, timeoutMs = 15000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  const isMultipart = typeof FormData !== "undefined" && body instanceof FormData;
  try {
    response = await fetchWithAuth(
      buildUrl(path, query),
      {
        method,
        headers: isMultipart ? {} : { "Content-Type": "application/json" },
        body: body !== undefined ? (isMultipart ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal
      },
      accessToken
    );
  } catch {
    if (controller.signal.aborted) {
      throw new ApiRequestError("timeout", "요청 시간이 초과되었습니다.");
    }
    throw new ApiRequestError("network", "네트워크 연결을 확인해 주세요.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    throw new ApiRequestError("auth", "인증이 만료되었습니다.");
  }
  if (response.status === 403) {
    throw new ApiRequestError("validation", (await readErrorDetail(response)) ?? "권한이 없습니다.");
  }
  if (response.status === 404) {
    throw new ApiRequestError("notFound", "요청한 정보를 찾을 수 없습니다.");
  }
  if (response.status === 422 || response.status === 400) {
    throw new ApiRequestError("validation", "입력값을 확인해 주세요.");
  }
  if (response.status === 503) {
    throw new ApiRequestError("unavailable", (await readErrorDetail(response)) ?? "잠시 후 다시 시도해 주세요.");
  }
  if (response.status >= 500) {
    throw new ApiRequestError("server", "서버에 문제가 발생했습니다.");
  }
  if (!response.ok) {
    throw new ApiRequestError("server", "요청을 처리하지 못했습니다.");
  }

  try {
    const payload = (await response.json()) as ApiEnvelope<T>;
    return { data: payload.data, meta: payload.meta };
  } catch {
    throw new ApiRequestError("malformed", "응답을 처리하지 못했습니다.");
  }
}
