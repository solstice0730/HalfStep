import { env } from "@/config/env";
import type { CareRecord, RecordCreateBody, RecordType } from "@/features/records/types/records";

type ListResponse = { success: boolean; data: CareRecord[] };
type CreateResponse = { success: boolean; data: CareRecord };

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) throw new Error(response.status === 401 ? "로그인이 만료되었습니다." : "기록 요청에 실패했습니다.");
  return response.json() as Promise<T>;
}

export async function listRecords(accessToken: string, babyId: number, date: string, type?: RecordType) {
  const params = new URLSearchParams({ babyId: String(babyId), date });
  if (type) params.set("type", type);
  return (await request<ListResponse>(`/records?${params}`, accessToken)).data;
}

export async function createRecord(accessToken: string, type: RecordType, body: RecordCreateBody) {
  return (await request<CreateResponse>(`/records/${type.toLowerCase()}`, accessToken, {
    method: "POST", body: JSON.stringify(body)
  })).data;
}
