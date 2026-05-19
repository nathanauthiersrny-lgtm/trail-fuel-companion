/**
 * Plan enrichment orchestrator — point d'entrée appelé par l'endpoint
 * /api/generate-plan. Reçoit un plan brut + race context, retourne un plan
 * enrichi + métadonnées (op acceptées/rejetées, usage tokens).
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Article } from "../knowledge/types";
import { filterArticles, type RaceFilterContext } from "../knowledge/filter";
import { loadKnowledgeBase } from "../knowledge/loader";
import type { TimelinePlan } from "../timeline-plan/types";
import { applyPatch, type ApplyPatchResult } from "./apply-patch";
import { planPatchSchema } from "./patch-schema";
import {
  buildSystemBlocks,
  buildUserMessage,
  type RaceContextForLLM,
} from "./prompt";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 4096;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export type EnrichPlanInput = {
  brutPlan: TimelinePlan;
  raceContext: RaceContextForLLM;
  filterCtx: RaceFilterContext;
};

export type EnrichPlanResult = {
  enriched: TimelinePlan;
  apply: ApplyPatchResult;
  articlesConsidered: Article[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
};

export async function enrichPlan(input: EnrichPlanInput): Promise<EnrichPlanResult> {
  const all = loadKnowledgeBase();
  const articles = filterArticles(all, input.filterCtx);
  const knownSlugs = new Set(articles.map((a) => a.slug));

  const client = getClient();
  const toolInputSchema = z.toJSONSchema(planPatchSchema);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemBlocks(articles),
    tools: [
      {
        name: "emit_plan_patch",
        description:
          "Émets le patch d'enrichissement à appliquer sur le plan brut. Renvoie operations:[] si aucune modification n'est justifiée par la KB.",
        input_schema: toolInputSchema as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "emit_plan_patch" },
    messages: [
      {
        role: "user",
        content: buildUserMessage({
          race: input.raceContext,
          brutPlan: input.brutPlan,
        }),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("LLM did not invoke emit_plan_patch tool");
  }

  const parsed = planPatchSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `LLM patch failed validation: ${JSON.stringify(parsed.error.issues).slice(0, 500)}`,
    );
  }

  const apply = applyPatch(input.brutPlan, parsed.data, {
    knownArticleSlugs: knownSlugs,
    llmModel: MODEL,
  });

  const usage = response.usage;
  return {
    enriched: apply.plan,
    apply,
    articlesConsidered: articles,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    },
  };
}
