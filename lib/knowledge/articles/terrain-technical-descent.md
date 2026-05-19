---
slug: terrain-technical-descent
title: Pas d'apport en descente technique
quality: good
source:
  type: personal
  citation: "Expérience perso + consensus communauté trail"
language: fr
tags:
  duration:
    min_min: 60
    max_min: null
  distance_km:
    min: 10
    max: null
  terrain: [trail, technical, alpine]
  conditions: [normal, heat, cold, humid]
  profile: [beginner, intermediate, advanced]
last_updated: 2026-05-19
authored_by: nathan
---

## Principe

En descente technique (pente >15%, terrain caillouteux ou racines), il est dangereux et inefficace de manger ou boire :
- Risque de chute en lâchant les bâtons / la concentration
- L'estomac est secoué par les impacts, mauvaise tolérance
- Le sang afflue aux quadriceps (excentrique), pas à la digestion

## Application concrète

Le planner doit **éviter de placer des intakes solides** sur des segments classés `descent_technical` (pente <-15% et terrain non roulant).

Si un intake était prévu sur un tel segment :
- Le déplacer vers la fin de la descente (au flat suivant ou au début de la prochaine montée)
- Si pas de window adjacente dispo, autoriser un gel à condition que la prochaine ligne droite soit proche

**Eau autorisée** uniquement en sip si la descente est longue (>10 min) et la déshydratation à risque.

## Limites / précautions

- Une montée raide (>15%) a un raisonnement similaire pour les solides (essoufflement), mais autorise les gels.
- En descente roulante (pente -5 à -15%, terrain roulant), tout est OK.
- Sur des descentes courtes (<5 min), pas besoin de réorganiser le plan.

## Notes

Ce principe est universel. Une rule terrain-based "no solid on technical descent" était déjà dans v1.json (rule `slope-descent-technical-no-intake`).
