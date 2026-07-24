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
  diary: CalendarDiary | null;
  timeline: CalendarTimelineItem[];
  daySummary: { feedingCount: number; sleepTotalMinutes: number; urineCount: number; stoolCount: number };
}

export interface CalendarDiary {
  id: number;
  babyId: number;
  date: string;
  title: string;
  content: string;
  isAiGenerated: boolean;
  highlights: string[];
  notice: string | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getCalendarMonth(accessToken: string, babyId: number, year: number, month: number): Promise<CalendarMonth> {
  const { data } = await apiRequest<CalendarMonth>("/calendar", {
    accessToken,
    query: { babyId, year, month }
  });
  return data;
}

export async function getCalendarDay(accessToken: string, babyId: number, date: string): Promise<CalendarDay> {
  const { data } = await apiRequest<CalendarDay>("/calendar/daily", {
    accessToken,
    query: { babyId, date }
  });
  return data;
}
