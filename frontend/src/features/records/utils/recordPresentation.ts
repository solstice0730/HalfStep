import type { CareRecord, RecordType } from "../types/records.ts";

const amountLabels: Record<string, string> = { SMALL: "적음", MEDIUM: "보통", LARGE: "많음" };
const colorLabels: Record<string, string> = {
  NORMAL: "정상", DARK_YELLOW: "진한 노랑", PINK: "분홍", RED: "빨강", GREEN: "초록",
  BLACK: "검정", WHITE: "흰색", OTHER: "기타"
};
const formLabels: Record<string, string> = { WATERY: "묽은 변", SOFT: "무른 변", NORMAL: "보통 변", HARD: "단단한 변" };

export const recordTypeLabels: Record<RecordType, string> = {
  FEEDING: "수유",
  SLEEP: "수면",
  URINE: "소변",
  STOOL: "대변"
};

export function formatRecordDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatRecordTime(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function describeRecord(record: CareRecord): string {
  if (record.type === "FEEDING") {
    if (record.content.feedingType === "FORMULA") return `분유 ${record.content.formulaAmountMl ?? 0}ml`;
    return `모유 ${record.content.durationMinutes ?? 0}분`;
  }
  if (record.type === "SLEEP") {
    const duration = record.startedAt && record.endedAt
      ? Math.max(0, Math.round((new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime()) / 60000))
      : 0;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `수면 ${hours ? `${hours}시간${minutes ? " " : ""}` : ""}${minutes ? `${minutes}분` : ""}`.trim();
  }
  const parts = [recordTypeLabels[record.type]];
  if (record.content.amount) parts.push(amountLabels[record.content.amount] ?? record.content.amount);
  if (record.content.color) parts.push(colorLabels[record.content.color] ?? record.content.color);
  if (record.type === "STOOL" && record.content.form) parts.push(formLabels[record.content.form] ?? record.content.form);
  return parts.join(" · ");
}
