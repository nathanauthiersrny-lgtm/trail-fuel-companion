/**
 * Post-race analyzer — point d'entrée pour /api/analyze-race.
 *
 * Reçoit une race terminée + son plan + ses logs + profile baseline,
 * appelle Claude (sonnet-4-6 pour qualité) avec un tool structuré,
 * retourne propositions de recalibration.
 *
 * Pas de cache prompt-side ici : analyse rare (~1/course), gros payload
 * unique, et la qualité prime sur la vitesse → sonnet vs haiku.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  analysisOutputSchema,
  type AnalysisOutput,
} from "./proposal-schema";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT_PATH = join(
  process.cwd(),
  "lib",
  "post-race",
  "system-prompt.md",
);

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

let cachedPrompt: string | null = null;
function loadPrompt(): string {
  if (cachedPrompt) return cachedPrompt;
  cachedPrompt = readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  return cachedPrompt;
}

export type AnalyzeRaceInput = {
  race_summary: {
    duration_min_actual: number;
    duration_min_planned: number;
    temperature_c: number;
    humidity_high: boolean;
    exposure: string;
    session_type: string;
    terrain_type: string;
    status: "completed" | "abandoned";
  };
  profile_baseline: {
    carbs_per_hour_g: number;
    fluid_per_hour_ml: number;
    sodium_per_hour_mg: number;
  };
  /** Compact summary of the plan, not the full TimelinePlan to save tokens. */
  plan_summary: {
    carbs_per_hour_g: number;
    fluid_per_hour_ml: number;
    sodium_per_hour_mg: number;
    total_intakes_planned: number;
    total_check_ins_planned: number;
    was_enriched: boolean;
  };
  /** Logs effectifs aggrégés + détail compact (max ~50 entries pour rester sous budget tokens). */
  logs: Array<{
    planned_event_id?: string;
    type: "intake" | "fluid_reminder" | "check_in" | "aid_station";
    at_min: number;
    status: "done" | "skipped";
    feeling?: "good" | "meh" | "bad";
    item_kind?: string;
  }>;
};

export type AnalyzeRaceResult = {
  output: AnalysisOutput;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};

export async function analyzeRace(input: AnalyzeRaceInput): Promise<AnalyzeRaceResult> {
  const client = getClient();
  const toolInputSchema = z.toJSONSchema(analysisOutputSchema);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: loadPrompt(),
    tools: [
      {
        name: "submit_analysis",
        description:
          "Soumets ton analyse de la course : un résumé FR + 0..N propositions structurées.",
        input_schema: toolInputSchema as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "submit_analysis" },
    messages: [
      {
        role: "user",
        content: buildUserMessage(input),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("LLM did not invoke submit_analysis tool");
  }

  const parsed = analysisOutputSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `analysis output failed validation: ${JSON.stringify(parsed.error.issues).slice(0, 500)}`,
    );
  }

  return {
    output: parsed.data,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

function buildUserMessage(input: AnalyzeRaceInput): string {
  return [
    "Analyse cette course terminée et propose les recalibrations utiles.",
    "",
    "## Race summary",
    "```json",
    JSON.stringify(input.race_summary, null, 2),
    "```",
    "",
    "## Profile baseline (valeurs actuelles)",
    "```json",
    JSON.stringify(input.profile_baseline, null, 2),
    "```",
    "",
    "## Plan summary",
    "```json",
    JSON.stringify(input.plan_summary, null, 2),
    "```",
    "",
    `## Logs (${input.logs.length} entrées)`,
    "```json",
    JSON.stringify(input.logs, null, 2),
    "```",
    "",
    "Appelle l'outil `submit_analysis`.",
  ].join("\n");
}
