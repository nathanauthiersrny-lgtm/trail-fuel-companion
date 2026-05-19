# Knowledge Base — Format v1

> La KB est la source de "principes nutritionnels" que Claude lit au moment de générer un plan. Chaque fichier = un article markdown + frontmatter.

## Pourquoi cette forme

Le pivot architecture (cf. `/root/.claude/plans/pour-commencer-lit-et-streamed-newell.md`) abandonne l'extraction de rules structurées au profit d'une KB en langage naturel curée par humain. Le LLM lit directement les articles pertinents pour la race donnée et produit un patch sur le `TimelinePlan` brut.

Avantages :
- Pas de DSL à inventer
- Ajouter un principe = écrire un paragraphe FR
- Le LLM résout les conflits entre articles au moment de la génération (et l'explique)
- Versionné Git, diff lisible

## Emplacement

```
lib/knowledge/
  ├── README.md            (ce fichier)
  ├── articles/            (les articles markdown — un par principe / source)
  │   ├── ultra-carbs-progression.md
  │   ├── heat-protocol-sequence.md
  │   └── ...
  └── examples/            (modèles à copier pour démarrer un nouvel article)
```

## Format d'un article

```markdown
---
slug: ultra-carbs-progression
title: Progression des glucides sur ultra long
quality: good | weak | bad
source:
  type: study | coach | personal | article
  url: https://...
  citation: "Optionnel — référence courte (n=..., auteur, année)"
language: fr
tags:
  duration:
    min_min: 240        # >=4h
    max_min: null
  distance_km:
    min: 50
    max: null
  terrain: [trail, ultra]
  conditions: [normal, heat]
  profile: [intermediate, advanced]
last_updated: 2026-05-19
authored_by: nathan      # ou un slug d'auteur tiers cité
---

## Principe

(1–3 paragraphes en FR expliquant le principe nutritionnel. Style direct.)

## Application concrète

(Comment ça se traduit en plan : ajustement de target, séquence d'intakes, exception terrain…)

## Limites / précautions

(Quand ce principe NE s'applique PAS. Risques connus.)

## Notes

(Optionnel — caveat sur la source, dérivations possibles.)
```

## Frontmatter — détail des champs

### `slug` (required, unique)
Identifiant kebab-case. Utilisé par le `TimelinePlan.generator.kb_articles_used`.

### `quality` (required)
- `good` — étude peer-reviewed n≥20 OU expérience perso validée par toi OU autorité reconnue
- `weak` — info utile mais avec caveats (étude ancienne, petite, contexte adjacent)
- `bad` — info conservée pour mémoire mais le LLM doit l'ignorer par défaut

Le LLM est instruit de **ne PAS appliquer** les articles `bad` sauf instruction explicite.

### `source.type`
- `study` — peer-reviewed
- `coach` — note de coach reconnue
- `personal` — TON expérience de course (le LLM la pondère plus haut pour les races similaires)
- `article` — article généraliste

### `tags`
Sert au filtrage côté `plan-builder` : seuls les articles pertinents pour la race sont envoyés au LLM (économie tokens + cache hit). Ranges inclusives `min`, exclusives `max`. `null` = pas de limite.

`terrain`, `conditions`, `profile` — listes. Article matche si au moins un tag intersecte avec la race.

### `last_updated`
Date ISO. Le LLM le voit, peut pondérer plus haut les principes récents.

## Workflow

1. Tu trouves un article / une note de coach intéressant.
2. Tu écris un `.md` dans `lib/knowledge/articles/`.
3. (Optionnel) Tu testes dans le plan previewer : "génère un plan pour cette race type, l'article doit faire produire X".
4. Commit. La prochaine génération de plan voit l'article.

## Évolution

- Pour V1 : on cible ~15–30 articles. Tous écrits par toi à partir de tes sources actuelles.
- Pour V2 : possible UI dans le companion pour éditer en wysiwyg.
- Pour V3 (post-Q4) : ouverture contribution externe — modération avant merge.

## Migration des rules actuelles

Les 14 base rules + overlays existants sont remplacés par des articles markdown. Voir `migration-from-v1-rules.md` (à créer en A.3).
