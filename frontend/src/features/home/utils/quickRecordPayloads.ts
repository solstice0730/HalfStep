import type {
  FeedingRecordCreate,
  RecordCreateBody,
  RecordType,
  SleepRecordCreate,
  StoolRecordCreate,
  UrineRecordCreate
} from "../../records/types/records.ts";

export type QuickRecordRequest<TBody extends RecordCreateBody = RecordCreateBody> = {
  type: RecordType;
  body: TBody;
};

export function buildFeedingRecord(
  babyId: number,
  occurredAt: Date,
  feedType: "분유" | "모유",
  rawAmount: string
): QuickRecordRequest<FeedingRecordCreate> {
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(feedType === "분유" ? "수유량을 입력해 주세요." : "수유 시간을 입력해 주세요.");
  }
  const base = { babyId, occurredAt: occurredAt.toISOString() };
  return feedType === "분유"
    ? { type: "FEEDING", body: { ...base, feedingType: "FORMULA", amountMl: amount } }
    : { type: "FEEDING", body: { ...base, feedingType: "BREAST", durationMinutes: amount } };
}

export function buildSleepRecord(
  babyId: number,
  startedAt: Date,
  endedAt: Date
): QuickRecordRequest<SleepRecordCreate> {
  return {
    type: "SLEEP",
    body: { babyId, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString() }
  };
}

export function buildDiaperRecord(
  babyId: number,
  occurredAt: Date,
  type: "URINE" | "STOOL"
): QuickRecordRequest<UrineRecordCreate | StoolRecordCreate> {
  return { type, body: { babyId, occurredAt: occurredAt.toISOString() } };
}
