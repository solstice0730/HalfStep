import { env } from "@/config/env";

export type ApiErrorKind = "network" | "auth" | "validation" | "notFound" | "server" | "timeout" | "malformed";

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
  method?: "GET" | "POST";
  accessToken: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return `${env.apiBaseUrl}${path}${params.length ? `?${params.join("&")}` : ""}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions): Promise<{ data: T; meta?: ApiMeta }> {
  const { method = "GET", accessToken, body, query, timeoutMs = 15000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
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
  if (response.status === 404) {
    throw new ApiRequestError("notFound", "요청한 정보를 찾을 수 없습니다.");
  }
  if (response.status === 422 || response.status === 400) {
    throw new ApiRequestError("validation", "입력값을 확인해 주세요.");
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
