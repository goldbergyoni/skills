# inbox-zero

| | |
|---|---|
| **Site** | Inbox Zero (elie222/inbox-zero) — open-source AI email assistant / email client |
| **URL** | https://github.com/elie222/inbox-zero |
| **Source clone** | `source code/` (git-ignored). Clone with `git clone --filter=blob:none https://github.com/elie222/inbox-zero.git "source code"` — **full history is required**, not `--depth`. Duplication checks must verify a path existed at a PR's merge commit; run 1 used a shallow clone, which made every path look newly added and nearly produced 20+ bogus refutations during the audit |
| **Benchmark dir** | `inbox-zero/` |

**No benchmark run exists yet for this repo.** `context/pr-list.json` exists; there is no `runs/` and no `findings_history.json` — the first run creates them (see [`../instructions.md`](../instructions.md)).

Read this whole file before reviewing. You are reviewing **AI-coding artifacts**, not application code. Knowing what harnesses this repo runs and which artifact types it actually has determines which checklists can legitimately fire.

## What this repo is

**Inbox Zero is a Next.js/TypeScript monorepo** (pnpm workspaces + Turborepo, `apps/web` as the main app, Prisma/PostgreSQL, Redis/Upstash, Biome via ultracite, Vitest + Playwright). None of that is under review — it is background for judging whether a piece of advice in an artifact is accurate.

What matters here: **this is one of the most heavily AI-tooled repos in the benchmark.** It runs *multiple harnesses simultaneously* and keeps them roughly in sync:

- **Claude Code** — `.claude/skills/` (28 skills), `.claude/agents/reviewer.md`.
- **Cursor** — `.cursor/rules/*.mdc` (10), `.cursor/environment.json`, `.cursor/Dockerfile`, `.cursor-plugin/plugin.json`.
- **Codex** — `.codex/config.toml` + `.codex/agents/*.toml` (TOML-native mirrors of the Claude subagents).
- **Conductor** — `.conductor/settings.toml`.
- **Clawhub / OpenAI-agent packaging** — `clawhub/inbox-zero-api/SKILL.md` plus `agents/openai.yaml` sidecars inside several skills.

The history matters: the repo **migrated `.cursor/commands/` and `.cursor/skills/` into `.claude/skills/`, then collapsed `.claude/commands/` into skills too.** Many in-scope PRs are that migration. Commands exist in the PR record but **not in the current tree**.

## Artifact inventory

| Artifact type | Path | Count | Notes |
|---|---|---|---|
| Skill | `.claude/skills/*/SKILL.md` | 28 | 130–686 lines each; `agent-browser` is vendored from `vercel-labs/agent-browser` via `skills-lock.json` |
| Skill | `clawhub/inbox-zero-api/SKILL.md` | 1 | Published API skill, has `homepage` + `metadata` frontmatter |
| Skill reference files | `.claude/skills/*/references/*.md`, `testing/*.md` | 15 | Pure guideline docs — guideline-rule checklist only |
| Skill script | `.claude/skills/*/{scripts,templates}/*.sh` | 4 | `get-pr-review-comments.sh`, 3 agent-browser templates |
| Pointer rule | `.cursor/rules/*.mdc` | 10 | 4 top-level + 6 under `features/`; 30–491 lines |
| Subagent | `.claude/agents/reviewer.md` | 1 | plus 2 `.codex/agents/*.toml` mirrors |
| Context file | `CLAUDE.md`, `AGENTS.md` | 2 | `CLAUDE.md` is a **one-line `@AGENTS.md` pointer**; `AGENTS.md` is 79 lines |
| Settings / env | `.cursor/environment.json`, `.conductor/settings.toml`, `.codex/config.toml`, `.cursor-plugin/plugin.json` | 4 | No `.mcp.json`, no `.claude/settings.json` |
| Command | — | 0 | Existed historically, migrated into skills |
| Hook | — | 0 | No `.cursor/hooks.json`, no `hooks` key anywhere |

## Artifact-type status

