import { env } from "@/config/env";
import { apiRequest } from "@/services/api/apiClient";
import type {
  BreastSide,
  DiaperAmount,
  FeedingRecord,
  FeedingType,
  SleepRecord,
  SleepStatus,
  SleepType,
  StoolColor,
  StoolForm,
  StoolRecord,
  TodayRecords,
  UrineColor,
  UrineRecord
} from "@/features/records/types/records";

// backend/app/services/records.py serialize_log()의 실제 응답 형태.
interface RawCareRecord {
  id: string;
  type: "FEEDING" | "SLEEP" | "URINE" | "STOOL";
  occurredAt: string;
  startedAt: string | null;
  endedAt: string | null;
  content: Record<string, unknown>;
  memo: string | null;
  createdAt: string;
}

function toFeedingRecord(raw: RawCareRecord): FeedingRecord {
  const content = raw.content;
  return {
    id: raw.id,
    recordedAt: raw.occurredAt,
    feedingType: (content.feedingType as FeedingType) ?? "FORMULA",
    amountMl: content.formulaAmountMl as number | undefined,
    durationMinutes: content.durationMinutes as number | undefined,
    breastSide: content.breastSide as BreastSide | undefined
  };
}

function toSleepRecord(raw: RawCareRecord): SleepRecord {
  return {
    id: raw.id,
    startedAt: raw.startedAt ?? raw.occurredAt,
    endedAt: raw.endedAt ?? raw.occurredAt
  };
}

function toUrineRecord(raw: RawCareRecord): UrineRecord {
  const content = raw.content;
  return {
    id: raw.id,
    recordedAt: raw.occurredAt,
    amount: content.amount as DiaperAmount | undefined,
    color: content.color as UrineColor | undefined
  };
}

function toStoolRecord(raw: RawCareRecord): StoolRecord {
  const content = raw.content;
  return {
    id: raw.id,
    recordedAt: raw.occurredAt,
    amount: content.amount as DiaperAmount | undefined,
    color: content.color as StoolColor | undefined,
    form: content.form as StoolForm | undefined
  };
}

export async function getTodayRecords(accessToken: string, date: string): Promise<TodayRecords> {
  const { data } = await apiRequest<RawCareRecord[]>("/records", {
    accessToken,
    query: { babyId: env.demoBabyId, date }
  });

  return {
    feeding: data.filter((record) => record.type === "FEEDING").map(toFeedingRecord),
    sleep: data.filter((record) => record.type === "SLEEP").map(toSleepRecord),
    urine: data.filter((record) => record.type === "URINE").map(toUrineRecord),
    stool: data.filter((record) => record.type === "STOOL").map(toStoolRecord)
  };
}

export async function addFeedingRecord(
  accessToken: string,
  record: { occurredAt: string; feedingType: FeedingType; amountMl?: number; durationMinutes?: number; breastSide?: BreastSide }
): Promise<FeedingRecord> {
  const { data } = await apiRequest<RawCareRecord>("/records/feeding", {
    method: "POST",
    accessToken,
    body: { babyId: env.demoBabyId, ...record }
  });
  return toFeedingRecord(data);
}

export async function addSleepRecord(
  accessToken: string,
  record: { startedAt: string; endedAt: string; sleepType?: SleepType; status?: SleepStatus }
): Promise<SleepRecord> {
  const { data } = await apiRequest<RawCareRecord>("/records/sleep", {
    method: "POST",
    accessToken,
    body: { babyId: env.demoBabyId, ...record }
  });
  return toSleepRecord(data);
}

export async function addUrineRecord(
  accessToken: string,
  record: { occurredAt: string; amount?: DiaperAmount; color?: UrineColor }
): Promise<UrineRecord> {
  const { data } = await apiRequest<RawCareRecord>("/records/urine", {
    method: "POST",
    accessToken,
    body: { babyId: env.demoBabyId, ...record }
  });
  return toUrineRecord(data);
}

export async function addStoolRecord(
  accessToken: string,
  record: { occurredAt: string; amount?: DiaperAmount; color?: StoolColor; form?: StoolForm }
): Promise<StoolRecord> {
  const { data } = await apiRequest<RawCareRecord>("/records/stool", {
    method: "POST",
    accessToken,
    body: { babyId: env.demoBabyId, ...record }
  });
  return toStoolRecord(data);
}
