/**
 * Filtre la KB pour ne garder que les articles pertinents pour une race donnée.
 * Économise des tokens (KB filtrée injectée dans le prompt) + cache hit plus
 * stable (la portion non-filtrée du prompt reste identique entre calls).
 */

import type { Article } from "./types";

export type RaceFilterContext = {
  duration_min: number;
  distance_km: number;
  /** Tags terrain de la race ("trail", "road", "technical", "alpine", "ultra"…) */
  terrain: string[];
  /** Tags conditions ("normal", "heat", "cold", "humid") */
  conditions: string[];
  /** Profil coureur ("beginner", "intermediate", "advanced") */
  profile?: string;
};

export function filterArticles(
  articles: Article[],
  ctx: RaceFilterContext,
): Article[] {
  return articles
    .filter((a) => a.quality !== "bad") // jamais utiliser les articles bad
    .filter((a) => matchesDuration(a, ctx.duration_min))
    .filter((a) => matchesDistance(a, ctx.distance_km))
    .filter((a) => intersect(a.tags.terrain, ctx.terrain))
    .filter((a) => intersect(a.tags.conditions, ctx.conditions))
    .filter((a) => matchesProfile(a, ctx.profile))
    // Articles "good" d'abord, puis "weak" — le LLM voit la priorité.
    .sort((a, b) => qualityRank(a.quality) - qualityRank(b.quality));
}

function matchesDuration(a: Article, durationMin: number): boolean {
  const { min_min, max_min } = a.tags.duration;
  if (durationMin < min_min) return false;
  if (max_min !== null && durationMin >= max_min) return false;
  return true;
}

function matchesDistance(a: Article, distanceKm: number): boolean {
  if (distanceKm <= 0) return true; // race sans GPX, pas de filtre distance
  const { min, max } = a.tags.distance_km;
  if (distanceKm < min) return false;
  if (max !== null && distanceKm >= max) return false;
  return true;
}

function intersect(articleTags: string[], raceTags: string[]): boolean {
  if (articleTags.length === 0) return true; // article sans tag = applicable partout
  if (raceTags.length === 0) return true;    // race sans tag fourni = on n'exclut pas
  return articleTags.some((t) => raceTags.includes(t));
}

function matchesProfile(a: Article, profile: string | undefined): boolean {
  if (!profile) return true;
  if (a.tags.profile.length === 0) return true;
  return a.tags.profile.includes(profile);
}

function qualityRank(q: Article["quality"]): number {
  return q === "good" ? 0 : q === "weak" ? 1 : 2;
}
