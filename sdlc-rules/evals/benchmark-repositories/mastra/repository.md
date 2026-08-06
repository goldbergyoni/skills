# mastra

| | |
|---|---|
| **Site** | mastra (mastra-ai/mastra) — TypeScript agent framework: agents, workflows, memory, RAG, MCP, a local Studio/playground, and `mastracode` (their own coding agent) |
| **URL** | https://github.com/mastra-ai/mastra |
| **Source clone** | `source code/` (git-ignored). **1.5 GB monorepo — never clone fully.** Use `git clone --depth 50 --filter=blob:none https://github.com/mastra-ai/mastra.git "source code"`, or skip the clone and work via `gh api`. |
| **Benchmark dir** | `mastra/` |

`context/pr-list.json` exists (70 in-scope PRs, #14637 → #18753, 2026-03-25 → 2026-07-03). There is no `runs/` and no `findings_history.json`; the first run creates them (see [`../instructions.md`](../instructions.md)).

Read this whole file before reviewing. You are reviewing **AI-coding artifacts**, not application code. Knowing what this repo *is* is unusually important here, because mastra *ships* agent-shaped source files that are not artifacts.

## What this repo is

A pnpm + turborepo monorepo (~15k tracked files) for the Mastra agent framework. Strict TypeScript, vitest colocated with source, changesets for releases. Product surface: `packages/core`, `packages/cli`, `packages/memory`, `packages/rag`, `packages/mcp`, `packages/server`, `packages/playground` + `packages/playground-ui` (the Studio UI), `packages/editor`, `mastracode/` (their agent CLI/TUI), `docs/`, `examples/`, `templates/`, `client-sdks/`, `agent-sdks/`.

**AI-coding setup — three harnesses in parallel, kept deliberately in sync:**
- **Claude Code** — `.claude/skills/` (16 skills, 77 reference docs, 13 shell scripts), `.claude/commands/` (16), `.claude/settings.json` (only `enabledPlugins`; **no `hooks` key**).
- **Cursor** — `.cursor/commands/` (11, mirrors a subset of `.claude/commands/`), `.cursor/mcp.json` (one stdio server: their own `mcp-docs-server`), and 2 thin `.cursor/rules/*.mdc` pointer rules.
- **mastracode** (their own agent, dogfooded on this repo) — `.mastracode/commands/` (17), `.mastracode/skills/` (4), `.mastracode/resources/CRITICAL_PATHS.md`. Also one `.agents/skills/` skill.
- **Context files** — 21 `AGENTS.md` + 5 `CLAUDE.md`, root and per-package.

Duplication across `.claude/` / `.cursor/` / `.mastracode/` is intentional (see PR #14693 "consolidate slash commands to .mastracode as single source of truth" and #15311 "expose commands and skills in AGENTS.md for cross-agent parity"). Many PRs edit the same command in two or three harness directories at once — that is parity work, not copy-paste sloppiness.

## Artifact inventory

| Artifact type | Path | Count | Notes |
|---|---|---|---|
| Skill | `.claude/skills/*/SKILL.md` | 16 | Plus `.mastracode/skills/*` (4), `.agents/skills/*` (1), `packages/codemod/.claude/skills/*` (1) |
| Skill references | `.claude/skills/*/references/**.md` | 77 | Dense guideline docs; `react-best-practices/references/rules/*` is 26 one-rule-per-file guideline docs |
| Skill script | `.claude/skills/*/scripts/*.sh` | 13 | `docs-audit`, `mastra-smoke-test`, `builder-smoke-test` |
| Command | `.claude/commands/*.md` · `.cursor/commands/*.md` · `.mastracode/commands/*.md` | 16 / 11 / 17 | Heavy overlap by design |
| Pointer rule | `packages/playground{,-ui}/.cursor/rules/frontend.mdc` | 2 | Each is literally `AGENTS.md` under frontmatter — a genuine thin pointer |
| Context file | `AGENTS.md` · `CLAUDE.md` | 21 / 5 | Root `CLAUDE.md` is the single line `@AGENTS.md` |
| Standards doc | `docs/styleguides/*.md` | 7 | Docs-writing styleguides (DOC, REFERENCE, GUIDE_*, STYLEGUIDE); mirrored into `.claude/skills/mastra-docs/references/` |
| Settings / mcp | `.claude/settings.json`, `.cursor/mcp.json` | 2 | Both tiny |
| Hook | — | 0 | **None anywhere.** No `.cursor/hooks*`, no `hooks` key in settings.json |
| Subagent | — | 0 | No `.claude/agents/` or `.cursor/agents/` |

## Product code vs repo tooling — the false-positive trap

mastra is an agent framework, so files that *look* like artifacts are frequently shipped product. **Only the repo-development harness directories are in scope.**

**IN scope** (steers agents working *on* this repo): `.claude/**`, `.cursor/**`, `.mastracode/**`, `.agents/**`, any root/nested `AGENTS.md` and `CLAUDE.md`, `packages/*/.claude/**`, `docs/styleguides/*`.

**OUT of scope — shipped product, fixtures, or user-facing templates**, even though the paths contain `SKILL.md` / `skills/` / `agents/`:
- `packages/editor/src/ee/workspace/skills/**/SKILL.md` (8 skills) — bundled workspace skills shipped to Mastra users.
- `mastracode/web/src/mastra/public/factory-skills/**/SKILL.md` — runtime factory skills served by the product.
- `templates/**` — `template-claw-assistant/workspace/skills/*`, `template-github-review-agent/workspace/skills/*`, `template-agent-harness/AGENTS.md`. These are scaffolds users clone.
- `examples/*/src/**` — e.g. `examples/agent/src/mastra/agents/weather-fs/skills/severe-weather/SKILL.md` is a demo fixture.
- All of `packages/*/src/**`, `client-sdks/`, `agent-sdks/*/src/`, `docs/src/`.

Note the near-collision: `mastracode/AGENTS.md` (a package context file, **in** scope) vs `mastracode/web/src/...` (product, **out**). And `.mastracode/` with a leading dot (repo tooling, **in**) vs `mastracode/` (the product package). `agent-sdks/*/AGENTS.md` are package context files and are in scope; their `src/` is not.

`artifact_files` in `pr-list.json` already applies this filter — trust it, and if a PR's diff also touches product code, review **only** the listed artifact files.

## Artifact-type status

| Type | Status | Why |
|---|---|---|
| Skill | **Live — highest yield.** | 16 real skills, actively edited; 8 of the 70 PRs touch `react-best-practices/SKILL.md` alone. |
| Guideline / rule line | **Live — highest yield.** | 77 reference docs, `react-best-practices/references/rules/*` is 26 discrete rules; many PRs add or reword a single rule. |
| Skill script | **Live but thin.** | 13 `.sh` files; rarely the *subject* of a PR. Checklist is a STUB — grade conservatively. |
| Pointer rule | **Thin.** | Only 2 `.mdc` files, both already minimal pointers. Nearly zero PR churn. |
| Standards doc | **Live.** | `docs/styleguides/` (7 files) plus the mirrored copies under `.claude/skills/mastra-docs/references/`; several PRs (#13263, #15572, #17773, #13449) rework them. |
| Command | **Live.** | 44 command files across three harnesses; ~15 of the 70 PRs add or edit commands. Checklist is a STUB. |
| Subagent | **N/A.** | None exist. |
| Hook | **N/A.** | None exist, in any harness. |
| Context file | **Live — second-highest yield.** | 26 files; root `AGENTS.md` alone appears in 16 of the 70 PRs. |
| Settings / env / mcp | **Thin.** | Two tiny files, almost never changed. Checklist is a STUB. |

## Repo conventions relevant to judgment calls

These look like violations and are not. Read before filing.

- **`AGENTS.md` is deliberately telegraphic** — no punctuation, no headings in places, sentence fragments, lowercase. PR #15464 explicitly *enforced token limits on AGENTS.md*, and PR #14790 caps injected AGENTS.md reminders. Terseness here is an enforced policy, not carelessness. Do not file "unclear prose" / "add structure" findings against it; **do** still apply real checklist items (ambiguity that changes behavior, unverifiable advice).
- **`CLAUDE.md` files are pointers, not content.** Root `CLAUDE.md` is one line: `@AGENTS.md`. Nested ones are similarly thin. "Too short / missing sections" is not a finding — that is the intended design.
- **`.cursor/rules/*.mdc` are pointer rules by construction** (frontmatter + the word `AGENTS.md`). They correctly contain zero code guidance.
- **Cross-harness duplication is intentional.** A command existing verbatim in `.claude/commands/`, `.cursor/commands/`, and `.mastracode/commands/` is the documented parity strategy. Do not file DRY/duplication findings across harness directories.
- **`.claude/skills/*/references/` mirrors `docs/styleguides/`** on purpose (the docs skill loads the styleguide). Same rule: not a duplication finding.
- **One rule per file** in `react-best-practices/references/rules/` is the house pattern. A new PR adding a single small `.md` there is idiomatic, not fragmentation.
- **`@path` references inside AGENTS.md/commands are the mastracode/Claude include syntax**, not broken markdown links.
- **`devin-ai-integration[bot]` authors ~10 of these PRs.** Bot-authored artifact edits are legitimate repo history here, not spam. Judge them on content like any other.

## Out of scope (do not file findings on these)

- All application/product code, `pnpm-lock.yaml`, `.changeset/*.md`, generated docs output, `dist/`.
- The product-code paths enumerated in the section above (`packages/editor/src/**/skills`, `templates/**`, `examples/*/src/**`, `mastracode/web/src/**`).
- Non-artifact files inside an in-scope PR's diff. **The unit of review is the artifact files listed in `artifact_files`.**
- Pre-existing problems in untouched artifacts.

## Calibration

**Highest-yield:** `.claude/skills/react-best-practices/**` (a SKILL plus 26 discrete guideline files — the richest guideline-checklist surface in the benchmark), `.claude/skills/mastra-smoke-test/**` and `mastra-docs/**` (large, multi-reference skills that grew fast), root `AGENTS.md` (touched by 16 PRs), the three `commands/` trees.

**Lowest-yield / expect near-zero:** `.cursor/mcp.json` and `.claude/settings.json` (a few lines each), the 2 `.mdc` pointer rules, `docs/styleguides` PRs that only fix Vale/prettier lint (#13320, #13995, #17773 are largely mechanical).

**Honest expectation:** this is a *strong* repo for this benchmark — dense artifact surface, high churn, and a team that visibly iterates on its own agent tooling. Expect a **higher** findings-per-PR rate than a typical application repo, concentrated in the skill and guideline-line checklists. Three of the ten checklists (skill-script, command, other) are STUBs, so PRs whose only artifact is a command or script will under-produce findings — that is a checklist-maturity artifact, not a repo weakness. Subagent and hook findings should be **zero**; those types do not exist here.

## PR review automation

**mastra runs [CodeRabbit](https://coderabbit.ai) on its pull requests.** Every finding filed against this repo must carry an `also_found_by` verdict — see [`../instructions.md`](../instructions.md) → "Was it already caught?".

| | |
|---|---|
| **Reviewer** | `coderabbitai[bot]` — an LLM PR-review bot |
| **Type** | bot |
| **Coverage** | **~50%** in-window (fired on 6 of 12 PRs sampled across #14637–#18799) |
| **Human line-by-line review** | Occasional — `TylerBarnes`, `DanielSLew`, `mfrachet`, `LekoArts` and other maintainers. Credit by username with `reviewer_type: "human"` |
| **Non-review bots to ignore** | `superagent-security[bot]` posts **security-scanner** output, and `github-advanced-security[bot]` is CodeQL — **do not credit either as `also_found_by`** unless it flagged the exact defect you filed |

Coverage is about half, so many PRs here will legitimately have `pr_reviewers_present: []`. Record that rather than a bare `null`.

## Other files

- `source code/` — optional shallow clone, git-ignored
- `context/pr-list.json` — 70 in-scope PRs, newest first
- `findings_history.json` — **does not exist yet**; the first run creates it (see [`../instructions.md`](../instructions.md))
