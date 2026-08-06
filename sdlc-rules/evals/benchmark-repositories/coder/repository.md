# coder

| | |
|---|---|
| **Site** | Coder (coder/coder) — self-hosted cloud development environments; Go control plane + React frontend |
| **URL** | https://github.com/coder/coder |
| **Source clone** | `source code/` (git-ignored). Clone with `git clone --filter=blob:none https://github.com/coder/coder.git "source code"` — **full history is required**, not `--depth`. Duplication and shadowing checks must verify a path existed at a PR's merge commit; a shallow clone makes every path look newly added and silently corrupts those checks. Blob-filtering keeps it to ~172 MB with all 15k commits |
| **Benchmark dir** | `coder/` |

`context/pr-list.json` exists (70 PRs). There is no `runs/` and no `findings_history.json`; the first run creates them (see [`../instructions.md`](../instructions.md)).

Read this whole file before reviewing. You are reviewing **AI-coding artifacts**, not application code — knowing what this repo *is* determines which checklists can legitimately fire.

## What this repo is

**Coder is a platform for provisioning remote development environments** — workspaces defined as Terraform templates, provisioned onto Kubernetes/AWS/bare metal, accessed over SSH, VS Code Remote, or a browser IDE. 13.9k stars, very high commit velocity.

Stack: **Go** for the control plane (`coderd/`, `provisionerd/`, `agent/`, `cli/`, `tailnet/`), **TypeScript/React** for the web UI (`site/`), **Terraform** for template provisioning, `make` as the build entrypoint, PostgreSQL + `sqlc`-generated queries, Storybook + Playwright on the frontend. This is the benchmark's **only non-JavaScript repo** — it is here to check that the `sdlc-rules` checklists aren't implicitly JS/TS-shaped.

Its AI-coding setup is unusually mature and unusually *split across two harness roots*:

- **`.claude/`** — `settings.json` (a single `PostToolUse` hook), `scripts/format.sh` (the hook script), `skills/` (3 skills), and `docs/` (11 freestanding guidance docs).
- **`.agents/`** — `skills/` (5 skills) plus `.agents/docs` which is a **symlink to `.claude/docs`**, added so non-Claude-Code runtimes find the same guidance.
- **Context files** — root `AGENTS.md` is the real file; `CLAUDE.md`, `.cursorrules`, and `site/CLAUDE.md` are all **symlinks** (git mode `120000`, 9 bytes). Real nested context files are `site/AGENTS.md` and `aibridge/AGENTS.md`.

