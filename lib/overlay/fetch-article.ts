import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export type ExtractedArticle = {
  title: string | null;
  text: string;
};

export async function fetchArticle(url: string): Promise<ExtractedArticle> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; TrailFuelCompanion/0.1; +https://github.com/local)",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: HTTP ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const text = article?.textContent?.trim() ?? "";
  if (!text) {
    throw new Error("Readability could not extract article content");
  }
  return { title: article?.title ?? null, text };
}
