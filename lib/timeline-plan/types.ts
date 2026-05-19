/**
 * TimelinePlan — Mirror des types côté mobile (trail-fuel/src/models/timeline-plan.ts).
 *
 * Volontairement dupliqué : pas de monorepo / package partagé en V1. La spec
 * canonique est côté mobile ; ce miroir est validé par zod (./schema.ts) à
 * chaque endpoint pour garantir qu'on n'a pas drifté.
 */

export const TIMELINE_PLAN_VERSION = 1 as const;

export type GeneratorSource = "engine" | "llm" | "user";

export type GeneratorInfo = {
  engine_version?: string;
  llm_model?: string;
  llm_enrichment_applied: boolean;
  kb_articles_used?: string[];
};

export type TargetTimeline = {
  default: number;
  timeline?: Array<{
    from_min: number;
    to_min: number | null;
    value: number;
    why?: string;
    source?: GeneratorSource;
  }>;
};

export type RaceTargets = {
  carbs_per_hour_g: TargetTimeline;
  fluid_per_hour_ml: TargetTimeline;
  sodium_per_hour_mg: TargetTimeline;
};

export type FoodItemKind = "gel" | "bar" | "drink_mix" | "real_food" | "water";

export type TimelineEventType =
  | "intake"
  | "fluid_reminder"
  | "check_in"
  | "aid_station";

export type IntakeAdvice = {
  preferred_kinds?: FoodItemKind[];
  forbidden_kinds?: FoodItemKind[];
  carbs_target_g?: number;
  fluid_target_ml?: number;
};

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  at_min: number;
  why: string;
  source: GeneratorSource;
  confidence: number;
  advice?: IntakeAdvice;
  aid_station_id?: string;
};

export type BranchTrigger =
  | { type: "skipped_count"; window_min: number; operator: ">="; value: number }
  | { type: "checkin_feedback"; feedback: "bad" | "good" }
  | { type: "pace_drift"; operator: ">=" | "<="; value_pct: number }
  | { type: "elapsed_min"; operator: ">="; value: number };

export type BranchAction =
  | { type: "boost_next_intake"; factor: number }
  | { type: "shift_next_by"; minutes: number }
  | { type: "skip_next_intake" }
  | { type: "switch_preferred_kinds"; kinds: FoodItemKind[]; for_min: number }
  | { type: "replan_from_now" };

export type Branch = {
  id: string;
  trigger: BranchTrigger;
  action: BranchAction;
  why: string;
  source: GeneratorSource;
  max_fires?: number;
};

export type PlanValidationWarning = {
  severity: "low" | "medium" | "high";
  code: string;
  message: string;
  data?: Record<string, number | string>;
};

export type PlanValidation = {
  passed: boolean;
  warnings: PlanValidationWarning[];
};

export type TimelinePlan = {
  version: typeof TIMELINE_PLAN_VERSION;
  race_id: string;
  generated_at: string;
  generator: GeneratorInfo;
  race_targets: RaceTargets;
  events: TimelineEvent[];
  branches: Branch[];
  validation: PlanValidation;
};
