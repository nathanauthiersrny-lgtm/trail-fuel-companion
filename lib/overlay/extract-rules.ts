import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ruleSchema } from "./schema";
import { buildSystemPrompt } from "./prompt";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

const proposedRuleSchema = z.object({
  rule: ruleSchema,
  source_quote: z.string().min(1),
});

const proposeRulesInputSchema = z.object({
  rules: z.array(proposedRuleSchema),
});

const toolInputJsonSchema = z.toJSONSchema(proposeRulesInputSchema);

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export type ExtractionRunResult = {
  ruleCount: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  outputTokens: number;
};

export async function extractRulesFromExtraction(
  extractionId: number,
): Promise<ExtractionRunResult> {
  const [ext] = await db
    .select()
    .from(schema.extractions)
    .where(eq(schema.extractions.id, extractionId));

  if (!ext) throw new Error(`Extraction ${extractionId} not found`);
  if (ext.status !== "processed" || !ext.sourceText) {
    throw new Error(`Extraction ${extractionId} is not ready (status=${ext.status})`);
  }

  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    tools: [
      {
        name: "propose_rules",
        description:
          "Submit the rules you extracted from the source text. Pass an empty array if the source contains no concrete rule.",
        input_schema: toolInputJsonSchema as Anthropic.Messages.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "propose_rules" },
    messages: [
      {
        role: "user",
        content: ext.sourceUrl
          ? `Source URL: ${ext.sourceUrl}\n\n---\n\n${ext.sourceText}`
          : ext.sourceText,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("LLM did not invoke propose_rules tool");
  }

  const parsed = proposeRulesInputSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `LLM tool input failed validation: ${JSON.stringify(parsed.error.issues).slice(0, 500)}`,
    );
  }

  if (parsed.data.rules.length > 0) {
    await db.insert(schema.proposedRules).values(
      parsed.data.rules.map((entry) => ({
        extractionId,
        ruleJson: JSON.stringify(entry.rule),
        sourceQuote: entry.source_quote,
        createdAt: new Date(),
      })),
    );
  }

  const usage = response.usage;
  return {
    ruleCount: parsed.data.rules.length,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
  };
}
