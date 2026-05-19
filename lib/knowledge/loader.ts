/**
 * Charge tous les articles markdown depuis lib/knowledge/articles/. Parse le
 * frontmatter YAML via gray-matter, valide via zod, retourne une liste typée.
 *
 * Cache en mémoire process : la KB ne change qu'au redéploy.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { Article } from "./types";
import { articleFrontmatterSchema } from "./schema";

const ARTICLES_DIR = join(process.cwd(), "lib", "knowledge", "articles");

let cached: Article[] | null = null;

export function loadKnowledgeBase(): Article[] {
  if (cached) return cached;
  cached = readAllArticles();
  return cached;
}

/** À utiliser en dev / tests pour invalider le cache après édition. */
export function clearKnowledgeBaseCache() {
  cached = null;
}

function readAllArticles(): Article[] {
  let files: string[];
  try {
    files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md"));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const articles: Article[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const path = join(ARTICLES_DIR, file);
    const raw = readFileSync(path, "utf8");
    const parsed = matter(raw);
    const result = articleFrontmatterSchema.safeParse(parsed.data);
    if (!result.success) {
      errors.push(`${file}: ${JSON.stringify(result.error.issues).slice(0, 300)}`);
      continue;
    }
    articles.push({ ...result.data, body: parsed.content.trim() });
  }

  if (errors.length > 0) {
    // KB malformée = bug projet, fail loudly au boot.
    throw new Error(`Invalid KB articles:\n${errors.join("\n")}`);
  }

  return articles;
}
