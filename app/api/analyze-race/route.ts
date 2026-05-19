/**
 * POST /api/analyze-race
 *
 * Reçoit le contexte d'une course terminée (race summary + plan + logs +
 * profile baseline). Appelle Claude pour produire des propositions de
 * recalibration. Le mobile présente les propositions à l'utilisateur qui
 * accepte/refuse modif par modif.
 */

import { z } from "zod";
import { analyzeRace } from "@/lib/post-race/analyze";

export const dynamic = "force-dynamic";

const raceSummarySchema = z.object({
  duration_min_actual: z.number().min(0),
  duration_min_planned: z.number().positive(),
  temperature_c: z.number(),
  humidity_high: z.boolean(),
  exposure: z.string().min(1),
  session_type: z.string().min(1),
  terrain_type: z.string().min(1),
  status: z.enum(["completed", "abandoned"]),
});

const profileBaselineSchema = z.object({
  carbs_per_hour_g: z.number().positive(),
  fluid_per_hour_ml: z.number().positive(),
  sodium_per_hour_mg: z.number().positive(),
});

const planSummarySchema = z.object({
  carbs_per_hour_g: z.number().positive(),
  fluid_per_hour_ml: z.number().positive(),
  sodium_per_hour_mg: z.number().positive(),
  total_intakes_planned: z.number().int().min(0),
  total_check_ins_planned: z.number().int().min(0),
  was_enriched: z.boolean(),
});

const logEntrySchema = z.object({
  planned_event_id: z.string().optional(),
  type: z.enum(["intake", "fluid_reminder", "check_in", "aid_station"]),
  at_min: z.number().min(0),
  status: z.enum(["done", "skipped"]),
  feeling: z.enum(["good", "meh", "bad"]).optional(),
  item_kind: z.string().optional(),
});

const requestSchema = z.object({
  race_summary: raceSummarySchema,
  profile_baseline: profileBaselineSchema,
  plan_summary: planSummarySchema,
  // Garde-fou : cap à 200 entries pour éviter de payer une analyse sur des
  // milliers de logs si jamais le mobile envoie trop. À ajuster si besoin.
  logs: z.array(logEntrySchema).max(200),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "validation failed",
        issues: parsed.error.issues.slice(0, 10),
      },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeRace(parsed.data);
    return Response.json(
      {
        summary_fr: result.output.summary_fr,
        proposals: result.output.proposals,
        usage: result.usage,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "analysis failed", detail: message },
      { status: 502 },
    );
  }
}
