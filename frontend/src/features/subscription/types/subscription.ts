export type TierMark = "full" | "partial" | "none";

export interface PlanComparisonRow {
  feature: string;
  freeMark: TierMark;
  freeNote: string | null;
  premiumNote: string;
}
