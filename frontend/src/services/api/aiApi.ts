import { env } from "@/config/env";
import type { DiaryGenerationRequest, DiaryGenerationResponse } from "@/features/records/types/records";

export type AiErrorKind = "network" | "auth" | "validation" | "server" | "timeout" | "malformed";

export class AiRequestError extends Error {
  kind: AiErrorKind;

  constructor(kind: AiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export type DailySummaryResult = {
  summary: string;
  highlights: string[];
  safetyNotice: string;
  source: "ai" | "fallback";
  recordCount: number;
};

export type AskResult = {
  answer: string;
  safetyNotice: string;
  isMedicalRestricted: boolean;
  source: "ai" | "fallback" | "restricted" | "no_data";
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export async function fetchDailySummary(
  accessToken: string,
  babyId: string,
  date: string
): Promise<DailySummaryResult> {
  const response = await fetch(`${env.apiBaseUrl}/ai/daily-summary`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ babyId, date })
  });

  if (!response.ok) {
    throw new Error("하루 요약을 불러오지 못했습니다.");
  }

  const payload = (await response.json()) as ApiEnvelope<DailySummaryResult>;
  return payload.data;
}

export async function askAiQuestion(
  accessToken: string,
  babyId: string,
  date: string,
  question: string
): Promise<AskResult> {
  const response = await fetch(`${env.apiBaseUrl}/ai/ask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ babyId, date, question })
  });

  if (!response.ok) {
    throw new Error("답변을 가져오지 못했습니다.");
  }

  const payload = (await response.json()) as ApiEnvelope<AskResult>;
  return payload.data;
}

const DIARY_GENERATE_TIMEOUT_MS = 20000;

export async function generateDiary(
  accessToken: string,
  request: DiaryGenerationRequest
): Promise<DiaryGenerationResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DIARY_GENERATE_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}/ai/diary/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
  } catch {
    if (controller.signal.aborted) {
      throw new AiRequestError("timeout", "요청 시간이 초과되었습니다.");
    }
    throw new AiRequestError("network", "네트워크 연결을 확인해 주세요.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401) {
    throw new AiRequestError("auth", "인증이 만료되었습니다.");
  }
  if (response.status === 422) {
    throw new AiRequestError("validation", "입력값을 확인해 주세요.");
  }
  if (response.status === 500 || response.status === 502) {
    throw new AiRequestError("server", "AI 서비스에 문제가 발생했습니다.");
  }
  if (!response.ok) {
    throw new AiRequestError("server", "육아일기를 생성하지 못했습니다.");
  }

  let payload: ApiEnvelope<DiaryGenerationResponse>;
  try {
    payload = (await response.json()) as ApiEnvelope<DiaryGenerationResponse>;
  } catch {
    throw new AiRequestError("malformed", "응답을 처리하지 못했습니다.");
  }

  const data = payload?.data;
  if (!data || typeof data.title !== "string" || typeof data.content !== "string" || !Array.isArray(data.highlights)) {
    throw new AiRequestError("malformed", "응답 형식이 올바르지 않습니다.");
  }

  return data;
}
