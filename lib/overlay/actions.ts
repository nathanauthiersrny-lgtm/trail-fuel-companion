"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { fetchArticle } from "./fetch-article";

export type ExtractionResult =
  | { ok: true; id: number }
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

  revalidatePath("/extract");
  return { ok: true, id: row.id };
}
