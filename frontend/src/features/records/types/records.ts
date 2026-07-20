export type RecordType = "FEEDING" | "SLEEP" | "URINE" | "STOOL";

export type RecordContent = {
  amount?: "SMALL" | "MEDIUM" | "LARGE" | null;
  breastSide?: "LEFT" | "RIGHT" | "BOTH" | null;
  burped?: boolean | null;
  color?: string | null;
  durationMinutes?: number | null;
  feedingType?: "BREAST" | "FORMULA" | "MIXED";
  form?: "WATERY" | "SOFT" | "NORMAL" | "HARD" | null;
  formulaAmountMl?: number;
  photoUrl?: string | null;
  sleepType?: "NAP" | "NIGHT" | null;
  status?: "PEACEFUL" | "RESTLESS" | "WOKE_OFTEN" | null;
};

export type CareRecord = {
  id: string;
  type: RecordType;
  occurredAt: string;
  startedAt: string | null;
  endedAt: string | null;
  content: RecordContent;
  memo: string | null;
  createdAt: string;
};

type BaseCreateBody = { babyId: number };

export type FeedingRecordCreate = BaseCreateBody & {
  occurredAt: string;
  feedingType: "BREAST" | "FORMULA" | "MIXED";
  amountMl?: number;
  durationMinutes?: number;
  breastSide?: "LEFT" | "RIGHT" | "BOTH";
  burped?: boolean;
  memo?: string;
};

export type SleepRecordCreate = BaseCreateBody & {
  startedAt: string;
  endedAt: string;
  sleepType?: "NAP" | "NIGHT";
  status?: "PEACEFUL" | "RESTLESS" | "WOKE_OFTEN";
};

export type UrineRecordCreate = BaseCreateBody & {
  occurredAt: string;
  amount?: "SMALL" | "MEDIUM" | "LARGE";
  color?: "NORMAL" | "DARK_YELLOW" | "PINK" | "RED" | "OTHER";
};

export type StoolRecordCreate = BaseCreateBody & {
  occurredAt: string;
  amount?: "SMALL" | "MEDIUM" | "LARGE";
  color?: "NORMAL" | "GREEN" | "BLACK" | "RED" | "WHITE" | "OTHER";
  form?: "WATERY" | "SOFT" | "NORMAL" | "HARD";
  photoUrl?: string;
};

export type RecordCreateBody = FeedingRecordCreate | SleepRecordCreate | UrineRecordCreate | StoolRecordCreate;

export type RecordListQuery = {
  babyId: number;
  date: string;
  type?: RecordType;
  cursor?: string;
  limit?: number;
};

export type RecordListResult = {
  records: CareRecord[];
  cursor: string | null;
  hasNext: boolean;
};
