import { apiRequest } from "@/services/api/apiClient";

// backend/app/services/baby_service.py get_dashboard() 응답.
export interface HomeTodaySummary {
  feedingCount: number;
  sleepCount: number;
  sleepTotalMinutes: number;
  urineCount: number;
  stoolCount: number;
  lastFeedingAt: string | null;
  lastSleepAt: string | null;
  feedingTotalMl: number;
  lastFeedingIntervalMinutes: number | null;
  photoCount: number;
  diarySaved: boolean;
}

export interface HomeCuration {
  headline: string;
  text: string;
  chips: string[];
  basis: string[];
}

export interface HomeDashboard {
  baby: { id: number; name: string; ageInDays: number; ageInMonths: number };
  todaySummary: HomeTodaySummary;
  curation: HomeCuration;
}

export const DEFAULT_CURATION: HomeCuration = {
  headline: "오늘의 맞춤 큐레이션",
  text: "이 시기에는 수유 텀과 낮잠 리듬이 조금씩 달라져요. 오늘은 수유 간격, 낮잠 길이, 배변 변화를 같이 확인해보세요.",
  chips: ["수유 신호", "낮잠 루틴", "배변 체크"],
  basis: []
};

export async function getDashboard(accessToken: string, babyId: number): Promise<HomeDashboard> {
  const { data } = await apiRequest<HomeDashboard>("/home/dashboard", { accessToken, query: { babyId } });
  return data;
}
