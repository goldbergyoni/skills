# suna

| | |
|---|---|
| **Site** | suna / Kortix (kortix-ai/suna) — "The Company AI Command Center", an agent platform product |
| **URL** | https://github.com/kortix-ai/suna |
| **Source clone** | `source code/` (git-ignored). Clone with `git clone --depth 100 https://github.com/kortix-ai/suna.git "source code"` |
| **Benchmark dir** | `suna/` |

Read this whole file before reviewing. You are reviewing PRs against the **sdlc-rules** AI-artifact checklists — skills, rules, commands, subagents, hooks, context files, standards docs, harness settings. You are **not** reviewing application code. The single most important thing to internalize here is the product-payload vs repo-tooling split described below; get it wrong and you will review ~98 files that the checklists were never written for.

## What this repo is

**Kortix (repo name `suna`) is a commercial agent platform** — a hosted product that lets companies run AI agents against their own tooling. TypeScript monorepo on pnpm workspaces: `apps/api` (Hono), `apps/web` (Next.js), `apps/mobile` (Expo), `apps/cli`, `apps/desktop`, `packages/sdk` (`@kortix/sdk`), plus `infra/` (Terraform, EKS, ArgoCD) and `supabase/`. Tests are `bun:test` co-located, with a `tests/` ke2e flow suite. ~6,600 tracked files, ~20k stars, very high commit velocity (PR numbers pass 5,000 in under a year).

Its AI-coding setup is genuinely mature and unusually opinionated: 17 hand-written Claude Code skills under `.claude/skills/`, a root `AGENTS.md`, four nested context files, and a `skills-lock.json` pinning the skill set. Skills are written in a distinctive house voice — long, prose-heavy `description:` fields that spell out load triggers explicitly ("Load WHENEVER…"), and runbook-shaped bodies (release, rollback, migration, worktree, testing).

**Social context:** near-100% of merged PRs are from a tiny maintainer set (`markokraemer`, `sutharjay1`) plus bot accounts (`kortix-agent`, `agent-kortix`, `github-actions[bot]`). Many artifact changes land as **direct pushes to `main` with no PR at all** — of 91 commits touching artifact paths, only ~34 map to a real PR. Diffs are large and multi-concern; a skill edit is usually a rider on a big feature PR rather than its own change.

## Artifact inventory

| Artifact type | Path | Count | Notes |
|---|---|---|---|
| Skill (repo tooling) | `.claude/skills/*/SKILL.md` | **17** | The real corpus. Release, rollback, migration, worktree, testing, ke2e-tests, dotenvx-secrets, commit-dis, claude-cli, codex-cli, plus brand/marketing/design/social/comms/image/presentation skills. |
| Skill (repo tooling) | `apps/web/.agents/skills/make-interfaces-feel-better/SKILL.md` | **1** | Harness-agnostic `.agents/` location; UI-polish guidance for the web app. Has 4 reference `.md` files. |
| Skill reference docs | `.claude/skills/*/**.md` (non-SKILL) | 8 | `internal-comms/references/*`, `kortix-presentation/{editing,pptxgenjs}.md`, and the 4 under `.agents/`. |
| Skill scripts | `.claude/skills/kortix-presentation/scripts/**` | 17 `.py` | Plus **39 vendored `.xsd`** OOXML schemas — third-party, not authored here. |
| Context file | `AGENTS.md`, `packages/sdk/AGENTS.md`, `packages/sdk/CLAUDE.md`, `apps/whitelabel-demo/AGENTS.md`, `.deepsec/AGENTS.md` | **5** | Root `AGENTS.md` is the heavily-edited one (24 commits). |
| Standards / instruction docs | `.strix/instructions/*.md` | 2 | Agent instructions for the Strix security scanner. |
| Pointer rule | `apps/mobile/.cursorrules` | 1 | Legacy single-file Cursor format; a `Migrate rules from .cursor to .claude with symlink` commit retired the rest. |
| Harness lock/settings | `skills-lock.json`, `apps/web/skills-lock.json` | 2 | Skill-set pin files. |
| Skill eval fixtures | `.claude/skills/*/evals/evals.json` | 4 | |
| **Product payload (OUT)** | `packages/starter/templates/**/SKILL.md` | **98** | See next section. |

