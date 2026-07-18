import type { SavedDiary } from "@/features/diary/types/diary";

// ponytail: module-level in-memory mock, same rationale as recordsService — swap for a
// real diary-save API by editing this file only, callers already await these as async.
const store = new Map<string, SavedDiary>();

export async function saveDiary(diary: SavedDiary): Promise<SavedDiary> {
  store.set(diary.date, diary);
  return diary;
}

export async function getDiaryByDate(date: string): Promise<SavedDiary | null> {
  return store.get(date) ?? null;
}

// year-month (1-12) 기준으로 저장된 일지가 있는 날짜(YYYY-MM-DD) 목록을 반환한다.
export async function getDiaryDatesInMonth(year: number, month: number): Promise<string[]> {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return Array.from(store.keys())
    .filter((date) => date.startsWith(prefix))
    .sort();
}
