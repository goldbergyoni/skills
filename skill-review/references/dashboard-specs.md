# Dashboard Specifications

Five competing dashboard designs. Each is generated as a SINGLE self-contained HTML file: no CDN fonts, no external JS/CSS, all review data embedded as an inline `const DATA = {...}` JSON block. Each must work offline, opened straight from disk. All include a skill switcher when multiple skills are reviewed.

Shared data source: the per-skill JSON produced by the rubric (see rubric.md schema). Shared band colors: A/90+ green `#10b981`, B/75+ lime `#84cc16`, C/60+ amber `#f59e0b`, D/40+ orange `#f97316`, F red `#ef4444`. Verdict colors: SAFE green, REVIEW amber, UNSAFE red.

## 1. Boardroom — Executive Scorecard

The clean executive summary. Audience: a maintainer who wants the whole picture in 10 seconds, then full drill-down.

- **Aesthetic:** light, Stripe/Linear-grade restraint. System font stack, generous whitespace, 1px hairline borders, no gradients louder than 3%.
- **Hero row:** skill name + author + rank/installs · verdict chip · one large donut gauge with the overall score and grade letter inside.
- **Metric strip:** five pillar cards — score, weight label, thin progress bar, delta vs corpus average (▲/▼).
- **Breakdown:** the heart of it. Every rubric check as a row grouped under pillar headers: check ID chip, name, 0–4 score as segmented bar, status dot, one-line note; failing/warning rows expand (`<details>`) to evidence quote + fix.
- **Footer panels:** "Working well" (strengths) and "Fix first" (headline fixes with impact tags, before→after in red/green).
- Print-friendly (`@media print`), score history slot reserved.

## 2. Watchtower — Security Operations Report

Severity-first. Audience: someone deciding "is this safe to install?"

- **Aesthetic:** dark SOC console — near-black `#0a0e17`, monospace for data, thin cyan/red accents. Tasteful, not cyberpunk kitsch.
- **Top:** corpus threat board — one row per skill: verdict badge, severity heat cells (C/H/M/L counts), security pillar score.
- **Per-skill detail:** verdict banner, findings feed (rule ID, severity tag, file:line, evidence rendered as code, remediation line), checks-passed grid showing the full SEC-01…13 coverage so "clean" is visibly *verified* clean, not unexamined.
- **Side panel:** quick-wins checklist (the grep-able one-liners), threat-taxonomy legend mapping rule IDs to categories (injection, exfil, obfuscation, autonomy, supply chain).
- Empty-state design matters: most top skills are SAFE — make "0 findings, 13 checks run" feel earned, with the checks enumerated.

## 3. Editor's Desk — Craft Review

A senior skill author's annotated manuscript review. Audience: the creator who wants to get *better*, not just get a number.

- **Aesthetic:** editorial. Warm paper `#faf8f3`, serif display (Georgia stack), red-pencil accents, a rubber-stamp grade visual.
- **Lead:** the narrative verdict as a pull-quote style paragraph — opinionated, plain language.
- **"What's working":** 2–4 praise cards (craft reviews that only criticize get ignored).
- **Annotations:** margin-note layout — quoted lines from the actual SKILL.md on the left (typewriter style), the editor's note on the right, connected by a red line. Sourced from check evidence.
- **Rewrite cards:** before→after blocks, strikethrough red original above green replacement, with the "why" beneath.
- **Revision list:** numbered, priority-ordered, each item one imperative sentence.
- Minimal numbers — the grade stamp and pillar mini-meters only. Prose carries the weight.

## 4. Arena — Corpus Benchmark

Where do you stand? Audience: a creator comparing against the field.

- **Aesthetic:** sports-analytics — dark slate, bold condensed numerals, team-color accents per skill.
- **Leaderboard:** all skills ranked by review score with grade, verdict, pillar micro-bars, and a "popularity vs quality" delta column (install rank − quality rank, ▲/▼) — the most interesting number in the corpus.
- **Radar:** five-axis SVG spider chart (hand-rolled, no libs) — selected skill vs corpus average overlay.
- **Distribution strip:** score axis with the published public-corpus average (~57) marked, each skill a dot, selected skill highlighted.
- **Head-to-head:** two-skill comparison columns with per-pillar winner highlights.

## 5. Profiler — Token Economics & Activation Lab

Skills are paid for in context tokens. Audience: the efficiency-minded author.

- **Aesthetic:** dev-tools — IDE dark `#1e1e2e`, monospace everywhere, flame-chart energy.
- **Cost model (explain it in the UI):** Tier 1 *always paid* — description in the skill listing, every session; Tier 2 *paid when triggered* — SKILL.md body; Tier 3 *paid on demand* — references/scripts. Stacked horizontal bars per skill, log-ish scale, token estimates.
- **Description anatomy:** char gauge against 1024 (spec) and 1536 (listing truncation) limits; extracted trigger phrases as highlighted chips; POV check; word count vs corpus.
- **Disclosure map:** file-tree visualization of SKILL.md → supporting files with size and one-level-deep rule violations flagged.
- **Density meters:** body lines vs 500 cap, words/line, duplication and novelty scores from the rubric.
- **Verdict line per skill:** "what this skill costs the context window, and what it buys."
