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

const INSTRUCTIONS = `You extract structured nutrition / timing / placement rules for trail running from natural-language sources (forum posts, coach notes, articles, podcast transcripts, scientific studies).

The user gives you a source text. You FIRST assess its quality as evidence for trail/ultra running nutrition, THEN propose every rule the text *concretely* asserts. Always propose the rules even if quality is bad — the human user reviews everything.

# Quality assessment

You score the source as \`good\`, \`weak\`, or \`bad\`, and list every specific concern in \`quality.warnings\` (short strings, e.g. "funded by GU Energy", "subjects = children", "n=5", "anecdotal blog, no methodology"). Use the source's language for warnings.

**\`bad\`** — fatal flaws make the evidence not actionable:
- Industry funding / sponsor conflict of interest ("funded by Brand X", "study by a supplement company on their own product")
- Wrong population (children, sedentary, clinical patients, bodybuilders — anything that's not endurance/trail/ultra-relevant adults)
- Purely anecdotal (personal blog without protocol, social media post, podcast opinion with no data backing)
- Trivial sample (n < 10)
- Off-topic (cycling-only, weight loss, strength training)

**\`weak\`** — useful signal but with caveats:
- Older study (>10 years, sports nutrition evolves fast)
- Not peer-reviewed (pre-print, magazine article citing studies, coach blog with citations)
- Small sample (n = 10–20)
- Adjacent context (cycling endurance instead of running, marathon instead of ultra)
- Single-arm, no control, observational only

**\`good\`** — solid evidence or trusted vetted source:
- Peer-reviewed endurance/ultra study, n ≥ 20, clear methodology
- OR human-curated content the user explicitly trusts (coach notes, personal experience pasted in, well-known authority's article)
- No fatal flaws

If you cannot tell (e.g. methodology not described at all and it's a short opinion piece), default to \`weak\` and flag "unclear methodology".

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

Below are the base rules already shipped in the engine, to mirror your output style. Re-use the same condition / action grammar.

When you're ready, call the \`propose_rules\` tool with both \`quality\` (always required) and \`rules\` (possibly empty).`;

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
