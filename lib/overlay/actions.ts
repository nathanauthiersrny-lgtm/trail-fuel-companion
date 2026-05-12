"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { fetchArticle } from "./fetch-article";
import { extractRulesFromExtraction } from "./extract-rules";
import { ruleSchema } from "./schema";

export type ExtractionResult =
  | { ok: true; id: number; ruleCount: number | null; extractError: string | null }
  | { ok: false; error: string };

export async function createExtraction(
  _prev: ExtractionResult | null,
  formData: FormData,
): Promise<ExtractionResult> {
  const source = formData.get("source");
  if (source !== "paste" && source !== "url") {
    return { ok: false, error: "Invalid source mode" };
  }

  let sourceUrl: string | null = null;
  let sourceText = "";
  let status: "processed" | "failed" = "processed";
  let errorMessage: string | null = null;

  if (source === "url") {
    const url = (formData.get("sourceUrl") as string | null)?.trim();
    if (!url) return { ok: false, error: "URL required" };
    try {
      new URL(url);
    } catch {
      return { ok: false, error: "Invalid URL" };
    }
    sourceUrl = url;
    try {
      const article = await fetchArticle(url);
      sourceText = article.title
        ? `${article.title}\n\n${article.text}`
        : article.text;
    } catch (e) {
      sourceText = "";
      status = "failed";
      errorMessage = e instanceof Error ? e.message : String(e);
    }
  } else {
    const text = (formData.get("sourceText") as string | null)?.trim();
    if (!text) return { ok: false, error: "Text required" };
    sourceText = text;
  }

  const [row] = await db
    .insert(schema.extractions)
    .values({
      source,
      sourceUrl,
      sourceText,
      status,
      errorMessage,
      createdAt: new Date(),
    })
    .returning({ id: schema.extractions.id });

  let ruleCount: number | null = null;
  let extractError: string | null = null;
  if (status === "processed") {
    try {
      const result = await extractRulesFromExtraction(row.id);
      ruleCount = result.ruleCount;
    } catch (e) {
      extractError = e instanceof Error ? e.message : String(e);
      console.error(`[extract #${row.id}] LLM extraction failed:`, e);
    }
  }

  revalidatePath("/extract");
  return { ok: true, id: row.id, ruleCount, extractError };
}

const RULE_STATUSES = ["proposed", "accepted", "rejected", "modified"] as const;
type RuleStatus = (typeof RULE_STATUSES)[number];

export async function setRuleStatus(formData: FormData) {
  const ruleId = Number(formData.get("ruleId"));
  const status = formData.get("status");
  if (!Number.isInteger(ruleId)) throw new Error("Invalid ruleId");
  if (typeof status !== "string" || !RULE_STATUSES.includes(status as RuleStatus)) {
    throw new Error("Invalid status");
  }
  const extractionId = Number(formData.get("extractionId"));

  await db
    .update(schema.proposedRules)
    .set({ status: status as RuleStatus })
    .where(eq(schema.proposedRules.id, ruleId));

  if (Number.isInteger(extractionId)) {
    revalidatePath(`/extract/${extractionId}`);
  }
  revalidatePath("/extract");
}

export type EditRuleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function editRule(
  _prev: EditRuleResult | null,
  formData: FormData,
): Promise<EditRuleResult> {
  const ruleId = Number(formData.get("ruleId"));
  const extractionId = Number(formData.get("extractionId"));
  const ruleJsonText = formData.get("ruleJson");
  if (!Number.isInteger(ruleId)) return { ok: false, error: "Invalid ruleId" };
  if (typeof ruleJsonText !== "string" || !ruleJsonText.trim()) {
    return { ok: false, error: "JSON required" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(ruleJsonText);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }

  const v = ruleSchema.safeParse(parsed);
  if (!v.success) {
    const first = v.error.issues[0];
    const path = first.path.join(".") || "(root)";
    return { ok: false, error: `Schema error at ${path}: ${first.message}` };
  }

  await db
    .update(schema.proposedRules)
    .set({ ruleJson: JSON.stringify(v.data), status: "modified" })
    .where(eq(schema.proposedRules.id, ruleId));

  if (Number.isInteger(extractionId)) {
    revalidatePath(`/extract/${extractionId}`);
  }
  revalidatePath("/extract");
  return { ok: true };
}

export async function reextract(formData: FormData) {
  const extractionId = Number(formData.get("extractionId"));
  if (!Number.isInteger(extractionId)) throw new Error("Invalid extractionId");

  await db
    .delete(schema.proposedRules)
    .where(eq(schema.proposedRules.extractionId, extractionId));

  await extractRulesFromExtraction(extractionId);
  revalidatePath(`/extract/${extractionId}`);
  revalidatePath("/extract");
}
