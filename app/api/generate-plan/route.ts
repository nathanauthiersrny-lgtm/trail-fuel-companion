/**
 * POST /api/generate-plan
 *
 * Reçoit un plan brut produit par le mobile (engine déterministe) + race
 * context. Appelle Claude pour produire un PlanPatch, l'applique sur le
 * plan brut, renvoie le plan enrichi.
 *
 * Si l'enrichissement échoue (LLM down, JSON invalide), on renvoie 502 et
 * le mobile fallback sur le brut (cf. doc Phase A § fallback companion down).
 */

import { z } from "zod";
import { enrichPlan } from "@/lib/plan-builder/generate";
import { timelinePlanSchema } from "@/lib/timeline-plan/schema";

export const dynamic = "force-dynamic";

const raceContextSchema = z.object({
  duration_min: z.number().positive(),
  distance_km: z.number().min(0),
  session_type: z.string().min(1),
  intensity: z.string().min(1),
  temperature_c: z.number(),
  humidity_high: z.boolean(),
  exposure: z.string().min(1),
  terrain_type: z.string().min(1),
  inventory_summary: z.array(
    z.object({
      kind: z.string().min(1),
      total_carbs_g: z.number().min(0),
      count: z.number().int().min(0),
    }),
  ),
  has_gpx: z.boolean(),
  gpx_summary: z
    .object({
      total_climb_m: z.number(),
      total_descent_m: z.number(),
      notable_climbs: z
        .array(
          z.object({
            from_km: z.number(),
            to_km: z.number(),
            avg_grade: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),
  filter_tags: z.object({
    terrain: z.array(z.string()).default([]),
    conditions: z.array(z.string()).default([]),
    profile: z.string().optional(),
  }),
});

const requestSchema = z.object({
  brutPlan: timelinePlanSchema,
  raceContext: raceContextSchema,
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

  const { brutPlan, raceContext } = parsed.data;

  const filterCtx = {
    duration_min: raceContext.duration_min,
    distance_km: raceContext.distance_km,
    terrain: raceContext.filter_tags.terrain,
    conditions: raceContext.filter_tags.conditions,
    profile: raceContext.filter_tags.profile,
  };

  try {
    const result = await enrichPlan({ brutPlan, raceContext, filterCtx });
    return Response.json(
      {
        plan: result.enriched,
        applied: result.apply.applied,
        rejected: result.apply.rejected,
        articles_considered: result.articlesConsidered.map((a) => ({
          slug: a.slug,
          title: a.title,
          quality: a.quality,
        })),
        usage: result.usage,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "enrichment failed", detail: message },
      { status: 502 },
    );
  }
}