## The product-payload vs repo-tooling distinction

This is the decisive judgment call for this repo. Prior research counted **116 `SKILL.md` files**. They are not one corpus — they split cleanly:

**Repo tooling — IN SCOPE (18 skills).** `.claude/skills/*` (17) and `apps/web/.agents/skills/*` (1). These steer AI agents working *on the Kortix codebase*: how to cut a release, how to run a migration, how to use worktrees, the mandatory test-with-every-change discipline. `.claude/skills/testing/SKILL.md` and `.claude/skills/kortix-release/SKILL.md` are exactly what the sdlc-rules checklists were written to grade.

**Product payload — OUT OF SCOPE (98 skills).** Everything under `packages/starter/templates/` — the `base/`, `general-knowledge-worker/`, and `marketplace/` template trees, whether under `.kortix/opencode/skills/` or `marketplace/runtime/skills/`. These are **capabilities Kortix ships to its customers' agents at runtime**. They are business runbooks (`access-policy`, `nda-triage`, `close-management`, `variance-analysis`), not coding guidance; they use `{{template_variable}}` interpolation and an XML-ish `<skill><overview><when-to-load>` body format that is a product convention, not a Claude Code convention. Grading them against skill-checklist would produce noise, not findings.

Historical aliases of the same payload appear in old diffs and must also be excluded: `.kortix/opencode/skills/**` (a root dogfood project, deleted in #4294) and `core/kortix-master/opencode/skills/**` (the pre-cutover layout, gone after #3229).

**Practical rule:** a `SKILL.md` is in scope only if its path starts with `.claude/skills/` or contains `/.agents/skills/`. Everything else is payload.

## Artifact-type status

| Type | Status |
|---|---|
| **Skill** | **Live — by far the highest-yield type.** 18 in-scope skills, actively edited across ~20 of the 34 PRs. |
| **Guideline / rule line** | **Live.** The skills and `AGENTS.md` are dense with discrete code advice (test-per-change rules, migration constraints, release gates) — every line gets the guideline-rule pass on top of its container pass. |
| **Skill script** | **Thin but real.** Only `kortix-presentation/scripts/**` (17 Python files); touched by two PRs (#3375 adds, #3301 prunes). Checklist is a STUB — expect little. |
| **Context file** | **Live.** 5 files; root `AGENTS.md` alone appears in 10 of the 34 PRs. |
| **Standards doc** | **Thin.** Only `.strix/instructions/*` (2 files, never touched in an in-scope PR). `docs/` is human product documentation, not agent-steering standards — do not treat it as this type. |
| **Pointer rule** | **Thin.** One legacy `.cursorrules`; 3 commits, none in an in-scope PR. |
| **Command** | **N/A.** No `.claude/commands/`, no `.cursor/commands/`. |
| **Subagent** | **N/A.** No `.claude/agents/`, no `.cursor/agents/`. |
| **Hook** | **N/A for the harness.** There is no `.claude/settings.json` and no `.cursor/hooks.json`. `.githooks/pre-commit`/`pre-push` are plain git hooks, not agent hooks — out of scope. |
| **Settings / env / mcp** | **Thin.** No `settings.json`, no `mcp.json`, no `environment.json` anywhere. Only `skills-lock.json` × 2, which is a generated pin file. |

## Repo conventions relevant to judgment calls

These look like violations and are not:

- **Very long `description:` frontmatter.** House style is a 2–4 sentence description that enumerates load triggers verbatim ("Load WHENEVER the user wants to release, promote, cut/ship a version…"). It is deliberate and it works; do not file generic "description too long" findings without a concrete triggering harm.
- **Runbook-length skill bodies.** `kortix-release`, `migration`, and `testing` are long *because they encode an irreversible production procedure*. Brevity pressure still applies, but weigh it against the operational cost of an omitted step.
- **Imperative, absolutist tone.** "THE RULE", "non-negotiable", "never `git push …:prod`" is the established voice for gate-enforcing skills here.
- **Deep relative links out of `.claude/skills/`** (`../../../TESTING.md`, `../ke2e-tests/SKILL.md`) are the intended cross-reference mechanism, not broken paths.
- **Bot-authored PRs are real.** `kortix-agent`, `agent-kortix`, and `github-actions[bot]` open genuine, reviewed, merged changes — they are not spam and must not be filtered out.
- **`skills-lock.json` churn is generated.** A diff touching only that file carries no reviewable authorial intent.

## Out of scope (do not file findings on these)

- All application code: `apps/**`, `packages/**` (except `packages/sdk/AGENTS.md` and `packages/sdk/CLAUDE.md`), `infra/`, `supabase/`, `tests/`, `scripts/`.
- **All 98 product-payload skills** under `packages/starter/templates/**`, and their historical aliases `.kortix/opencode/skills/**` and `core/kortix-master/opencode/skills/**`.
- Vendored/generated files: the 39 `.xsd` OOXML schemas, `pnpm-lock.yaml`, `skills-lock.json`, `.claude/scheduled_tasks.lock`.
- `docs/**`, `README.md`, `MANIFESTO.md`, `CONTRIBUTING.md`, `TESTING.md` — human documentation, not agent-steering artifacts.
- `.github/workflows/**` and `.githooks/**` — CI and git plumbing, not agent hooks.
- Pre-existing problems in untouched code. **The unit of review is the diff.**

## Calibration

**Highest-yield:** `.claude/skills/*/SKILL.md` — especially the operational runbooks (`kortix-release`, `kortix-rollback`, `migration`, `worktree`, `ke2e-tests`, `testing`) where the frontmatter/description/trigger and body-length checks have the most to bite on. Then root `AGENTS.md`, which absorbs new process rules constantly and is the most likely place for advice-quality (guideline-layer) findings.

**Lowest-yield / expect zero:** the `.xsd` schemas, `skills-lock.json`, `.cursorrules`, `.strix/instructions/`, and any PR whose only artifact touch is a one-line path or name update riding along with a large refactor (#4310, #4294, #4037 are of this shape).

**Honest expectation:** the in-scope surface is narrow — **34 PRs, not the 70 targeted**, spanning **2026-05-20 to 2026-07-19**. Most of them touch exactly one or two artifact files, and roughly a third are incidental one-line edits inside big application-code PRs. Two PRs (#3375, #3301) are outliers that move 10–37 artifact files at once and will dominate the finding count. Expect a **low findings-per-PR rate with high variance**. The skills here are above-average quality — written by people who clearly think about agent steering — so a run that produces few findings on them is the correct outcome, not an under-performing one. Padding with weak findings destroys the statistics this exercise exists to produce.

## PR review automation

**suna had effectively no PR reviewer during the benchmark window.** Set `also_found_by` to `null` on every finding here and do not go looking — see [`../instructions.md`](../instructions.md) → "Was it already caught?".

| | |
|---|---|
| **Reviewer (in-window)** | **None.** Zero review comments across 17 PRs sampled from #3186–#5062 |
| **Type** | — |
| **Coverage** | **0%** in-window |

⚠️ **The recent picture differs — do not backfill it onto the window.** `strix-security[bot]`, `Copilot`, and `github-code-quality[bot]` are active on suna's *current* PRs, but they were adopted **after** this benchmark's PR window. On the reviewed set they are absent. If a future run extends the window into the reviewer-active period, re-detect and update this section.

Set `repo_has_pr_reviewer: false` on the run entry. With no reviewer, every finding is trivially uncontested, so this repo is excluded from the "versus the incumbent reviewer" comparison by design.

## Other files

- `source code/` — optional local clone, git-ignored
- `context/pr-list.json` — **exists** (34 in-scope PRs)
- `findings_history.json` and `runs/` — **do not exist yet**; the first run creates them (see [`../instructions.md`](../instructions.md))
