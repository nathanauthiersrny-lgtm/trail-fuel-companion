import { z } from "zod";

/**
 * zod schemas pour TimelinePlan. Utilisés pour valider :
 *   - le payload envoyé par le mobile au endpoint /api/generate-plan
 *   - le plan renvoyé après enrichissement (sanity check)
 *
 * Le PlanPatch lui-même est dans lib/plan-builder/patch-schema.ts.
 */

const foodItemKind = z.enum(["gel", "bar", "drink_mix", "real_food", "water"]);
const generatorSource = z.enum(["engine", "llm", "user"]);

const targetIntervalSchema = z.object({
  from_min: z.number().min(0),
  to_min: z.number().nullable(),
  value: z.number(),
  why: z.string().optional(),
  source: generatorSource.optional(),
});

const targetTimelineSchema = z.object({
  default: z.number(),
  timeline: z.array(targetIntervalSchema).optional(),
});

const raceTargetsSchema = z.object({
  carbs_per_hour_g: targetTimelineSchema,
  fluid_per_hour_ml: targetTimelineSchema,
  sodium_per_hour_mg: targetTimelineSchema,
});

const intakeAdviceSchema = z.object({
  preferred_kinds: z.array(foodItemKind).optional(),
  forbidden_kinds: z.array(foodItemKind).optional(),
  carbs_target_g: z.number().min(0).optional(),
  fluid_target_ml: z.number().min(0).optional(),
});

const timelineEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["intake", "fluid_reminder", "check_in", "aid_station"]),
  at_min: z.number(),
  why: z.string(),
  source: generatorSource,
  confidence: z.number().min(0).max(1),
  advice: intakeAdviceSchema.optional(),
  aid_station_id: z.string().optional(),
});

const branchTriggerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("skipped_count"),
    window_min: z.number().positive(),
    operator: z.literal(">="),
    value: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("checkin_feedback"),
    feedback: z.enum(["bad", "good"]),
  }),
  z.object({
    type: z.literal("pace_drift"),
    operator: z.enum([">=", "<="]),
    value_pct: z.number(),
  }),
  z.object({
    type: z.literal("elapsed_min"),
    operator: z.literal(">="),
    value: z.number().positive(),
  }),
]);

const branchActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("boost_next_intake"),
    factor: z.number().min(0.5).max(2),
  }),
  z.object({
    type: z.literal("shift_next_by"),
    minutes: z.number().int(),
  }),
  z.object({ type: z.literal("skip_next_intake") }),
  z.object({
    type: z.literal("switch_preferred_kinds"),
    kinds: z.array(foodItemKind).nonempty(),
    for_min: z.number().positive(),
  }),
  z.object({ type: z.literal("replan_from_now") }),
]);

const branchSchema = z.object({
  id: z.string().min(1),
  trigger: branchTriggerSchema,
  action: branchActionSchema,
  why: z.string(),
  source: generatorSource,
  max_fires: z.number().int().positive().optional(),
});

const planValidationWarningSchema = z.object({
  severity: z.enum(["low", "medium", "high"]),
  code: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

const planValidationSchema = z.object({
  passed: z.boolean(),
  warnings: z.array(planValidationWarningSchema),
});

export const timelinePlanSchema = z.object({
  version: z.literal(1),
  race_id: z.string().min(1),
  generated_at: z.string(),
  generator: z.object({
    engine_version: z.string().optional(),
    llm_model: z.string().optional(),
    llm_enrichment_applied: z.boolean(),
    kb_articles_used: z.array(z.string()).optional(),
  }),
  race_targets: raceTargetsSchema,
  events: z.array(timelineEventSchema),
  branches: z.array(branchSchema),
  validation: planValidationSchema,
});

export {
  foodItemKind,
  generatorSource,
  raceTargetsSchema,
  targetTimelineSchema,
  timelineEventSchema,
  branchSchema,
  intakeAdviceSchema,
};
