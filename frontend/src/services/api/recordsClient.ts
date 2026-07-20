import type {
  CareRecord,
  RecordCreateBody,
  RecordListQuery,
  RecordListResult,
  RecordType
} from "../../features/records/types/records.ts";

type FetchImplementation = (input: string, init?: RequestInit) => Promise<Response>;
type ListResponse = { success: boolean; data: CareRecord[]; meta: { cursor: string | null; hasNext: boolean } };
type CreateResponse = { success: boolean; data: CareRecord };

export class RecordsApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RecordsApiError";
    this.status = status;
  }
}

export function createRecordsClient(baseUrl: string, fetchImpl: FetchImplementation = fetch) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
    if (!response.ok) {
      const message = response.status === 401 ? "로그인이 만료되었습니다." : "기록 요청에 실패했습니다.";
      throw new RecordsApiError(message, response.status);
    }
    return response.json() as Promise<T>;
  }

  return {
    async list(accessToken: string, query: RecordListQuery): Promise<RecordListResult> {
      const params = new URLSearchParams({ babyId: String(query.babyId), date: query.date });
      if (query.type) params.set("type", query.type);
      if (query.cursor) params.set("cursor", query.cursor);
      if (query.limit !== undefined) params.set("limit", String(query.limit));
      const response = await request<ListResponse>(`/records?${params.toString()}`, accessToken);
      return { records: response.data, cursor: response.meta.cursor, hasNext: response.meta.hasNext };
    },

    async create(accessToken: string, type: RecordType, body: RecordCreateBody): Promise<CareRecord> {
      const response = await request<CreateResponse>(`/records/${type.toLowerCase()}`, accessToken, {
        method: "POST",
        body: JSON.stringify(body)
      });
      return response.data;
    }
  };
}
