import { env } from "@/config/env";
import { apiRequest } from "@/services/api/apiClient";

export interface CalendarDaySummary {
  date: string;
  hasDiary: boolean;
  thumbnailUrl: string | null;
  recordCount: number;
  recordTypes: string[];
  recordCounts: { feeding: number; sleep: number; urine: number; stool: number };
}

export interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDaySummary[];
}

export interface CalendarTimelineItem {
  id: string;
  type: "FEEDING" | "SLEEP" | "URINE" | "STOOL";
  time: string;
  summary: string;
}

export interface CalendarDay {
  date: string;
  // #19가 아직 캘린더 API에 연결되지 않아 항상 null. 저장된 AI 일지는 로컬 diaryService에서 조회한다.
  diary: unknown | null;
  timeline: CalendarTimelineItem[];
  daySummary: { feedingCount: number; sleepTotalMinutes: number; urineCount: number; stoolCount: number };
}

export async function getCalendarMonth(accessToken: string, year: number, month: number): Promise<CalendarMonth> {
  const { data } = await apiRequest<CalendarMonth>("/calendar", {
    accessToken,
    query: { babyId: env.demoBabyId, year, month }
  });
  return data;
}

export async function getCalendarDay(accessToken: string, date: string): Promise<CalendarDay> {
  const { data } = await apiRequest<CalendarDay>("/calendar/daily", {
    accessToken,
    query: { babyId: env.demoBabyId, date }
  });
  return data;
}
