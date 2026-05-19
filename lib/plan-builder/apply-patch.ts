/**
 * applyPatch — applique un PlanPatch sur un TimelinePlan brut.
 *
 * Filtre les modifications dont le LLM `kb_articles_used` n'apparaît pas
 * dans la KB filtrée (sécurité contre hallucination de slug).
 *
 * Marque tous les changements avec source="llm" + confidence du LLM.
 * Le `why` du patch devient le `why` de l'event/branch/timeline entry pour
 * traçabilité dans l'UI.
 */

import type { PatchOperation, PlanPatch } from "./patch-schema";
import type {
  Branch,
  TimelineEvent,
  TimelinePlan,
} from "../timeline-plan/types";

export type ApplyPatchResult = {
  /** Plan résultat. */
  plan: TimelinePlan;
  /** Op acceptées (kb_articles_used valides). */
  applied: PatchOperation[];
  /** Op rejetées par notre validation (slugs inconnus etc.). */
  rejected: Array<{ op: PatchOperation; reason: string }>;
};

export type ApplyPatchOptions = {
  /** Slugs d'articles connus de la KB filtrée — utilisés pour rejeter les hallucinations. */
  knownArticleSlugs: Set<string>;
  /** Nom du modèle LLM appelant — propagé dans plan.generator. */
  llmModel: string;
};

export function applyPatch(
  base: TimelinePlan,
  patch: PlanPatch,
  options: ApplyPatchOptions,
): ApplyPatchResult {
  const plan: TimelinePlan = {
    ...structuredClone(base),
    generator: {
      ...base.generator,
      llm_enrichment_applied: true,
      llm_model: options.llmModel,
      kb_articles_used: collectArticles(patch),
    },
  };

  const applied: PatchOperation[] = [];
  const rejected: ApplyPatchResult["rejected"] = [];
  let evtCounter = plan.events.length;
  let brCounter = plan.branches.length;

  const nextId = (prefix: "evt-llm" | "br-llm"): string => {
    const counter = prefix === "evt-llm" ? ++evtCounter : ++brCounter;
    return `${prefix}-${String(counter).padStart(3, "0")}`;
  };

  for (const op of patch.operations) {
    const slugCheck = checkSlugs(op, options.knownArticleSlugs);
    if (slugCheck) {
      rejected.push({ op, reason: slugCheck });
      continue;
    }

    try {
      switch (op.op) {
        case "add_event": {
          const event: TimelineEvent = {
            id: nextId("evt-llm"),
            type: op.event.type,
            at_min: op.event.at_min,
            why: op.why,
            source: "llm",
            confidence: op.confidence,
            advice: op.event.advice,
          };
          plan.events.push(event);
          break;
        }

        case "replace_event": {
          const idx = plan.events.findIndex((e) => e.id === op.target_event_id);
          if (idx === -1) {
            rejected.push({ op, reason: `target_event_id ${op.target_event_id} introuvable` });
            continue;
          }
          const prev = plan.events[idx];
          plan.events[idx] = {
            ...prev,
            type: op.event.type ?? prev.type,
            at_min: op.event.at_min ?? prev.at_min,
            advice: op.event.advice ?? prev.advice,
            why: op.why,
            source: "llm",
            confidence: op.confidence,
          };
          break;
        }

        case "delete_event": {
          const idx = plan.events.findIndex((e) => e.id === op.target_event_id);
          if (idx === -1) {
            rejected.push({ op, reason: `target_event_id ${op.target_event_id} introuvable` });
            continue;
          }
          plan.events.splice(idx, 1);
          break;
        }

        case "set_target_timeline": {
          const stamped = {
            ...op.value,
            timeline: op.value.timeline?.map((iv) => ({
              ...iv,
              source: "llm" as const,
              why: iv.why ?? op.why,
            })),
          };
          plan.race_targets[op.target] = stamped;
          break;
        }

        case "add_branch": {
          const branch: Branch = {
            id: op.branch.id ?? nextId("br-llm"),
            trigger: op.branch.trigger,
            action: op.branch.action,
            why: op.why,
            source: "llm",
            max_fires: op.branch.max_fires,
          };
          plan.branches.push(branch);
          break;
        }
      }
      applied.push(op);
    } catch (err) {
      rejected.push({ op, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  // Tri stable des events par at_min après ajouts/remplacements.
  plan.events.sort((a, b) => a.at_min - b.at_min);

  return { plan, applied, rejected };
}

function collectArticles(patch: PlanPatch): string[] {
  const set = new Set<string>();
  for (const op of patch.operations) {
    for (const slug of op.kb_articles_used) set.add(slug);
  }
  return Array.from(set).sort();
}

function checkSlugs(op: PatchOperation, known: Set<string>): string | null {
  for (const slug of op.kb_articles_used) {
    if (!known.has(slug)) return `kb_articles_used contient un slug inconnu: ${slug}`;
  }
  return null;
}
