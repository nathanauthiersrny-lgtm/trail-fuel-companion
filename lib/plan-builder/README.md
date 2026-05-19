# Plan Builder

> Couche d'enrichissement LLM du `TimelinePlan`. Reçoit un plan brut + contexte race + KB filtrée, produit un patch JSON validé par l'engine.

## Pourquoi

Voir `/root/.claude/plans/pour-commencer-lit-et-streamed-newell.md`. Le pivot architecture remplace le DSL/rules engine par : engine déterministe simple (mobile) + LLM enrichment (companion online) + runtime offline.

Le plan builder est la pièce qui rend l'app "intelligente" — sans elle, le runtime fonctionne mais le plan est générique. Avec, le plan est adapté au coureur, à la météo, au profil GPX, et aux principes nutritionnels curés dans la KB.

## Flow

```
1. Mobile envoie : race + GPX résumé + inventaire + plan brut (TimelinePlan)
2. Companion filtre la KB par tags (race.tags ∩ article.tags)
3. Companion construit le prompt :
   - SYSTEM = system-prompt.md + KB articles concaténés (cached via cache_control)
   - USER   = race context + brut plan
4. Claude (haiku-4-5) appelle l'outil `emit_plan_patch`
5. Companion valide le patch (zod) + applique sur le plan brut → plan enrichi
6. Companion renvoie : plan enrichi + diff + warnings
7. Mobile affiche le diff au user, qui accepte/refuse modif par modif
```

## Cache strategy

- **Cacheable** (long stable) :
  - system-prompt.md
  - Tous les articles de la KB (sérialisés)
  - Tool schema `emit_plan_patch`
  → `cache_control: { type: "ephemeral" }` sur le dernier bloc cacheable
- **Non-cacheable** (par race) :
  - Race context (durée, météo, terrain spécifique)
  - Brut plan
  - GPX résumé (segments + slope distribution)

Cible : 90% cache hit ⇒ ~$0.0001/plan avec haiku-4-5.

## Files (à créer en A.3)

```
lib/plan-builder/
  ├── README.md                  (ce fichier)
  ├── system-prompt.md           (le prompt système, écrit en A.1)
  ├── plan-patch-schema.ts       (zod schema du PlanPatch — A.3)
  ├── kb-filter.ts               (filtre articles par tags — A.3)
  ├── prompt-builder.ts          (construit messages + cache_control — A.3)
  ├── claude-call.ts             (appel Anthropic SDK + retry — A.3)
  ├── apply-patch.ts             (applique PlanPatch sur TimelinePlan — A.3)
  └── __tests__/                 (tests sur la composition prompt + apply-patch)
```

## Endpoint

`app/api/generate-plan/route.ts` (A.3) :
- POST `{ race, brut_plan }`
- → `{ enriched_plan, diff, warnings, debug?: { latency_ms, tokens, cache_hit } }`

## Modèle Claude

- **Plan generation** : `claude-haiku-4-5` (rapide, ~1-2s, suffisant pour le pattern matching sur la KB)
- **Fallback / qualité haute** : `claude-sonnet-4-6` (utilisé si haiku produit du JSON invalide 2x, ou sur demande explicite "regenerate with sonnet" dans le previewer)
- **Calibration post-course (Phase B / A.4)** : `claude-sonnet-4-6` (analyse plus complexe, rare donc coût OK)

Voir le skill `claude-api` pour les détails d'utilisation du SDK Anthropic + prompt caching.