| Type | Status | Reason |
|---|---|---|
| **Skill** | **Live — highest-yield.** | 29 `SKILL.md` files, actively churned. This is where the benchmark's signal is. |
| **Guideline / rule line** | **Live — highest-yield.** | Skills and `.mdc` rules are dense with concrete TypeScript/Prisma/Next.js advice. Every discrete line gets its own pass. |
| **Skill script** | **Thin but real.** | 4 shell files. Checklist is a STUB — judge conservatively. |
| **Pointer rule** | **Live, and structurally interesting.** | `.cursor/rules/*.mdc` are *not* thin pointers — several are 200–500-line feature guides. See conventions below. |
| **Standards doc** | **N/A-ish / Thin.** | No `.claude/standards/`, `standards/`, or `conventions/`. `ARCHITECTURE.md` and `qa/browser-flows/*.md` are the nearest analogues; treat as out of scope unless a PR frames them as agent instructions. |
| **Command** | **Historical only.** | Zero in HEAD, but ~12 `.claude/commands/*.md` and 4 `.cursor/commands/*.md` appear in the PR record — mostly in deletion/migration diffs. Checklist is a STUB. |
| **Subagent** | **Thin.** | One `.claude/agents/reviewer.md` + 2 `.codex` TOML mirrors. Checklist is a STUB. |
| **Hook** | **N/A.** | No `.cursor/hooks.json`, no `.cursor/hooks/`, no `.claude/settings.json` at all — so no `hooks` key can exist. |
| **Context file** | **Live but small.** | `CLAUDE.md` → `@AGENTS.md`; all real content is in `AGENTS.md`. |
| **Settings / env / mcp** | **Thin.** | `.cursor/environment.json` (4 keys), `.conductor/settings.toml`, `.codex/config.toml`. No MCP config, no permission allow/deny lists. |

## Repo conventions relevant to judgment calls

These look like violations and are not. Read before filing.

- **`CLAUDE.md` contains exactly one line: `@AGENTS.md`.** This is deliberate single-sourcing across harnesses, not an empty/underspecified context file. Do not file "CLAUDE.md is missing X" — grade `AGENTS.md`.
- **Standing conditions — the full list.** These are repo-wide house styles. Do **not** file them on a PR that merely edits an affected file. **Do** file them when a PR creates a *new* artifact carrying the condition — and when it does, file the whole set together, not a subset:
  - **No skill declares `version:`** (`SK04`). Zero of 29.
  - **Almost no skill declares `allowed-tools:`** (`SK03`). Only the vendored `agent-browser` does.
  - **No skill ships `evals/`** anywhere in the repo (`SK23`, `SK24`, `SK26`).
  - **`.claude/skills/testing/` keeps six loose `.md` files in the skill root** and `address-pr-comments` keeps a `.sh` there (`SK15`).

  `SK03` and `SK04` always co-occur on a new skill — a skill missing one is missing both. Run 1 filed `SK03` on 7 new skills while suppressing `SK04` on the same files, which corrupted both counts.
- **`.cursor/rules/*.mdc` are deliberately fat.** `features/schedule.mdc` is 491 lines, `ultracite.mdc` 344. The rule-checklist's "thin pointer" ideal is *not* this repo's model — they use `.mdc` as feature documentation for Cursor. This is a real, arguable finding, but it is a **single systemic design choice**, not 10 independent ones.
- **`.mdc` frontmatter with empty `description:` / `globs:` and `alwaysApply: false`** is the Cursor scaffold default, left in place across most feature rules. Consistent, intentional-by-neglect.
- **Duplication: two cases, only one is blessed.** Getting this wrong in either direction was the largest error source in run 1.
  - **Blessed — cross-harness mirroring.** `.claude/agents/reviewer.md` ↔ `.codex/agents/reviewer.toml`, `.cursor/skills/` ↔ `.claude/skills/` mid-migration. The same content in two formats so each harness finds it. **Never file `GR01` here.**
  - **A real finding — same-harness duplication and drift.** A `.claude` skill restating `AGENTS.md`; the same advice carrying *different thresholds* in `AGENTS.md`, `review/SKILL.md`, and `ultracite.mdc`; `pr-loop` and `address-pr-comments` giving contradictory instructions on resolving PR threads. **File these.**

  The test is not "does this text appear twice" but "would an agent loading both get one instruction or two conflicting ones."

