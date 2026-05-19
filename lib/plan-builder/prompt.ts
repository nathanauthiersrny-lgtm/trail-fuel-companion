/**
 * Construction du prompt Claude pour le plan enrichment.
 *
 * Structure :
 *   - SYSTEM block 1 : système prompt fixe (system-prompt.md). Cacheable.
 *   - SYSTEM block 2 : KB filtrée pour la race (articles markdown concaténés). Cacheable.
 *     → idéalement même race-profile = même set d'articles = cache hit.
 *   - USER : race context + plan brut. Non cacheable.
 *
 * Le LLM appelle le tool `emit_plan_patch` (schema = patchSchema) et on récupère
 * le PlanPatch via response.content.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import type { Article } from "../knowledge/types";
import type { RaceFilterContext } from "../knowledge/filter";
import type { TimelinePlan } from "../timeline-plan/types";

const SYSTEM_PROMPT_PATH = join(
  process.cwd(),
  "lib",
  "plan-builder",
  "system-prompt.md",
);

let cachedSystemPrompt: string | null = null;

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  cachedSystemPrompt = readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  return cachedSystemPrompt;
}

export function buildSystemBlocks(
  articles: Article[],
): Anthropic.Messages.TextBlockParam[] {
  return [
    {
      type: "text" as const,
      text: loadSystemPrompt(),
    },
    {
      type: "text" as const,
      text: serializeKnowledgeBase(articles),
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

function serializeKnowledgeBase(articles: Article[]): string {
  if (articles.length === 0) {
    return "## Knowledge base\n\n(Aucun article ne matche les tags de cette race.)";
  }
  const blocks = articles.map((a) => formatArticle(a));
  return `## Knowledge base (${articles.length} articles)\n\n${blocks.join("\n\n---\n\n")}`;
}

function formatArticle(a: Article): string {
  const sourceLine = a.source.citation
    ? `Source: ${a.source.type} — ${a.source.citation}`
    : `Source: ${a.source.type}`;
  return [
    `### [${a.slug}] ${a.title}`,
    `Quality: \`${a.quality}\` · ${sourceLine}`,
    "",
    a.body,
  ].join("\n");
}

export function buildUserMessage(input: {
  race: RaceContextForLLM;
  brutPlan: TimelinePlan;
}): string {
  return [
    "## Race context",
    "```json",
    JSON.stringify(input.race, null, 2),
    "```",
    "",
    "## Brut plan (produit par l'engine déterministe)",
    "```json",
    JSON.stringify(input.brutPlan, null, 2),
    "```",
    "",
    "Émets un PlanPatch via l'outil `emit_plan_patch`. Si rien à modifier sur ce plan, renvoie `{ operations: [] }`.",
  ].join("\n");
}

/**
 * Subset du Race envoyé au LLM — minimal pour que le cache ne casse pas sur
 * des champs inutiles (id, timestamps).
 */
export type RaceContextForLLM = {
  duration_min: number;
  distance_km: number;
  session_type: string;
  intensity: string;
  temperature_c: number;
  humidity_high: boolean;
  exposure: string;
  terrain_type: string;
  inventory_summary: Array<{ kind: string; total_carbs_g: number; count: number }>;
  has_gpx: boolean;
  // Optionnel : un résumé du profil GPX en quelques lignes (pas tout le track,
  // sinon on perd le cache hit).
  gpx_summary?: {
    total_climb_m: number;
    total_descent_m: number;
    notable_climbs?: Array<{ from_km: number; to_km: number; avg_grade: number }>;
  };
  /** Tags utilisés pour filtrer la KB — passés ici pour que le LLM puisse les voir. */
  filter_tags: {
    terrain: string[];
    conditions: string[];
    profile?: string;
  };
};

// Tool input schema (JSON Schema généré depuis le zod patchSchema). On l'expose
// ici car le builder utilise le schema pour configurer le tool Claude.
export { planPatchSchema } from "./patch-schema";
