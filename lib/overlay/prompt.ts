import { readFileSync } from "node:fs";

const KNOWLEDGE_BASE_PATH =
  process.env.KNOWLEDGE_BASE_PATH ??
  "/home/vm-nathan/trail-fuel/trail-fuel/assets/knowledge/v1.json";

let cachedBaseRulesBlock: string | null = null;

function loadBaseRulesBlock(): string {
  if (cachedBaseRulesBlock) return cachedBaseRulesBlock;
  const raw = readFileSync(KNOWLEDGE_BASE_PATH, "utf8");
  const pack = JSON.parse(raw) as { version: string; rules?: unknown[] };
  const rules = Array.isArray(pack.rules) ? pack.rules : [];
  cachedBaseRulesBlock = `Trail Fuel knowledge pack v${pack.version} — ${rules.length} base rules already in the engine:\n\n${JSON.stringify(rules, null, 2)}`;
  return cachedBaseRulesBlock;
}

const INSTRUCTIONS = `You extract structured nutrition / timing / placement rules for trail running from natural-language sources (forum posts, coach notes, articles, podcast transcripts).

The user gives you a source text. You analyse it and propose every rule the text *concretely* asserts, by calling the \`propose_rules\` tool.

# Rule grammar

Each rule has a \`scope\`:
- \`race\` — modifies a per-hour target or a timing parameter, based on a race-level condition
- \`window\` — restricts what food types are allowed in a time/terrain window
- \`intake_pick\` — preferences when choosing food (prefer / avoid / forbid kinds)

Available action targets:
- race nutrition: \`carbs_per_hour_g\`, \`fluid_per_hour_ml\`, \`sodium_per_hour_mg\`, \`intensity_modifier\`
- race timing: \`first_intake_after_min\`, \`intake_interval_min\`, \`first_fluid_reminder_min\`, \`fluid_reminder_interval_min\`, \`check_in_frequency_min\`
- window: \`set_allowed_kinds\` (list of kinds or null), \`forbid_kind\` (single kind)
- intake_pick: \`prefer_kinds\`, \`avoid_kinds\`, \`forbid_kinds\`

Food kinds: \`gel\`, \`bar\`, \`drink_mix\`, \`real_food\`, \`water\`.

Common condition fields used by the engine: \`humidity_high\` (boolean), \`temperature_c\` (number), \`duration_min\` (number, total race duration), \`total_elevation_gain_m\` (number), \`intensity\` (string: easy / moderate / hard), \`slope_pct\` (number, in window scope), \`session_type\` (string: plaisir / long / dur / test / competition).

# Output rules

- Only extract rules backed by **concrete thresholds, numbers, or named conditions** in the source. Vague advice ("eat well", "hydrate enough") is NOT a rule.
- Use semantic IDs: lowercase, hyphenated (e.g. \`hot-temp-fluid-boost\`, \`steep-climb-solid-only\`).
- Always set \`source: "overlay"\`.
- One claim → one rule. Multi-part claims → multiple rules.
- \`description\` is in the **same language as the source** (French stays French, English stays English).
- For each rule, ALSO provide a \`source_quote\`: a verbatim excerpt (5-30 words) from the source that justifies the rule.
- If the source has no concrete extractable rule, return an empty \`rules\` array.

# Examples

Source (EN): "When it's above 30°C, drink at least 800 ml of fluid per hour instead of the usual 600."
→ rule: { id: "hot-temp-fluid-boost", source: "overlay", scope: "race", category: "nutrition", description: "Above 30°C: fluid 800 ml/h", condition: { field: "temperature_c", op: "gt", value: 30 }, action: { target: "fluid_per_hour_ml", op: "set", value: 800 } }
   source_quote: "above 30°C, drink at least 800 ml of fluid per hour"

Source (FR): "Sur du dénivelé > 12%, je passe en solide uniquement, pas de gel."
→ rule: { id: "steep-climb-solid-only", source: "overlay", scope: "window", category: "placement", description: "Pente > 12% : solide uniquement, pas de gel", condition: { field: "slope_pct", op: "gt", value: 12 }, action: { op: "set_allowed_kinds", kinds: ["bar", "real_food"] } }
   source_quote: "Sur du dénivelé > 12%, je passe en solide uniquement"

# Reference

Below are the base rules already shipped in the engine, to mirror your output style. Re-use the same condition / action grammar.`;

export function buildSystemPrompt() {
  return [
    {
      type: "text" as const,
      text: INSTRUCTIONS,
    },
    {
      type: "text" as const,
      text: loadBaseRulesBlock(),
      cache_control: { type: "ephemeral" as const },
    },
  ];
}
