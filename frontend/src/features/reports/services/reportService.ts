import { apiRequest } from "@/services/api/apiClient";

// backend/app/services/reports.py get_weekly_report() 응답.
export interface WeeklyReport {
  period: { start: string; end: string };
  baby: { id: number; name: string; ageDays: number; ageMonths: number };
  insight: { headline: string; body: string };
  feeding: {
    daily: { date: string; count: number; totalMl: number }[];
    count: number;
    totalMl: number;
    prevTotalMl: number;
    changePercent: number | null;
    avgIntervalMinutes: number | null;
    prevAvgIntervalMinutes: number | null;
  };
  sleep: {
    totalMinutes: number;
    avgNapMinutes: number | null;
    prevAvgNapMinutes: number | null;
    changeMinutes: number | null;
  };
  diaper: { count: number; prevCount: number };
  curations: { title: string; source: string; reviewedAt: string; url: string }[];
  nextWeekFocus: string[];
}

export async function getWeeklyReport(accessToken: string, babyId: number, endDate?: string): Promise<WeeklyReport> {
  const { data } = await apiRequest<WeeklyReport>("/reports/weekly", {
    accessToken,
    query: { babyId, endDate }
  });
  return data;
}
