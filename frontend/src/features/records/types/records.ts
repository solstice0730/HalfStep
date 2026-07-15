export type RecordType = "FEEDING" | "SLEEP" | "URINE" | "STOOL";

export type CareRecord = {
  id: string;
  type: RecordType;
  occurredAt: string;
  startedAt: string | null;
  endedAt: string | null;
  content: Record<string, string | number | boolean | null>;
  memo: string | null;
  createdAt: string;
};

export type RecordCreateBody = Record<string, unknown> & { babyId: number };
