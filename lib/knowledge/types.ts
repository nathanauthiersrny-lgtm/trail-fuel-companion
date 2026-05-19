/**
 * Types pour les articles de la KB. Le frontmatter parsé correspond à ce
 * shape — validé par zod (./schema.ts) au load time pour catcher tôt les
 * articles mal formés.
 */

export type ArticleQuality = "good" | "weak" | "bad";

export type ArticleSourceType = "study" | "coach" | "personal" | "article";

export type ArticleSource = {
  type: ArticleSourceType;
  url?: string;
  citation?: string;
};

export type ArticleTags = {
  duration: { min_min: number; max_min: number | null };
  distance_km: { min: number; max: number | null };
  terrain: string[];
  conditions: string[];
  profile: string[];
};

export type Article = {
  slug: string;
  title: string;
  quality: ArticleQuality;
  source: ArticleSource;
  language: string;
  tags: ArticleTags;
  last_updated: string;
  authored_by: string;
  /** Body markdown (sans frontmatter). */
  body: string;
};