- **Verify duplication at the PR's merge commit, not at HEAD.** The skill corpus roughly doubled over the reviewed window, so a file that duplicates advice today may not have existed when the PR landed. Confirm with `gh pr view <N> --json mergeCommit` then `git cat-file -e <sha>:<path>`. This requires a **full clone** — a shallow clone makes every path look newly added and produces bogus results in both directions.
- **`agent-browser` is vendored, not authored.** It comes from `vercel-labs/agent-browser` with a `computedHash` in `skills-lock.json`. Its 686-line `SKILL.md` and 7 reference files are third-party; findings against it are not actionable by this repo.
- **Migration PRs look like moves but are not.** Many diffs are `.cursor/commands/x.md` → `.claude/skills/x/SKILL.md`. **Do not skim them.** A rename into `SKILL.md` changes the file's artifact *type*, so the skill checklist now applies where the command checklist did before — most importantly the frontmatter checks. Real case: PR 1587 renders as +4/−4 across 37 files, and 14 of those renames produced `SKILL.md` files with no `name`/`description`, i.e. skills that cannot load. Read what the renamed file actually contains at the PR head.

## Out of scope (do not file findings on these)

- Application code: `apps/`, `packages/`, `scripts/`, `docker/`, `charts/`, `copilot/` (AWS Copilot IaC — **not** GitHub Copilot).
- `pnpm-lock.yaml`, `skills-lock.json`, `version.txt`, `docs/openapi.json`, generated changelog entries.
- `.github/workflows/*` (including `claude-code-review.yml` — CI config, not an artifact type in the routing table).
- `.vscode/settings.json`, `biome.json`, `tsconfig.json`, `turbo.json` — editor/build config, not harness config.
- Pre-existing problems in untouched artifacts. **The unit of review is the diff.**

## Calibration

**Highest-yield:** `.claude/skills/*/SKILL.md` — 28 hand-written skills with real code advice inside, graded twice (skill checklist × 27 + guideline checklist per line). Then `.cursor/rules/features/*.mdc` for the guideline layer. Then `AGENTS.md`.

**Lowest-yield / expect near-zero:** hooks (none exist), settings/env/mcp (three tiny config files), subagents (one file), standards docs (none). Also low: the vendored `agent-browser` skill. **Migration diffs are not on this list** — see the conventions section; they change artifact type and have produced real findings.

Unlike the library repos in this benchmark, **expect a high findings-per-PR rate here** — the artifact surface is large, actively edited, and written without a governing standard. The risk in this repo is the opposite one: filing the same systemic convention (no `version:`, fat `.mdc` rules) dozens of times. Collapse systemic findings to one entry each.

## PR review automation

**inbox-zero runs two review bots plus an active human lead.** Every finding filed against this repo must carry an `also_found_by` verdict — see [`../instructions.md`](../instructions.md) → "Was it already caught?".

| | |
|---|---|
| **Reviewers** | `cubic-dev-ai[bot]` ([cubic](https://cubic.dev)) and `baz-reviewer[bot]` ([Baz](https://baz.co)) — two LLM PR-review bots |
| **Type** | bot (×2) |
| **Coverage** | **~75%** in-window — the highest in this benchmark. `cubic-dev-ai[bot]` on 9 of 12 sampled PRs, `baz-reviewer[bot]` on 8 of 12, across #1587–#3023 |
| **Human line-by-line review** | `elie222` (lead maintainer) reviews many PRs — on 7 of 12 sampled. Credit as `reviewer_type: "human"` when he flags a defect first |
| **Other bots seen** | `cursor[bot]` (Cursor Bugbot) on the occasional PR |

Two bots means a defect may be flagged by both. Record the **first one chronologically** in `also_found_by` and name the other in `notes`. High coverage plus an engaged human maintainer make this the sharpest "did we find what the existing process missed?" test in the set — a finding nobody here caught is a strong result.

## Other files

- `source code/` — local clone, git-ignored
- `context/pr-list.json` — **70 in-scope PRs**, all MERGED, spanning 2026-02-14 → 2026-07-17 (selected from 123 in-scope PRs found in total)
- `findings_history.json` — **does not exist yet**; the first run creates it (see [`../instructions.md`](../instructions.md))
