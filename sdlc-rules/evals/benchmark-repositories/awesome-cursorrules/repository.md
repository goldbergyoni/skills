# awesome-cursorrules

| | |
|---|---|
| **Site** | awesome-cursorrules (PatrickJS/awesome-cursorrules) — a curated, community-contributed catalog of Cursor rule files |
| **URL** | https://github.com/PatrickJS/awesome-cursorrules |
| **Source clone** | `source code/` (git-ignored). Clone with `git clone https://github.com/PatrickJS/awesome-cursorrules.git "source code"` (~6 MB, full history is cheap) |
| **Benchmark dir** | `awesome-cursorrules/` |

`context/pr-list.json` exists (70 in-scope PRs, #211–#334). There is no `runs/` and no `findings_history.json`; the first run creates them (see [`../instructions.md`](../instructions.md)).

Read this whole file before reviewing. This repo is the odd one out in the benchmark, and misclassifying its artifacts invalidates every finding produced from it.

## What this repo is

**awesome-cursorrules is a catalog, not a product.** There is no application, no library, no build, no runtime. The entire repo is: a `README.md` index (367 lines, 15 category headings), a `rules/` directory, a `scripts/` folder of Node hygiene checkers used by CI, and licence/logo files. `package.json` exists only to run those checkers.

`rules/` holds **257 files, all `.mdc`**, flat — one file per contributed rule set (`rules/vue-pinia-cursorrules-prompt-file.mdc`, `rules/typescript.mdc`, …). Every file carries Cursor Project Rule frontmatter (`description`, `globs`, `alwaysApply`) followed by free-form Markdown guidance. ~25,600 lines total; median file is **67 lines**, and the long tail runs into several hundred.

The layout changed recently. Historically each contribution was a directory — `rules/<name>-cursorrules-prompt-file/.cursorrules` plus an optional per-rule `README.md`. PR **#286** ("Restructure rules: consolidate, rename, and clean files", 86 files) and **#284/#285** flattened that into single `.mdc` files at the top of `rules/`. `contributing.md` now mandates the `.mdc` form. **The benchmark PR window straddles this migration**: of 233 artifact files across the 70 PRs, 137 are `.mdc`, 61 are legacy `.cursorrules`, and 34 are per-rule `README.md` files. Treat all three as the same artifact type — the extension is a date stamp, not a semantic difference.

Every file was written by a different outside contributor for *their own* stack. There is no house style, no shared vocabulary, and no coherent single project the advice serves.

## Artifact inventory

| Artifact type | Path | Count | Notes |
|---|---|---|---|
| Rule/guidance files | `rules/*.mdc` | 257 | The whole surface. Dense code advice, 67 lines median. |
| Legacy rule files | `rules/<name>/.cursorrules` | 0 at HEAD | Still present in ~half the in-scope PR diffs (pre-#286). |
| Per-rule READMEs | `rules/<name>/README.md` | 0 at HEAD | Appear in 34 of the in-scope PRs' file lists; removed by the restructure. |
| `SKILL.md` | — | 0 | None anywhere in history. |
| `.cursor/` or `.claude/` dirs | — | 0 | The repo does not configure its *own* harness. |
| `AGENTS.md` / `CLAUDE.md` | — | 0 | None. |
| settings / mcp / hooks / environment | — | 0 | None. |
| CI | `.github/workflows/main.yml`, `scripts/check-*.mjs` | 1 + 19 | Contribution hygiene linting. Out of scope. |

## The classification question — read this before filing anything

`rules/**` files are **standards docs**. Grade them with `references/standards-checklist.md` for the container pass, **not** `references/rule-checklist.md`.

The reasoning:

- The routing table keys "pointer rule" on `.cursor/rules/*.mdc` **and** confirms by content: *"a thin file that only points to a skill or states a non-coding constraint."* These files are at `rules/`, not `.cursor/rules/`, and none of them are thin pointers. Path fails, content fails.
- The standards row reads *"a freestanding file of pure code guidance that isn't wrapped in a skill."* That is a literal description of every file here.
- Applying `rule-checklist.md` would fire its one `{severity: error}` check — "no code guidance allowed" — on all 257 files identically. A checklist that returns the same error for every input measures nothing.

**Open question, ~75% confidence.** The honest counter-argument: these *are* Cursor Project Rules by format (`.mdc` + `globs` + `alwaysApply`), and when a consumer installs one it lands in *their* `.cursor/rules/`. A reviewer could reasonably say the artifact type follows the format, not the storage path. If this determination is reversed, every container-pass finding in this repo changes and the run must be redone — so settle it before the first run, not after.

Practical consequence for the container pass: standards checks 3 (*not shadowed by a skill*) and 4 (*discoverable*) need reinterpretation. There are no skills to shadow, and "discoverable" here means **listed in the root `README.md` index** — a PR that adds `rules/foo.mdc` without a README entry genuinely fails check 4. Check 1 (*stated precedence*) is effectively N/A: there is no context file or skill to lose a conflict to.

## Artifact-type status

| Type | Status |
|---|---|
| Skill (`SKILL.md`) | **N/A.** Zero `SKILL.md` files, ever. Several PRs use the *word* "skill" in a rule title (#292, #242, #310) — those are still `.mdc` guidance files, not skills. |
| Guideline / rule line | **Live — this is the repo.** Every PR adds dozens of discrete advice lines. See Calibration. |
| Skill script | **N/A.** No `skills/` directory. `scripts/*.mjs` are CI hygiene checkers, not skill scripts. |
| Pointer rule | **N/A by determination above.** Do not load `rule-checklist.md` for this repo. |
| Standards doc | **Live.** The container checklist for all 257 `rules/**` files. |
| Command | **N/A.** No `.cursor/commands/` or `.claude/commands/`. |
| Subagent | **N/A.** No `.cursor/agents/` or `.claude/agents/`. Rule files *about* multi-agent orchestration (#329, #206) are guidance docs, not subagent definitions. |
| Hook | **N/A.** No `hooks.json`, no `hooks` key anywhere. |
| Context file | **N/A.** No `AGENTS.md` or `CLAUDE.md` at any depth. |
| Settings / env / mcp | **N/A.** None present. Rules *describing* MCP servers (#317, #255) are guidance, not `mcp.json`. |

Eight of ten types are N/A. That is correct and expected — this repo exists to exercise two of them deeply, not all ten shallowly.

## Repo conventions relevant to judgment calls

- **These files target *other people's* projects.** Nothing in `rules/` steers this repo's own development. Checks that assume one coherent codebase need adjusting.
- **Guideline check 1 ("not duplicated — search everywhere") is the big trap.** Two rule files for two different stacks *will* repeat similar advice — "prefer named exports", "use strict TypeScript" appears across dozens of files legitimately, because each file must stand alone when a user installs it in isolation. **Only file a duplication finding when the new advice duplicates or contradicts something inside the same PR's own file set, or duplicates an existing rule file for the same stack.** Cross-stack repetition is the design, not a defect.
- **Check 4 ("right home") is likewise scoped to the file, not the repo.** Vue advice in a Vue rule file is home; the question is only whether a line landed in the wrong *contributed set*, e.g. deployment advice buried in a testing rule.
- **Checks 2, 3, 5, 6 apply at full force.** Community rule files are the natural habitat for `**ALWAYS**`, `NEVER`, `CRITICAL:`, exclamation marks (check 5 — calibrated force), unscoped absolutes (check 6), lintable rules restated in prose (check 2), and multi-paragraph explanations of one idea (check 3). These are the workhorses here.
- **A PR adding a rule file *and* its README index entry is one in-scope change**, not a docs PR. README-only link edits are excluded.
- **`.mdc` frontmatter quality is fair game** under the standards pass — a missing or vacuous `description`, or `globs: **/*` with `alwaysApply: true` on stack-specific advice, is a real defect.

## Out of scope (do not file findings on these)

- Root `README.md` as an index, `LICENSE`, `code-of-conduct.md`, the `*.png` logos, `package.json`, `pnpm-lock.yaml`.
- `.github/workflows/main.yml` and `scripts/check-*.mjs` — contribution CI, not AI-steering artifacts.
- Pre-existing problems in the 250+ rule files a PR did not touch. **The unit of review is the diff.**

## Calibration

**Highest-yield by a wide margin: the guideline pass.** A single median PR adds ~67 lines of advice, of which perhaps 20–40 are discrete scoreable guidelines. Checks 3 (concise), 5 (calibrated force), and 6 (measured phrasing) will fire constantly — community rule files are written in exactly the shouty, padded, absolutist register those checks exist to catch. Expect a large number of *legitimate* findings per PR.

**Lowest-yield / expect near-zero:** the container pass. `standards-checklist.md` has five checks, two of which are N/A here and two of which (shadowing, precedence) have nothing to compare against. Most PRs will produce 0–1 container findings, almost always check 4 (missing README index entry).

**Cross-repo comparison warning.** Findings-per-PR in this repo will be many times higher than in `coder`, `mastra`, `inbox-zero`, or `suna` — not because the skill performs better here, but because the *denominator is different*: every line of every diff is a scoreable guideline, whereas in a product repo most of the diff is ordinary code the skill correctly ignores. **Do not average findings-per-PR across all five repos.** Report this repo separately, and if an aggregate is needed, normalize per *line of advice reviewed*, not per PR. Treating this repo as comparable to the product repos will make the whole benchmark's headline number meaningless.

Related: because the correct behavior here is to file many findings, the failure mode to watch for is the opposite of the product repos. There, the risk is padding with weak findings; here, the risk is the skill truncating or summarizing instead of scoring each line. Check that the guideline pass actually enumerates rather than sampling.

## PR review automation

**awesome-cursorrules runs [CodeRabbit](https://coderabbit.ai) on its pull requests.** Every finding filed against this repo must carry an `also_found_by` verdict — see [`../instructions.md`](../instructions.md) → "Was it already caught?".

| | |
|---|---|
| **Reviewer** | `coderabbitai[bot]` — an LLM PR-review bot |
| **Type** | bot |
| **Coverage** | **~50%** in-window (fired on 6 of 12 PRs sampled across #211–#334) |
| **Other bots seen** | `Copilot` (GitHub Copilot code review — **no `[bot]` suffix**) and `chatgpt-codex-connector[bot]` (OpenAI Codex) appear on the occasional PR. Record whichever actually flagged the defect |
| **Human line-by-line review** | Rare and incidental — the maintainer (`ohad6k` and others) comments occasionally. Credit by username with `reviewer_type: "human"` when they flag a defect first |

Coverage is only about half, so many PRs here will legitimately have `pr_reviewers_present: []`. Record that rather than leaving a bare `null` unexplained — an empty list means nobody reviewed the PR, so a `null` `also_found_by` there is expected, not a win.

## Other files

- `source code/` — local clone, git-ignored
- `context/pr-list.json` — 70 in-scope PRs, #211–#334 (2026-03-25 → 2026-07-17)
- `findings_history.json` — **does not exist yet**; the first run creates it (see [`../instructions.md`](../instructions.md))
