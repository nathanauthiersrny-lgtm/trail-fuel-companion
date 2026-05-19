/**
 * PostRaceAnalysisProposal — proposition de recalibration produite par Claude
 * après analyse d'une course terminée.
 *
 * Chaque proposition est isolée et porte un `why` FR + confidence → l'user
 * accepte/refuse modif par modif côté mobile.
 */

import { z } from "zod";

const profileFieldSchema = z.enum([
  "carbs_per_hour_g",
  "fluid_per_hour_ml",
  "sodium_per_hour_mg",
]);

const profileAdjustmentSchema = z.object({
  kind: z.literal("profile_adjustment"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  field: profileFieldSchema,
  current_value: z.number(),
  suggested_value: z.number(),
});

const raceNoteSchema = z.object({
  kind: z.literal("race_note"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  severity: z.enum(["info", "warning"]),
  observation: z.string().min(1),
});

const kbSuggestionSchema = z.object({
  kind: z.literal("kb_suggestion"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  /** Article idea — toi tu décides si tu en écris un. Pas d'auto-create KB. */
  article_idea: z.string().min(1),
});

export const proposalSchema = z.discriminatedUnion("kind", [
  profileAdjustmentSchema,
  raceNoteSchema,
  kbSuggestionSchema,
]);

export const analysisOutputSchema = z.object({
  proposals: z.array(proposalSchema),
  /** Résumé court de la course en 1-2 phrases. */
  summary_fr: z.string().min(1),
});

export type AnalysisOutput = z.infer<typeof analysisOutputSchema>;
export type PostRaceProposal = z.infer<typeof proposalSchema>;
