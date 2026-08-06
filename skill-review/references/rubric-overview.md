# Rubric Overview

Synthesized from: Anthropic skill-authoring best practices, Tessl Review/Task Evals, claudelint (43 rules), SkillCheck (corpus of 2,568 skills, avg 57/100), agent-ecosystem/skill-validator, obra/superpowers writing-skills, daymade skill-reviewer, Cisco skill-scanner, Snyk ToxicSkills, Invariant mcp-scan.

## Scoring model

Five pillars, each 0–100, weighted into an overall 0–100:

| Pillar | Weight | What it measures |
|---|---|---|
| Activation & Metadata | 15% | Will the skill trigger when it should — and only then? |
| Instruction Quality | 18% | Once loaded, do the instructions actually steer the agent? |
| Structure & Token Efficiency | 15% | Does every line earn its permanent context cost? |
| Security & Trust | 20% | Can a stranger install this safely? |
| Maintainability & Ops | 7% | Will it still work in six months, on another machine? |
| Evaluations | 10% | Does the skill ship with evals that actually test its value? |
| Efficient Workflow | 8% | (Conditional) Does the workflow run robustly and visibly? |
| Maintenance Quality | 7% | Does the skill learn, improve, and leave useful artifacts? |
| Rules & Guidelines Quality | 8% | (Conditional) Are the coding rules non-redundant, non-lintable, tight, and correctly placed? |

**Conditional pillars:** Efficient Workflow (WFL) is scored only for skills that dictate a multi-step workflow. Rules & Guidelines Quality (RUL) is scored only for skills whose references contain coding instructions or best-practice directives. Each excluded conditional pillar has its weight redistributed proportionally across the remaining pillars.

Each check scores 0–4 (judge checks) or pass/warn/fail → 4/2/0 (static checks). Pillar score = 100 × weighted mean / 4.

**Evaluations gate:** if EVL-01 (evals-exist) fails, all remaining EVL checks auto-score 0.

**Security gate:** any CRITICAL security finding caps the overall score at 25 and sets verdict UNSAFE, regardless of other pillars. Verdict is SAFE (no HIGH/CRITICAL), REVIEW (HIGH present), or UNSAFE (CRITICAL present).

**Bands:** 90–100 A "Exemplary" · 75–89 B "Solid" · 60–74 C "Needs work" · 40–59 D "At risk" · <40 F "Do not ship". (Corpus calibration: published average for public skills is ~57.)

## Pillar reference files

- `rubric-activation.md` — Pillar 1: Activation & Metadata (ACT-01 through ACT-09)
- `rubric-instruction.md` — Pillar 2: Instruction Quality (INS-01 through INS-09)
- `rubric-structure.md` — Pillar 3: Structure & Token Efficiency (STR-01 through STR-08)
- `rubric-security.md` — Pillar 4: Security & Trust (SEC-01 through SEC-13)
- `rubric-ops.md` — Pillar 5: Maintainability & Ops (OPS-01 through OPS-05)
- `rubric-evaluations.md` — Pillar 6: Evaluations (EVL-01 through EVL-08)
- `rubric-workflow.md` — Pillar 7: Efficient Workflow (WFL-01 through WFL-07) — conditional
- `rubric-maintenance.md` — Pillar 8: Maintenance Quality (MNT-01 through MNT-05)
- `rubric-rules.md` — Pillar 9: Rules & Guidelines Quality (RUL-01 through RUL-04) — conditional
- `rubric-token-analysis.md` — Token budget analysis: scenarios, progressive-disclosure check
- `rubric-output-schema.md` — Output JSON schema for review results

## Output JSON schema

See `rubric-output-schema.md` for the full per-skill JSON schema.
