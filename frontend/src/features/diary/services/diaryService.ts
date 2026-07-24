import type { CreateDiaryInput, SavedDiary, UpdateDiaryInput } from "@/features/diary/types/diary";
import { apiRequest } from "@/services/api/apiClient";

export async function saveDiary(accessToken: string, input: CreateDiaryInput): Promise<SavedDiary> {
  const { data } = await apiRequest<SavedDiary>("/diary", {
    method: "POST",
    accessToken,
    body: input
  });
  return data;
}

export async function getDiaryByDate(
  accessToken: string,
  babyId: number,
  date: string
): Promise<SavedDiary | null> {
  const { data } = await apiRequest<SavedDiary | null>("/diary", {
    accessToken,
    query: { babyId, date }
  });
  return data;
}

export async function getDiaryById(accessToken: string, diaryId: number): Promise<SavedDiary> {
  const { data } = await apiRequest<SavedDiary>(`/diary/${diaryId}`, { accessToken });
  return data;
}

export async function updateDiary(
  accessToken: string,
  diaryId: number,
  input: UpdateDiaryInput
): Promise<SavedDiary> {
  const { data } = await apiRequest<SavedDiary>(`/diary/${diaryId}`, {
    method: "PUT",
    accessToken,
    body: input
  });
  return data;
}

export async function deleteDiary(accessToken: string, diaryId: number): Promise<void> {
  await apiRequest<null>(`/diary/${diaryId}`, { method: "DELETE", accessToken });
}
