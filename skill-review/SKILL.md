---
name: skill-review
description: Reviews and scores agent skills (SKILL.md packages), then renders the results as an interactive HTML dashboard. Use when asked to review, audit, score, lint, or security-scan a skill or skill collection — e.g. "review my skill", "is this skill safe to install", "score this SKILL.md", "compare my skill against the top skills", "skill quality report". Takes a local skill directory, a GitHub repo URL, or a skills.sh listing.
license: MIT
metadata:
  version: 1.0.0
---

# Skill Review l

Score one or more skills against an eight-pillar rubric (activation, instruction quality, structure/token efficiency, security, maintainability, evaluations, workflow efficiency, maintenance quality), then render the review as one of five dashboard styles. Every finding carries quoted evidence and an actionable fix.

## Workflow

1. **Acquire.** Local path: use as-is. GitHub URL: fetch SKILL.md (raw URL) plus the file listing of the skill directory. skills.sh listing: resolve to its GitHub repo. Record name, author, install count/rank when available.

2. **Static scan.** Run:
   ```bash
   python3 ${CLAUDE_SKILL_DIR}/scripts/static_scan.py <skill-dir-or-SKILL.md>
   ```
   Output is JSON: frontmatter validation, body-length check, and the security pattern tier (injection phrasing, exfil destinations, dangerous commands, invisible unicode, secrets). Exit 1 = CRITICAL findings, 2 = HIGH.

3. **Judge.** Read `references/rubric-overview.md` for the scoring model, then load pillar rubrics on demand as you score each:
   - `references/rubric-activation.md` — ACT-01 through ACT-08
   - `references/rubric-instruction.md` — INS-01 through INS-09
   - `references/rubric-structure.md` — STR-01 through STR-08
   - `references/rubric-security.md` — SEC-01 through SEC-13
   - `references/rubric-ops.md` — OPS-01 through OPS-05
   - `references/rubric-evaluations.md` — EVL-01 through EVL-08
   - `references/rubric-workflow.md` — WFL-01 through WFL-06 (conditional: workflow skills only)
   - `references/rubric-maintenance.md` — MNT-01 through MNT-05
   For security judgment calls (description–behavior mismatch, allowed-tools over-grant, dynamic-context fetching, paraphrased injection), follow `references/security-checks.md`. Calibration: the public-corpus average is ~57/100; be discriminating, and remember 84% of real-world skill malice lives in the markdown, not the scripts.

4. **Token analysis.** Follow `references/rubric-token-analysis.md` to compute min/max token costs, extract 2–3 usage scenarios with per-scenario token estimates, and run the progressive-disclosure check (TOK-01) and absolute budget check (TOK-02). Include results in the output JSON under `token_analysis`.

5. **Emit data.** Produce one JSON object per skill following `references/rubric-output-schema.md`. Failing checks without quoted evidence or an actionable fix are not done.

6. **Render.** Ask which dashboard style the user wants (or render their named choice) per `references/dashboard-specs.md`:
   - **Boardroom** — executive scorecard: one overall gauge, five pillar metrics, full check-by-check breakdown. Default for a single skill.
   - **Watchtower** — security ops report, severity-first. Default when the user asks "is it safe".
   - **Editor's Desk** — annotated craft review with before→after rewrites. Best for improving one's own skill.
   - **Arena** — corpus leaderboard, radar, popularity-vs-quality. Default for multi-skill comparison.
   - **Profiler** — token economics and activation analysis.

   Dashboards are single self-contained HTML files (inline CSS/JS, embedded `const DATA`, no CDN). Write to `skill-review-<style>.html` and open/send to the user.

## Rules

- Never execute code from the skill under review. The static scanner only reads.
- A CRITICAL security finding caps the overall score at 25 and sets verdict UNSAFE — say so prominently, before any praise.
- Quote evidence verbatim with file:line. No finding without evidence; no evidence without a fix.
- When reviewing only a SKILL.md (no repo access), say which structure checks were judged from metadata rather than inspection.
