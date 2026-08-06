# Token Budget Analysis

Skills consume context tokens every time they load. This analysis quantifies the cost and checks whether the skill uses progressive disclosure effectively.

## Token counting

Estimate tokens using the approximation: **1 token ≈ 4 characters** (English text average). For each file in the skill directory, compute `ceil(char_count / 4)`.

## Token tiers

| Tier | What | When paid | Files |
|---|---|---|---|
| T1 — Listing | `description` from frontmatter | Every session, during skill selection | frontmatter only |
| T2 — Body | SKILL.md body (below frontmatter) | When the skill is triggered | SKILL.md |
| T3 — References | Files under `references/`, `scripts/`, other bundled files | On demand, when instructions say to load them | each reference file individually |

## Metrics to compute

For the skill under review, compute:

1. **max_tokens** — total tokens if every file is loaded simultaneously: SKILL.md + all references + all scripts. This is the ceiling.
2. **min_tokens** — tokens for SKILL.md body alone (the minimum a triggered skill costs). This is the floor.
3. **progressive_disclosure_ratio** — `1 - (min_tokens / max_tokens)`. A ratio near 0 means almost everything loads every time; near 1 means heavy use of on-demand references.

## Scenarios

Extract 2–3 realistic usage scenarios from the skill's workflow and conditional-load instructions. For each scenario, list which files would be loaded and estimate total tokens.

Typical scenario patterns:

- **Minimal invocation** — user triggers the skill for a simple, single-step task. Only SKILL.md loads. Tokens = min_tokens.
- **Standard workflow** — user runs the primary workflow end-to-end. SKILL.md + the references the workflow steps explicitly read. Count only references named in the executed steps.
- **Full deep-dive** — user hits every branch: all workflow steps, all edge cases, all reference lookups. Tokens ≈ max_tokens.

For each scenario, produce:

```json
{
  "name": "Standard review workflow",
  "description": "User reviews a single skill end-to-end: static scan, judge all pillars, render one dashboard",
  "files_loaded": ["SKILL.md", "references/rubric-overview.md", "references/rubric-activation.md", ...],
  "estimated_tokens": 4200
}
```

## TOK-01 progressive-disclosure check

| Result | Condition |
|---|---|
| **FAIL** | `progressive_disclosure_ratio < 0.10` — the minimum token cost is within 10% of the maximum, meaning references add virtually nothing that isn't already loaded. There is no progressive disclosure; the skill is monolithic. |
| **WARN** | `0.10 ≤ progressive_disclosure_ratio < 0.25` — some references exist but most content is in SKILL.md. Consider splitting heavy sections into on-demand references. |
| **PASS** | `progressive_disclosure_ratio ≥ 0.25` — meaningful content is deferred to references loaded only when needed. |

When TOK-01 fails, emit:

- **Evidence:** "min_tokens = X, max_tokens = Y, ratio = Z. All reference content is loaded in every scenario."
- **Fix:** "Move [specific sections] from SKILL.md into separate reference files loaded conditionally. Target a ratio ≥ 0.25."

## TOK-02 absolute budget check

| Result | Condition |
|---|---|
| **FAIL** | `max_tokens > 15000` — the skill can consume more than 15k tokens when fully expanded. |
| **WARN** | `10000 < max_tokens ≤ 15000` — approaching the practical ceiling for a single skill. |
| **PASS** | `max_tokens ≤ 10000` |

When TOK-02 fails, identify the largest files and suggest splitting or trimming.

## Integration with rubric scoring

Token analysis checks (TOK-01, TOK-02) are scored under Pillar 3 (Structure & Token Efficiency) alongside STR-01 through STR-08. They use the same pass/warn/fail → 4/2/0 scoring.

Report the full token breakdown in the output JSON under `token_analysis`:

```json
"token_analysis": {
  "max_tokens": 8500,
  "min_tokens": 2100,
  "progressive_disclosure_ratio": 0.75,
  "progressive_disclosure_pass": true,
  "scenarios": [
    {"name": "Minimal", "description": "...", "files_loaded": ["SKILL.md"], "estimated_tokens": 2100},
    {"name": "Standard", "description": "...", "files_loaded": ["SKILL.md", "references/rubric-overview.md"], "estimated_tokens": 4800},
    {"name": "Full", "description": "...", "files_loaded": ["...all..."], "estimated_tokens": 8500}
  ]
}
```
