import { z } from "zod";

export const foodItemKindSchema = z.enum([
  "gel",
  "bar",
  "drink_mix",
  "real_food",
  "water",
]);
export type FoodItemKind = z.infer<typeof foodItemKindSchema>;

const expressionValueSchema = z.object({ expr: z.string() });
const scalarConstantSchema = z.union([z.string(), z.number(), z.boolean()]);
const numberOrExprSchema = z.union([z.number(), expressionValueSchema]);

const fieldConditionSchema = z.discriminatedUnion("op", [
  z.object({
    field: z.string(),
    op: z.literal("equals"),
    value: z.union([scalarConstantSchema, z.array(scalarConstantSchema)]),
  }),
  z.object({
    field: z.string(),
    op: z.literal("not_equals"),
    value: z.union([scalarConstantSchema, z.array(scalarConstantSchema)]),
  }),
  z.object({ field: z.string(), op: z.literal("gt"), value: numberOrExprSchema }),
  z.object({ field: z.string(), op: z.literal("gte"), value: numberOrExprSchema }),
  z.object({ field: z.string(), op: z.literal("lt"), value: numberOrExprSchema }),
  z.object({ field: z.string(), op: z.literal("lte"), value: numberOrExprSchema }),
  z.object({
    field: z.string(),
    op: z.literal("in"),
    value: z.array(scalarConstantSchema),
  }),
  z.object({
    field: z.string(),
    op: z.literal("between"),
    value: z.tuple([z.number(), z.number()]),
  }),
  z.object({ field: z.string(), op: z.literal("is_subset_of"), set: z.string() }),
  z.object({
    field: z.string(),
    op: z.literal("is_strict_subset_of"),
    set: z.string(),
  }),
  z.object({ field: z.string(), op: z.literal("is_superset_of"), set: z.string() }),
  z.object({
    field: z.string(),
    op: z.literal("is_strict_superset_of"),
    set: z.string(),
  }),
  z.object({ field: z.string(), op: z.literal("is_empty") }),
  z.object({ field: z.string(), op: z.literal("is_not_empty") }),
  z.object({ field: z.string(), op: z.literal("exists") }),
]);
export type FieldCondition = z.infer<typeof fieldConditionSchema>;

export type Condition =
  | { always: true }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | FieldCondition;

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ always: z.literal(true) }),
    z.object({ all: z.array(conditionSchema) }),
    z.object({ any: z.array(conditionSchema) }),
    z.object({ not: conditionSchema }),
    fieldConditionSchema,
  ]),
);

export const nutritionTargetSchema = z.enum([
  "carbs_per_hour_g",
  "fluid_per_hour_ml",
  "sodium_per_hour_mg",
  "intensity_modifier",
]);
export const timingTargetSchema = z.enum([
  "first_intake_after_min",
  "intake_interval_min",
  "first_fluid_reminder_min",
  "fluid_reminder_interval_min",
  "check_in_frequency_min",
]);

const raceActionSchema = z.object({
  target: z.union([nutritionTargetSchema, timingTargetSchema]),
  op: z.enum(["add", "subtract", "multiply", "set"]),
  value: numberOrExprSchema,
});

const windowActionSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_allowed_kinds"),
    kinds: z.union([z.array(foodItemKindSchema), z.null()]),
  }),
  z.object({ op: z.literal("forbid_kind"), kind: foodItemKindSchema }),
]);

const kindsListOrRefSchema = z.union([
  z.array(foodItemKindSchema),
  z.object({ kinds_from: z.string() }),
]);

const intakePickActionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("prefer_kinds"), kinds: kindsListOrRefSchema }),
  z.object({ op: z.literal("avoid_kinds"), kinds: kindsListOrRefSchema }),
  z.object({ op: z.literal("forbid_kinds"), kinds: kindsListOrRefSchema }),
]);

const ruleProvenanceSchema = z.object({
  extracted_from: z.string().optional(),
  extracted_at: z.string().optional(),
  notes: z.string().optional(),
});

const commonRuleFieldsSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["base", "overlay"]),
  category: z.enum(["nutrition", "timing", "placement"]),
  description: z.string().min(1),
  provenance: ruleProvenanceSchema.optional(),
});

export const ruleSchema = z.discriminatedUnion("scope", [
  commonRuleFieldsSchema.extend({
    scope: z.literal("race"),
    condition: conditionSchema,
    action: raceActionSchema,
  }),
  commonRuleFieldsSchema.extend({
    scope: z.literal("window"),
    condition: conditionSchema,
    action: windowActionSchema,
  }),
  commonRuleFieldsSchema.extend({
    scope: z.literal("intake_pick"),
    condition: conditionSchema,
    action: intakePickActionSchema,
  }),
]);
export type Rule = z.infer<typeof ruleSchema>;
export type RuleScope = Rule["scope"];

export const overlayFileSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "version must be semver-like (x.y.z)"),
  rules: z.array(ruleSchema),
});
export type OverlayFile = z.infer<typeof overlayFileSchema>;
