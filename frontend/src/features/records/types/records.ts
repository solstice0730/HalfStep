// 아래 enum 값은 backend/app/schemas/records.py의 실제 계약과 동일하게 유지한다.
// (feature/records-calendar 브랜치에서 가져온 records/calendar API 기준)
export type FeedingType = "BREAST" | "FORMULA" | "MIXED";
export type BreastSide = "LEFT" | "RIGHT" | "BOTH";
export type SleepType = "NAP" | "NIGHT";
export type SleepStatus = "PEACEFUL" | "RESTLESS" | "WOKE_OFTEN";
export type DiaperAmount = "SMALL" | "MEDIUM" | "LARGE";
export type UrineColor = "NORMAL" | "DARK_YELLOW" | "PINK" | "RED" | "OTHER";
export type StoolColor = "NORMAL" | "GREEN" | "BLACK" | "RED" | "WHITE" | "OTHER";
export type StoolForm = "WATERY" | "SOFT" | "NORMAL" | "HARD";

export const FEEDING_TYPE_LABELS: Record<FeedingType, string> = {
  BREAST: "모유",
  FORMULA: "분유",
  MIXED: "혼합"
};

export const DIAPER_AMOUNT_LABELS: Record<DiaperAmount, string> = {
  SMALL: "적음",
  MEDIUM: "보통",
  LARGE: "많음"
};

export const URINE_COLOR_LABELS: Record<UrineColor, string> = {
  NORMAL: "정상",
  DARK_YELLOW: "진한 노랑",
  PINK: "분홍",
  RED: "빨강",
  OTHER: "기타"
};

export const STOOL_COLOR_LABELS: Record<StoolColor, string> = {
  NORMAL: "정상",
  GREEN: "초록",
  BLACK: "검정",
  RED: "빨강",
  WHITE: "흰색",
  OTHER: "기타"
};

export const STOOL_FORM_LABELS: Record<StoolForm, string> = {
  WATERY: "묽은 변",
  SOFT: "무른 변",
  NORMAL: "보통 변",
  HARD: "단단한 변"
};

export interface FeedingRecord {
  id: string;
  recordedAt: string; // ISO datetime
  feedingType: FeedingType;
  amountMl?: number;
  durationMinutes?: number;
  breastSide?: BreastSide;
}

export interface SleepRecord {
  id: string;
  startedAt: string; // ISO datetime
  endedAt: string; // ISO datetime
}

export interface UrineRecord {
  id: string;
  recordedAt: string; // ISO datetime
  amount?: DiaperAmount;
  color?: UrineColor;
}

export interface StoolRecord {
  id: string;
  recordedAt: string; // ISO datetime
  amount?: DiaperAmount;
  color?: StoolColor;
  form?: StoolForm;
}

export interface TodayRecords {
  feeding: FeedingRecord[];
  sleep: SleepRecord[];
  urine: UrineRecord[];
  stool: StoolRecord[];
}

export interface BabyInfo {
  name: string;
  ageMonths?: number;
}

// Mirrors backend app/schemas/ai.py DiaryGenerateRequest exactly. feedingType/diaper.type are
// free display strings there (not validated enums), so we pass Korean labels for readable AI output.
export interface DiaryGenerationRequest {
  baby: BabyInfo;
  date: string; // YYYY-MM-DD
  records: {
    feeding: { recordedAt: string; feedingType: string; amountMl?: number }[];
    sleep: { startedAt: string; endedAt: string }[];
    diaper: { recordedAt: string; type: string }[];
  };
  photoDescriptions: string[];
  memo?: string;
}

// Mirrors backend app/schemas/ai.py DiaryGenerateResponse exactly.
export interface DiaryGenerationResponse {
  title: string;
  content: string;
  highlights: string[];
  generatedByAi: boolean;
  notice: string;
}