**Social context:** artifact PRs here are authored by maintainers, are deliberate, and often land as a "add the artifact" PR followed by a "trim/tune the artifact" PR days later (e.g. #25088 → #25121). Expect real, substantive artifact diffs rather than drive-by edits.

## Artifact inventory (verified against `git/trees/HEAD?recursive=1`)

| Artifact type | Path | Count | Notes |
|---|---|---|---|
| Skill | `.agents/skills/{coder-agents-review,deep-review,dogfood,pull-requests,refine-plan}/SKILL.md` | 5 | `deep-review` is 21 KB (~5.4k tokens) — well over the 3k spec limit |
| Skill | `.claude/skills/{code-review,doc-check,write-docs}/SKILL.md` | 3 | 3–10 KB each |
| Skill script | `.claude/scripts/format.sh` | 1 | Not under `skills/*/scripts/` — it's the hook's script, see below |
| Standards doc | `.claude/docs/*.md` | 11 | `GO.md` (20 KB), `WORKFLOWS.md`, `DOCS_STYLE_GUIDE.md`, `TESTING.md`, `DATABASE.md`, `OAUTH2.md`, `ARCHITECTURE.md`, `OBSERVABILITY.md`, `DEV_ISOLATION.md`, `TROUBLESHOOTING.md`, `AGENT_FAILURES.md`, `PR_STYLE_GUIDE.md` |
| Context file | `AGENTS.md`, `site/AGENTS.md`, `aibridge/AGENTS.md` | 3 real | ~3.3k / ~4.4k / ~1.1k tokens |
| Context file (symlink) | `CLAUDE.md`, `.cursorrules`, `site/CLAUDE.md` | 3 symlinks | All point at their sibling `AGENTS.md`; zero independent content |
| Hook | `hooks` key in `.claude/settings.json` | 1 | `PostToolUse` / matcher `Edit\|Write\|MultiEdit` → `.claude/scripts/format.sh` |
| MCP | `.mcp.json` | 1 | Go + TypeScript language servers via `mcp-language-server`, plus a `storybook` HTTP server on `localhost:6006` |
| Subagent-like | `.agents/skills/deep-review/roles/*.md` (14) + 2 loose `*-prompt.md` | 16 | Reviewer role prompts — *not* at `.claude/agents/`; see status table |
| Pointer rule | `.cursor/rules/*.mdc` | 0 | No `.cursor/` directory at all |
| Command | `.claude/commands/`, `.cursor/commands/` | 0 | None |

This **confirms the prior research** (8 `SKILL.md`, 3 `AGENTS.md`, 2 `CLAUDE.md`, a `.cursorrules`), with two corrections: the 2 `CLAUDE.md` and the `.cursorrules` are *symlinks with no own content*, and prior research missed the 11 `.claude/docs/` standards docs — which are in fact the single largest artifact surface here.

## Go-specific considerations (why this repo is in the benchmark)

The container checklists are mostly language-neutral, but a few checks carry latent JS/TS assumptions. Watch these:

- **`allowed-tools` (skill check #3) and `version` (#4) are absent from all 8 skills.** This is not a Go problem, it's a repo house style — but it means those two checks fire on essentially every skill PR. Treat them as **pre-existing** unless the diff touches frontmatter. The unit of review is the diff.
- **Skill layout (#15) assumes an npm-ish `references/ scripts/ assets/ evals/` tree.** `.agents/skills/deep-review/` has `roles/` plus two loose `*-prompt.md` files at its root — a genuine spec deviation, and correctly flagged. But don't extend that reasoning to `.claude/docs/` living outside any skill: that's a deliberate standards-doc directory, not a malformed skill.
- **Token-budget checks are byte-estimated and language-agnostic** — they translate cleanly. `AGENTS.md` at ~3.3k and `site/AGENTS.md` at ~4.4k both blow the 2,000-token context-file budget. That's real, but it is a *standing* condition; only file it when a PR meaningfully grows the file.
- **Guideline-rule check #2 ("not lintable") names ESLint, TypeScript strict, Prettier.** In this repo the equivalents are `golangci-lint`, `go vet`, `gofmt`, `sqlc vet`, and `make lint`. A Go guideline that `golangci-lint` could enforce is just as lintable — apply the check by intent, not by tool name. Not knowing the Go toolchain is not a reason to skip the check.
- **Build-command guidance is `make`/`./scripts/develop.sh`, not `npm run`.** Nothing in the checklists requires npm; don't read `make test RUN=TestName` as an anomaly.
- **Terraform/provisioner guidance** appears in `.claude/docs/ARCHITECTURE.md`. It is code advice and gets the guideline-rule pass like anything else.

## The `.cursorrules` classification question

`.cursorrules` does not appear in the routing table. **Determination: it is a context file (`references/context-file-checklist.md`), not a pointer rule.**

Reasoning: (1) In this repo it is *literally a 9-byte symlink to `AGENTS.md`* — same bytes, same content, so any other classification would grade the same file two different ways depending on which name you opened. (2) Functionally, `.cursorrules` is Cursor's legacy always-loaded root orientation file — the direct predecessor of `AGENTS.md`/`CLAUDE.md`, one file per repo. The pointer-rule row governs `.cursor/rules/*.mdc`: thin, per-topic, *forbidden* from containing code guidance. `.cursorrules` is the opposite — a single fat root file whose whole job is orientation plus advice. Grading it with `rule-checklist.md` would reject it wholesale for containing code guidance, which is plainly wrong for the format. (3) The routing table's own logic — "harnesses differ in *where* a concept lives, not *which* concepts exist" — puts `.cursorrules` in the same row as `AGENTS.md`.

**Open question for the skill owner:** the routing table should name `.cursorrules` explicitly in the context-file row. As written, a reviewer has to infer it. Flagged.

## Artifact-type status (read before filing)

| Artifact type | Status |
|---|---|
| Skill | **Live — highest yield.** 8 skills, actively edited. No `allowed-tools`/`version` anywhere; `deep-review` is oversized and has a non-conformant layout. |
| Guideline / rule line | **Live everywhere.** `.claude/docs/*` and the `AGENTS.md` files are dense with discrete Go/React/DB advice. Every line gets this pass. |
| Standards doc | **Live — largest surface.** `.claude/docs/` is 11 freestanding guidance docs. Check precedence vs `AGENTS.md` (#1) and shadowing by skills (#3) — `GO.md` vs `deep-review/roles/go-architect.md` is a real overlap. |
| Context file | **Live.** 3 real files, both root and nested; both large ones are over budget. |
| Hook | **Thin but real.** Exactly one hook (`PostToolUse` → `format.sh`). It has been edited (#18646, #18755). All 3 hook checks apply to it. |
| Settings / env / mcp | **Thin.** `.mcp.json` touched in #25352, #18613. `other-checklist.md` is a **STUB** — no checks to run; note the artifact and move on. |
| Skill script | **Edge case.** `format.sh` is a hook script at `.claude/scripts/`, not `skills/*/scripts/*`. Checklist is a **STUB** anyway. |
| Subagent | **N/A by path, present in spirit.** `deep-review/roles/*.md` are reviewer personas but live inside a skill, not `.claude/agents/`. Grade them as skill content + guideline lines, not with `subagent-checklist.md` (a **STUB**). |
| Command | **N/A.** No `.claude/commands/` or `.cursor/commands/`. Checklist is a **STUB** regardless. |
| Pointer rule | **N/A.** No `.cursor/` directory. |

## Repo conventions relevant to judgment calls

- **Standing conditions — the full list.** Do **not** file these on a PR that merely edits an affected file. **Do** file them when a PR creates a *new* artifact carrying the condition — and file the whole set together, not a subset:
  - **Skills carry only `name` + `description`** — no `allowed-tools` (`SK03`), no `version` (`SK04`), uniform across all 8.
  - **No skill ships `evals/`** anywhere in the repo (`SK23`, `SK24`, `SK26`).
  - **`AGENTS.md` uses shouting language** (`CF03`, `GR05`) — see below.
  - **`AGENTS.md` and `site/AGENTS.md` are over the token budget** (`CF01`) — but see the measure-don't-judge rule below.
  - **`.agents/skills/deep-review/` has a non-conformant root layout** (`SK15`) and an oversized `SKILL.md` at ~5.4k tokens (`SK09`).

  `SK03` and `SK04` always co-occur on a new skill. `SK23` belongs to the same set: in run 2 all 8 new-skill PRs correctly filed `SK03`+`SK04` together, but only 4 of those 8 also filed `SK23` — a 50/50 split caused by this list previously omitting evals. File all of them or none.
- **`AGENTS.md` is deliberately long and build-command-heavy.** It carries the `make`/`develop.sh` command table, git workflow, and navigation links into `.claude/docs/`. The length is intentional *hub* design, and the navigation links are exactly the progressive disclosure the checklists ask for — don't file "too long" as if it were sprawl. Do file it when a PR adds inline detail that should have gone into a linked doc.
- **Symlinked context files are a deliberate multi-harness strategy** (`CLAUDE.md`→`AGENTS.md`, `.agents/docs`→`.claude/docs`), landed on purpose in #19298 and #21202. Never file "duplicated guideline" across a symlink pair — there is one file.

- **The symlink DIRECTION flipped mid-window — check it per PR, never assume HEAD.** Before ~#21207 (late 2025) `CLAUDE.md` was the real `100644` file and **`AGENTS.md` was the symlink** — the reverse of the HEAD layout described above. Confirmed at #20950, #21148, #21153. Two consequences:
  - On a pre-flip PR, grade the *real* blob. `CLAUDE.md` then held independent content and is a legitimate review target, not a skip.
  - The "never file across a symlink pair" rule is only safe once you know which side is the symlink **at that PR's merge commit**: `git ls-tree <mergeSha> -- <path>` and look for mode `120000`. Applying HEAD's direction blindly causes false *suppressions*, the mirror of the false positives the merge-commit rule prevents.

- **Watch for the rename artifact.** A path can show as `new file mode` because the old path was reoccupied by a symlink — making a large *pre-existing* file look newly created and appear to carry standing conditions. Real case: #22076 shows `site/AGENTS.md` as a new 130-line file when its actual change is one added line. Compare blob hashes before treating anything as new.

- **Resolve standing conditions by measuring, not by judging.** For token-budget checks, measure the file at **both sides of the merge commit** (chars/4). If the PR pushed it over the limit, that PR *created* the condition and it is filable. Real case: #23299 grew `site/AGENTS.md` from 1,639 → 3,397 tokens, so `CF01` was correctly filed despite the file being listed as a standing condition.
- **`AGENTS.md` uses shouting language** ("YOU MUST", "NEVER", "BREAKING THE LETTER OR SPIRIT OF THE RULES IS FAILURE"). This is a genuine hit on emphasis-inflation (context-file #3, guideline #5) and it is *not* excused by being house style — but it is pre-existing, so only file it against lines the diff actually adds or changes.
- **`.claude/docs/` and `docs/` are different things.** `.claude/docs/` is agent guidance (in scope). `docs/` is Coder's user-facing product documentation (out of scope) — except `docs/.style/`, which is prose guidance agents are told to load; treat it as borderline and only in scope when a PR pairs it with a real artifact change.

## Out of scope (do not file findings on these)

- All Go source (`coderd/`, `agent/`, `cli/`, `tailnet/`, `provisionerd/`, `enterprise/`) and all `site/` frontend source. This benchmark reviews artifacts, not application code.
- Generated code: `*.pb.go`, `*.sql.go` (sqlc), `apitypedocs`, `site/src/api/typesGenerated.ts`, swagger output.
- Lockfiles (`go.sum`, `site/pnpm-lock.yaml`), `.vscode/settings.json` (editor config, not a harness file), CI workflow YAML.
- User-facing product docs under `docs/` (excluding `docs/.style/`, see above).
- Pre-existing problems in untouched artifact lines. **The unit of review is the diff.**

## Calibration

**In-scope PRs found: 70** (the full target), spanning **#20950 → #26767**, 2025-11-26 → 2026-06-26. All 70 are MERGED. Categories: 29 feature, 28 docs-artifact, 6 fix, 4 build, 3 refactor. 17 further in-scope PRs exist below #20950 (back to 2025-03) if the window ever needs widening — the artifact-touching volume here is **healthy, not marginal**.

**Highest-yield:** the 8 `SKILL.md` files (uniformly missing `allowed-tools`/`version`; `deep-review` oversized and non-conformant); `.claude/docs/*` standards docs (precedence, one-topic-per-file, skill shadowing, plus a line-by-line guideline pass on very dense advice); `AGENTS.md` / `site/AGENTS.md` (over budget, emphasis inflation).

**Lowest-yield / expect near-zero:** `.mcp.json` and `.claude/settings.json` PRs (their checklist is a stub); symlink-only diffs (#19298, #21202 — verified genuinely zero: in #21202 the deleted `CLAUDE.md` and new `AGENTS.md` are the *same git blob* `2c055551ed4`, so a +219/−219 diff carries no changed advice).

**Correction — do not trust a prior "incidental" label.** #23037 was listed here as an app-code PR touching an artifact by one or two lines. That is **wrong**: it adds a full 15-line *Frontend Patterns* section with two substantive guidelines, and produced 3 findings. #26204 was separately verified as genuinely incidental (one reflowed sentence of log-field names — descriptive fact, not advice). **#18445 has not been verified.** Check the actual diff at the merge commit rather than trusting this list.

Unlike most repos in this benchmark, the constraint here is **not** artifact scarcity — it's that **5 of the 10 checklists are stubs** (`command`, `subagent`, `skill-script`, `other`, and partly `hook`). Where a stub governs, record the artifact type and file nothing; a stub producing zero findings is the correct outcome, not an under-performing run. Padding with weak findings destroys the statistics this exercise exists to produce.

## PR review automation

**Coder's artifact PRs are reviewed by human maintainers, not a review bot — in-window.** Every finding filed against this repo must still carry an `also_found_by` verdict — see [`../instructions.md`](../instructions.md) → "Was it already caught?".

| | |
|---|---|
| **Reviewers (in-window)** | Human maintainers — `mafredri`, `johnstcn`, `Emyrk`, `ThomasK33`, `ethanndickson`, `ibetitsmike`, `david-fraley`, `DanielleMaywood` and others. Credit by username with `reviewer_type: "human"` |
| **Bots (occasional)** | `Copilot` (GitHub Copilot code review — **no `[bot]` suffix**) and `chatgpt-codex-connector[bot]` (OpenAI Codex) appear on a minority of PRs |
| **Coverage** | **~45%** in-window (review comments on 8 of 18 PRs sampled across #20950–#26767); overwhelmingly human |

⚠️ **Two caveats specific to this repo — read before interpreting a match:**

1. **The reviewer set changed inside the window.** `coder-agents-review[bot]` — **Coder's own dogfooded review agent**, driven by the very `.agents/skills/coder-agents-review` skill this benchmark grades — only starts appearing near the *tail* of the window (late PRs) and dominates on newer PRs outside it. On most of the reviewed set it is absent. Detect it per PR; do not assume it reviewed a PR because it reviews recent ones.
2. **When `coder-agents-review[bot]` did review a PR, a match measures self-agreement**, not an independent second opinion — the same situation as the `qodo-*` repos in the Node.js benchmark. Keep any such match out of a headline "we found what others missed" number, and name the reviewer in `notes`.

Because coverage is under half and mostly human, many PRs here will legitimately have `pr_reviewers_present: []`. Record that rather than a bare `null`.

## Other files

- `source code/` — optional shallow local clone, git-ignored
- `context/pr-list.json` — 70 PRs, created
- `findings_history.json` and `runs/` — **do not exist yet**; the first run creates them (see [`../instructions.md`](../instructions.md))
