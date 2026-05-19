/**
 * PlanPatch — sortie structurée du LLM pour enrichir un TimelinePlan brut.
 *
 * Chaque opération est isolée + auto-justifiée → l'utilisateur peut
 * accepter/refuser modif par modif dans le previewer.
 *
 * Sémantique des op :
 *   - `add_event`         : ajoute un nouvel event (id généré côté serveur)
 *   - `replace_event`     : remplace un event existant par id
 *   - `delete_event`      : supprime un event existant par id
 *   - `set_target_timeline` : redéfinit timeline[] sur un target spécifique
 *   - `add_branch`        : ajoute une branche conditionnelle
 */

import { z } from "zod";
import {
  branchSchema,
  intakeAdviceSchema,
  targetTimelineSchema,
} from "../timeline-plan/schema";

const targetIdSchema = z.enum([
  "carbs_per_hour_g",
  "fluid_per_hour_ml",
  "sodium_per_hour_mg",
]);

const addEventOpSchema = z.object({
  op: z.literal("add_event"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  kb_articles_used: z.array(z.string()).default([]),
  event: z.object({
    type: z.enum(["intake", "fluid_reminder", "check_in"]),
    at_min: z.number().min(0),
    advice: intakeAdviceSchema.optional(),
  }),
});

const replaceEventOpSchema = z.object({
  op: z.literal("replace_event"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  kb_articles_used: z.array(z.string()).default([]),
  target_event_id: z.string().min(1),
  event: z.object({
    type: z.enum(["intake", "fluid_reminder", "check_in"]).optional(),
    at_min: z.number().min(0).optional(),
    advice: intakeAdviceSchema.optional(),
  }),
});

const deleteEventOpSchema = z.object({
  op: z.literal("delete_event"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  kb_articles_used: z.array(z.string()).default([]),
  target_event_id: z.string().min(1),
});

const setTargetTimelineOpSchema = z.object({
  op: z.literal("set_target_timeline"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  kb_articles_used: z.array(z.string()).default([]),
  target: targetIdSchema,
  value: targetTimelineSchema,
});

const addBranchOpSchema = z.object({
  op: z.literal("add_branch"),
  why: z.string().min(1),
  confidence: z.number().min(0).max(1),
  kb_articles_used: z.array(z.string()).default([]),
  // L'id sera regénéré côté serveur, on accepte que le LLM mette n'importe quoi.
  branch: branchSchema.omit({ id: true, source: true }).extend({
    id: z.string().optional(),
  }),
});

export const patchOperationSchema = z.discriminatedUnion("op", [
  addEventOpSchema,
  replaceEventOpSchema,
  deleteEventOpSchema,
  setTargetTimelineOpSchema,
  addBranchOpSchema,
]);

export const planPatchSchema = z.object({
  /** Patch agnostique de l'ordre — l'apply-patch les applique dans l'ordre fourni. */
  operations: z.array(patchOperationSchema),
});

export type PatchOperation = z.infer<typeof patchOperationSchema>;
export type PlanPatch = z.infer<typeof planPatchSchema>;
