export interface PlanComparisonRow {
  feature: string;
  /** true if the feature's usage limit / billing policy isn't finalized yet — renders a footnote marker instead of an "unlimited" claim. */
  quotaPending?: boolean;
}
