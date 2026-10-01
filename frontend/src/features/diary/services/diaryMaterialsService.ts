import { apiRequest } from "@/services/api/apiClient";

export type DiaryMaterialSource = "CHAT" | "MEMO";

export interface DiaryMaterial {
  id: number;
  babyId: number;
  date: string;
  source: DiaryMaterialSource;
  content: string;
  createdAt: string;
}

export interface DiaryMaterialList {
  items: DiaryMaterial[];
  counts: { chat: number; memo: number };
}

export async function listDiaryMaterials(accessToken: string, babyId: number, date: string): Promise<DiaryMaterialList> {
  const { data } = await apiRequest<DiaryMaterialList>("/diary/materials", { accessToken, query: { babyId, date } });
  return data;
}

export async function addDiaryMaterial(
  accessToken: string,
  input: { babyId: number; date: string; source: DiaryMaterialSource; content: string }
): Promise<DiaryMaterial> {
  const { data } = await apiRequest<DiaryMaterial>("/diary/materials", { method: "POST", accessToken, body: input });
  return data;
}

export async function removeDiaryMaterial(accessToken: string, materialId: number): Promise<void> {
  await apiRequest<null>(`/diary/materials/${materialId}`, { method: "DELETE", accessToken });
}

/** 보호자 메모를 날짜당 1개로 저장한다. 빈 문자열이면 삭제되고 null이 돌아온다. */
export async function upsertMemoMaterial(
  accessToken: string,
  input: { babyId: number; date: string; content: string }
): Promise<DiaryMaterial | null> {
  const { data } = await apiRequest<DiaryMaterial | null>("/diary/materials/memo", { method: "PUT", accessToken, body: input });
  return data;
}

/** 채팅 한 턴을 일기 재료 본문으로 직렬화한다. 백엔드 프롬프트는 이 형태를 참고 정보로 읽는다. */
export function formatChatMaterial(question: string, answer: string): string {
  return `Q: ${question.trim()}\nA: ${answer.trim()}`;
}
