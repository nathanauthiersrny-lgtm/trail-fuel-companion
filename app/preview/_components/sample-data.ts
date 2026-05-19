/**
 * Données d'amorçage du previewer — un race context + un brut plan plausibles.
 * Le brut plan ici imite la sortie de l'engine déterministe mobile (cf.
 * trail-fuel/docs/timeline-plan-examples/).
 */

export const SAMPLE_RACE_CONTEXT = {
  duration_min: 480,
  distance_km: 65,
  session_type: "long",
  intensity: "moderate",
  temperature_c: 28,
  humidity_high: true,
  exposure: "sun",
  terrain_type: "mixed_trail",
  inventory_summary: [
    { kind: "gel", total_carbs_g: 250, count: 10 },
    { kind: "bar", total_carbs_g: 180, count: 6 },
    { kind: "drink_mix", total_carbs_g: 120, count: 4 },
  ],
  has_gpx: true,
  gpx_summary: {
    total_climb_m: 2200,
    total_descent_m: 2200,
    notable_climbs: [
      { from_km: 12, to_km: 18, avg_grade: 0.08 },
      { from_km: 38, to_km: 46, avg_grade: 0.1 },
    ],
  },
  filter_tags: {
    terrain: ["trail", "ultra"],
    conditions: ["heat", "humid"],
    profile: "intermediate",
  },
};

export const SAMPLE_BRUT_PLAN = {
  version: 1,
  race_id: "race-sample",
  generated_at: new Date().toISOString(),
  generator: {
    engine_version: "2.0.0-a2",
    llm_enrichment_applied: false,
  },
  race_targets: {
    carbs_per_hour_g: { default: 60 },
    fluid_per_hour_ml: { default: 730 },
    sodium_per_hour_mg: { default: 900 },
  },
  events: [
    { id: "evt-001", type: "intake", at_min: 30, why: "Apport 20g carbs (60g/h)", source: "engine", confidence: 1, advice: { preferred_kinds: ["gel", "bar", "real_food"], carbs_target_g: 20 } },
    { id: "evt-002", type: "intake", at_min: 50, why: "Apport 20g carbs (60g/h)", source: "engine", confidence: 1, advice: { preferred_kinds: ["gel", "bar", "real_food"], carbs_target_g: 20 } },
    { id: "evt-003", type: "intake", at_min: 70, why: "Apport 20g carbs (60g/h)", source: "engine", confidence: 1, advice: { preferred_kinds: ["gel", "bar", "real_food"], carbs_target_g: 20 } },
    { id: "evt-004", type: "intake", at_min: 90, why: "Apport 20g carbs (60g/h)", source: "engine", confidence: 1, advice: { preferred_kinds: ["gel", "bar", "real_food"], carbs_target_g: 20 } },
    { id: "evt-005", type: "check_in", at_min: 50, why: "Check-in 50 min", source: "engine", confidence: 1 },
    { id: "evt-006", type: "fluid_reminder", at_min: 15, why: "Rappel hydratation", source: "engine", confidence: 1, advice: { fluid_target_ml: 365 } },
  ],
  branches: [
    {
      id: "br-skip-recovery",
      trigger: { type: "skipped_count", window_min: 60, operator: ">=", value: 3 },
      action: { type: "boost_next_intake", factor: 1.5 },
      why: "Si 3 skips en 1h : prochain intake +50%",
      source: "engine",
      max_fires: 3,
    },
  ],
  validation: { passed: true, warnings: [] },
};
