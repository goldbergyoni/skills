# Benchmarking the SDLC rules

## What this is

This folder measures how well the `sdlc-rules` skill actually finds real problems in real AI-coding artifacts.

A **benchmark run** takes one repository, reviews its **last 70 artifact-touching pull requests** against the skill and all its checklists, and records every defensible finding as a structured record. *Artifact-touching* is load-bearing: this skill governs the files that steer AI coding — skills, rules, commands, subagents, hooks, context files, harness permission files — and nothing else. A PR that only changes application code has no surface for these checklists and is excluded before review — see step 2. Each run is appended to that repository's `findings_history.json` and kept forever. Over time this gives us a live, trustworthy picture of two things:

1. **Is the skill getting better?** Findings per run, on the same repo, as the checklists change.
2. **Which checks earn their keep?** Every finding cites a stable rule code, so findings can be aggregated across repos and runs to rank checks by how often they catch something real.

The dataset is only worth having if the bar is consistent. A finding from one sub-agent must mean the same thing as a finding from another. That is what the rest of this document is for.

## How this differs from the Node.js benchmark

The two benchmarks share a schema, a dashboard, and a process, but the **unit of review is different in kind** and it is worth being explicit about it.

| | `nodejs-rules` | `sdlc-rules` |
|---|---|---|
| What's reviewed | Application source in a PR diff | AI-steering artifacts in a PR diff |
| In-scope PR | Touches server-side Node.js code | Touches an artifact path in the routing table |
| Grading unit | A changed line of code | A changed artifact **plus** each changed line of advice inside it |
| Passes per file | One | **Up to two** — container pass and guideline pass |
| Denominator | 70 functional PRs | 70 artifact-touching PRs |

The **two-pass structure** is the important one. `SKILL.md`'s routing table and `references/review-change.md` both say it: a file that contains code advice is graded twice — once as a container by its type's checklist, once more per advice line by `guideline-rule-checklist.md`. A benchmark run must do both, and each pass produces its own findings.

## Layout

```
benchmark-repositories/
  instructions.md              ← this file
  <repo>/
    repository.md              ← ALL repo context, in one file. Read this first.
    context/
      pr-list.json             The PRs in scope for the latest run
    source code/               Optional local clone. Git-ignored.
    runs/<run-id>/pr-<N>.json  Raw per-PR output, one file per PR
    findings_history.json      ← the durable, cross-run record. Never rewritten.
```

`repository.md` is the **only** context document per repo — what the project is, its artifact inventory, the conventions that look like violations but aren't, and which artifact types are N/A. Keep it that way; don't split context back out into side files that sub-agents then have to be told about separately.

`findings_history.json` is the deliverable. Everything else is working material.

## Cloning the source

A run **may clone the repository locally** into `<repo>/source code/`:

```bash
git clone https://github.com/<owner>/<name>.git "<repo>/source code"
# shallow is fine if you don't need history:
git clone --depth 100 https://github.com/<owner>/<name>.git "<repo>/source code"
```

Cloning matters more here than it does for the Node.js benchmark, because several checks are **whole-repo questions, not diff questions**:

- `no-duplication-GR01` asks whether this advice already exists *somewhere else in the repo* — unanswerable from a diff alone.
- `no-broken-links-SK13` needs the file tree to confirm a relative path resolves.
- `not-shadowed-by-skill-SD03` and `discoverable-SD04` need to see the other artifacts.

So: **clone before reviewing**, and tell sub-agents the clone path up front. For the very large repos (mastra, coder), use `--depth 50 --filter=blob:none` and fetch blobs on demand.

`source code/` is git-ignored (see the repo-root `.gitignore`), so it never enters a commit and can be deleted and re-cloned freely.

## What's committed

Three files per repository, and nothing else:

- **`findings_history.json`** — the deliverable.
- **`repository.md`** — the context a run needs to avoid false positives.
- **`context/pr-list.json`** — the reviewed PR set, so the denominator is auditable.

Everything else a run touches is working material and is git-ignored:

- **`runs/`** — per-PR sub-agent output. Findings and ideas are merged into `findings_history.json`; what stays behind is each sub-agent's narrative `notes`.
- **`source code/`** — re-clone it.
- **`dashboard.html`** — a build artifact. Run `node dashboard-creator.js` after pulling. Its output is deterministic, so committing it would only produce diff noise on every run.

Don't add intermediate files to `context/`. `context/` holds `pr-list.json` and nothing else. If a run needs a scratch file, write it somewhere ignored.

## How to run a benchmark on a repo

The orchestrator's job is **dispatch and aggregation only**. It must not read PR diffs itself — that is what blows up the context window and what the sub-agents are for.

### 1. Load context

Read `<repo>/repository.md`. This single file is the context each sub-agent receives verbatim, so it starts informed rather than cold: what the repo is, its artifact inventory, and — critically — the conventions that *look* like violations and aren't.

If `<repo>/repository.md` doesn't exist yet, write it before running. A run without repo context produces false positives.

Confirm the **PR review automation** section of `repository.md` is present and current — a repo can adopt or drop a review bot between runs, and (as with `suna` and `coder`) the reviewer active *today* is often not the one that reviewed the PRs in the window. To (re)detect it, sample the reviewer logins on the actual reviewed set, not just the newest PRs:

```bash
# Which logins leave review comments, across recent PRs
gh api "repos/<owner>/<name>/pulls/comments?sort=created&direction=desc&per_page=100" \
  --jq '[.[].user.login] | group_by(.) | map({u: .[0], n: length}) | sort_by(-.n)'

# Then confirm in-window: for a sample of PRs from context/pr-list.json,
# fetch each PR's own review comments and tally the logins
gh api "repos/<owner>/<name>/pulls/<N>/comments?per_page=100" --jq '[.[].user.login]|unique|.[]'
```

Bot logins carry a `[bot]` suffix (`coderabbitai[bot]`, `chatgpt-codex-connector[bot]`, `cubic-dev-ai[bot]`, `baz-reviewer[bot]`, `cursor[bot]`, `qodo-merge-pro[bot]`) — with the notable exception of GitHub's `Copilot`, which has none. Ignore CI, scanner, and status bots: `github-actions[bot]`, `github-advanced-security[bot]`, `github-code-quality[bot]`, `superagent-security[bot]`, `strix-security[bot]`, `codecov[bot]`, `vercel[bot]`, `netlify[bot]` post status or security-scanner output, **not** line-by-line PR review — do not credit them as `also_found_by` unless one flagged the exact defect you filed. Record what you find in `repository.md`.

### 2. Fetch the PR set — 70 *in-scope* PRs

**A PR only counts if the skill had a fair chance to fire on it.** Everything else is excluded from the benchmark entirely: not reviewed, not counted in the denominator, producing no findings.

#### In scope

A PR is in scope if its diff **adds or modifies at least one file matching the routing table** in `../../SKILL.md`:

| Artifact type | Paths |
|---|---|
| Skill | any `SKILL.md` |
| Skill script | `skills/*/scripts/*`, `.claude/skills/*/scripts/*` |
| Pointer rule | `.cursor/rules/*.mdc` |
| Legacy `.cursorrules` | `.cursorrules` — **which checklist governs it varies by repo**; the repo's `repository.md` decides. In `coder` it is a symlink to `AGENTS.md` and graded as a context file; in `awesome-cursorrules` the `rules/**` corpus is graded as standards docs. See open issue 3. |
| Standards doc | `.claude/standards/*.md`, `standards/**`, `conventions/**` |
| Command | `.cursor/commands/*.md`, `.claude/commands/**/*.md` |
| Subagent | `.cursor/agents/*.md`, `.claude/agents/*.md` |
| Hook | `.cursor/hooks.json`, `.cursor/hooks/*`, the `hooks` key in `.claude/settings.json` |
| Context file | `AGENTS.md`, `CLAUDE.md` — at the repo root or any nested directory |
| Settings / env / mcp | `settings.json`, `environment.json`, `mcp.json`, `.mcp.json` under `.cursor/` or `.claude/` |

Everything a repo's `repository.md` marks as **product payload** is out of scope even when the path matches — see exclusion C.

**Mixed PRs are in scope.** If a PR touches both `src/` and `.claude/skills/`, review it — but review only the artifact files. Note in `notes` that application files were skipped by design.

There are five exclusion categories. A PR is excluded if it matches **any** of them.

#### A. No artifact surface

The diff touches no path in the table above. This is the overwhelming majority of PRs in a normal product repo and the single biggest filter in the process. Classify from `--json files`, never from diffs.

#### B. Maintenance

- Dependency bumps, lockfile-only changes, release/changelog PRs, version bumps
- Pure formatting or codemod-style reformatting of an artifact with no semantic change
- CI/workflow-only changes that add no artifact logic
- Translation/locale-string updates

A **formatting-only** change to a `SKILL.md` (whitespace, heading level, link reflow) is maintenance. A change to its *wording, structure, frontmatter, or advice* is functional and in scope.

#### C. Product payload masquerading as an artifact

Some repos in this benchmark are AI products that **ship** skills, agents, or prompt files as their own product surface — Suna's runtime skill corpus and Mastra's package templates are the live examples. Those files are the repo's product, not its development tooling, and the `sdlc-rules` checklists were written for the latter. Grading them measures nothing.

Each `repository.md` states exactly which paths are product payload for that repo. **Read it before classifying.** When a repo's context file doesn't settle it, the test is: *does this file steer an agent working on this codebase, or does it get shipped to the product's users?* Only the former is in scope.

#### C2. Vendored artifacts

Artifacts copied in wholesale from another project and tracked by a lockfile — `inbox-zero`'s `agent-browser/SKILL.md` (686 lines, vendored from `vercel-labs/agent-browser` via `skills-lock.json`) is the live example.

These are in-scope by path but **not actionable by the repo that hosts them**: nobody there wrote the file and nobody there can fix it without forking. A finding against vendored content measures the upstream project, not this one.

Treat a vendor *bump* (lockfile moves, content follows) as maintenance under **B**. A PR that genuinely *edits* vendored content locally is in scope — that's a real authoring decision. Each `repository.md` lists its vendored paths.

#### D. Damaged / repudiated PRs

PRs the project itself has already marked as not-real contributions. Exclude only on **objective, external evidence** that the project repudiated the PR: a maintainer retitle marking it as slop, a `[DELETED]` title/body, a `spam`/`invalid`/`ai-slop` label, or a maintainer comment saying it's bot-generated.

**This is a narrow exclusion, and it must stay narrow.** The test is whether *the project* disowned the PR, not whether *you* think the artifact is bad.

> **Do NOT exclude a PR because the artifact looks low-quality to you.** A bloated `SKILL.md`, a rule stuffed with code guidance, a `CLAUDE.md` that shouts — all of that is **exactly what the benchmark exists to catch**. Ordinary weak artifacts written in good faith are the most valuable material in the whole set. If your only reason to drop a PR is "this artifact isn't very good," that is a reason to *review* it.

Record excluded-as-damaged PRs in `damaged_prs`.

#### E. Duplicate resubmissions

The same change opened more than once. Detect by matching **normalized title + same author + same changed-file set**. Keep exactly one: the `MERGED` copy if there is one, otherwise the highest-numbered attempt.

Be conservative — this matters especially in `awesome-cursorrules`, where many PRs are legitimately "add rules for \<stack\>" and two PRs adding rules for *different* stacks are two changes, not duplicates. Record dropped numbers in `duplicate_prs`.

#### Fetching

Artifact-touching PRs are rare in product repos, so `gh pr list` is the wrong tool — its 100-PR window covers only days in a busy repo. Use **path-scoped commits** and map back to PRs:

```bash
# One query per artifact root; --paginate to go back far enough
gh api "repos/<owner>/<name>/commits?path=.claude&per_page=100" --paginate --jq '.[].sha'
gh api "repos/<owner>/<name>/commits?path=.cursor&per_page=100" --paginate --jq '.[].sha'
gh api "repos/<owner>/<name>/commits?path=AGENTS.md&per_page=100" --jq '.[].sha'

# commit -> PR
gh api "repos/<owner>/<name>/commits/<sha>/pulls" --jq '.[].number'
```

Nested `AGENTS.md`/`CLAUDE.md` need their own path queries — enumerate them from `gh api "repos/<owner>/<name>/git/trees/HEAD?recursive=1"` first.

Write the result to `<repo>/context/pr-list.json` with a `category` and an `artifact_files` array on each entry. `artifact_files` lists only the artifact paths the PR touched — it is what makes the PR in-scope, so **it is never empty**.

**Most repos in this benchmark will not reach 70.** That is expected: artifact churn is genuinely low outside collection repos. Use what exists, record the real count in `prs_reviewed`, and never pad the set with out-of-scope PRs to reach 70. A run with 18 PRs and an honest denominator is worth far more than one with 70 and a fake one.

Assign a `run_id` of `YYYY-MM-DD-<n>` (e.g. `2026-07-20-1`) and record the skill's current git commit — a run is only interpretable against the checklists as they were at the time.

### 3. Batch PRs across sub-agents

**Assign multiple PRs per sub-agent. Never one sub-agent per PR.** Each sub-agent re-reads the skill, the repo context, and the protocol, so one-per-PR is enormously wasteful.

- **~5 PRs per sub-agent** is the default shape. For a 70-PR set that's ~14 sub-agents; for a 20-PR set, 4.
- **Balance the batches.** Sort by `additions + deletions` and deal them round-robin so no agent gets all the monsters. A PR adding a 400-line `SKILL.md` costs far more than one fixing a frontmatter typo.
- Sub-agents run in parallel.

### 4. What each sub-agent gets

Give every sub-agent, in its prompt:

- The full text of `repository.md`
- Its assigned PR numbers **with their metadata** from `pr-list.json` (title, author, size, state, `artifact_files`) so it can plan its own budget
- The path to the skill (`skills/sdlc-rules/SKILL.md`), the routing table, and the instruction to load the checklists matching the artifact types in its PRs
- **The rule-code catalog below** — it is the aggregation key and sub-agents cannot invent codes
- The path to `<repo>/source code/`
- The finding bar and the output schema, both below
- The output directory: `<repo>/runs/<run-id>/`

### 5. What each sub-agent returns

Each sub-agent writes **one JSON file per PR** to `<repo>/runs/<run-id>/pr-<N>.json`, then returns to the orchestrator **only a summary line per PR** — PR number, category, finding count.

It must not return the findings themselves. The files on disk are the record; the orchestrator reads them at merge time. This is what keeps the orchestrator's context small enough to run a whole repo in one session.

### 6. Merge

The orchestrator reads `<repo>/runs/<run-id>/*.json`, flattens every finding into a finding record, and **appends one run entry** to `<repo>/findings_history.json`. Prior run entries are never modified or removed.

Ideas merge the same way: flatten every per-PR `ideas` entry into the run entry's `ideas` array, stamping each with `repo`, `pr`, and `pr_url`. Set `ideas_count` on the run entry.

Then run `node dashboard-creator.js` to regenerate `dashboard.html`.

## Token management

- **Classify cheaply.** Exclusion A — "no artifact surface" — removes the vast majority of PRs and costs one `--json files` call. Never fetch a diff to classify.
- **Read artifact files whole.** Unlike the Node.js benchmark, artifact files are small (a `SKILL.md` is under 3k tokens by spec). Reading the full file at the PR head is cheap and gives the container checklist what it needs. This is the opposite of the Node.js guidance to sample large diffs.
- **Never dump a lockfile** or application source. If a mixed PR changes 40 app files and one `SKILL.md`, read the `SKILL.md`.
- **Sub-agents return counts, not payloads.**
- **Sample honestly on bulk artifact PRs.** A PR adding 30 rule files to `awesome-cursorrules` doesn't need all 30 read line-by-line for the guideline pass — read a representative sample and *say so in `notes`*, recording what you read and what you didn't. Silent partial coverage is what makes a benchmark untrustworthy.

## The bar for a finding

**Review the diff, not the repo.** The question is always "did *this PR* introduce or modify an artifact that violates a check." Pre-existing problems in untouched artifacts are out of scope.

There is one deliberate exception. Checks whose subject is inherently repo-wide — `no-duplication-GR01`, `not-shadowed-by-skill-SD03`, `discoverable-SD04` — are evaluated against the **whole repo as context**, because that is the only way they mean anything. But the *finding* must still land on a line the PR changed: "this PR added advice that already exists at `X`" is a finding; "these two pre-existing files disagree" is not.

### Standing conditions

The most dangerous false-positive class in this benchmark is the **repo-wide standing condition**: a house style that violates a check identically in every artifact the repo owns. Real examples from the current set — `coder`'s eight skills all omit `allowed-tools` and `version`; its `AGENTS.md` shouts throughout.

Filed naively, these produce a finding on *every single PR that touches any skill*, which is worthless twice over: the count measures how many PRs the repo happened to open, not how much the skill caught, and the same defect is double-counted dozens of times.

The rule: **a standing condition is a finding only on the PR that introduces it, or on a PR that creates a new artifact carrying it.** A PR editing one line of a skill that already lacked `version` does not re-file `declared-version-SK04`.

Each `repository.md` lists that repo's known standing conditions. Read them before filing, and when you skip one on those grounds, say so in `notes` — a suppressed finding that goes unrecorded looks the same as a check that never ran.

A finding must clear **all four**:

1. **It's in the changed lines.** Added or modified by this PR. Not adjacent, not the file's existing state.
2. **You can point at it.** `path/to/file.md:LINE` plus the actual offending content quoted. No line, no finding.
3. **The check genuinely applies.** The check's precondition must exist in reality. The Workflows section applies only to multi-step workflow skills, not to a guidelines-only skill. `least-privilege-SK22` needs an `allowed-tools` field. Check the repo's N/A table first.
4. **It would survive pushback.** If a competent maintainer would say "that's deliberate" or "that's not what that check means," don't file it.

### Rule codes

Every finding must cite a code from the catalog below. **Never invent a code.** If nothing in the catalog fits, there is no finding — record it as an idea instead.

Codes are `<name>-<AREA><NN>`, where `NN` is the check's number in its checklist, mirroring the Node.js convention (`no-fixed-delay-TE08`).

> **Codes are positional.** `SK09` means "check 9 in `skill-checklist.md`". If a checklist is renumbered, every historical finding citing the moved code silently changes meaning. Before renumbering any checklist, either keep the old numbers stable and append new checks at the end, or migrate `findings_history.json`. See the *Open issues* section at the bottom.

#### Skill — `references/skill-checklist.md` (SK)

| Code | Check | Severity |
|---|---|---|
| `valid-name-SK01` | `name` matches parent dir, charset rules | error |
| `complete-frontmatter-SK02` | `name`/`description` present, optional fields spec-conformant | error |
| `explicit-allowed-tools-SK03` | `allowed-tools` set explicitly | warning |
| `declared-version-SK04` | `version` field present | warning |
| `actionable-description-SK05` | Says what it does and when to use it, concrete triggers | warning |
| `third-person-voice-SK06` | Directives address the agent; no "I can…"/"You can…" | warning |
| `honest-scope-SK07` | No keyword stuffing, trigger hijacking, "always use first" | warning |
| `calibrated-activation-SK08` | Description's pull matches the skill's role | warning |
| `lean-skill-md-SK09` | Body under 2,000 tokens | error |
| `progressive-disclosure-SK10` | Long detail lives outside `SKILL.md`, one level deep | warning |
| `no-slop-SK11` | Every line earns its tokens | informative |
| `no-emphasis-inflation-SK12` | No "important"/"critical" shouting | warning |
| `no-broken-links-SK13` | Every relative path exists | error |
| `clean-structure-SK14` | Descriptive names, closed fences, no dupes, no absolute paths | error |
| `spec-conformant-layout-SK15` | Root holds only `SKILL.md` (+ `config.toml`) and the four subfolders | error |
| `tracked-multistep-execution-SK16` | Workflow skills back the run with a to-do list | warning |
| `observable-steps-SK17` | Visible progress, per-step output, completion criteria | informative |
| `not-over-rigid-SK18` | Guides rather than dictating an inflexible script | warning |
| `progress-artifacts-SK19` | Durable artifacts emitted so runs are inspectable/resumable | warning |
| `reviewer-in-the-loop-SK20` | Supervised flows include a reviewer agent | warning |
| `no-injection-or-exfil-SK21` | No override/concealment/exfil/credential-read/remote-exec | error |
| `least-privilege-SK22` | `allowed-tools` minimal and used; side-effecting skills disable model invocation | error |
| `evals-when-behavior-matters-SK23` | Trigger + functional evals, incl. near-miss negatives | warning |
| `discriminating-cases-SK24` | A broken or uninstalled skill fails the evals | warning |
| `checked-token-cost-SK25` | Body and expanded tokens measured; references genuinely on-demand | warning |
| `resource-metric-eval-SK26` | At least one eval scores a resource budget as a threshold | warning |
| `right-home-no-duplication-SK27` | Advice detail lives in a reference doc, not `SKILL.md` | warning |

#### Guideline / rule line — `references/guideline-rule-checklist.md` (GR)

Applied **per discrete line of advice**, in any container.

| Code | Check | Severity |
|---|---|---|
| `no-duplication-GR01` | Same or conflicting instruction already exists elsewhere | error |
| `not-lintable-GR02` | Enforceable by ESLint/tsc/Prettier — automate instead | informative |
| `concise-GR03` | One clear rule, minimal example, no padding | warning |
| `right-home-GR04` | Correct container and location | warning |
| `calibrated-force-GR05` | No bold coercion, exclamation marks, or begging | warning |
| `measured-phrasing-GR06` | Prefer scoped guidance over "always"/"never" | informative |

#### Pointer rule — `references/rule-checklist.md` (PR)

| Code | Check | Severity |
|---|---|---|
| `allowed-pointer-content-PR01` | Only points to a skill/standards doc, or covers a non-coding topic | informative |
| `no-code-guidance-in-rule-PR02` | Contains code-style instruction that belongs in a skill or standards doc | error |

#### Standards doc — `references/standards-checklist.md` (SD)

| Code | Check | Severity |
|---|---|---|
| `stated-precedence-SD01` | States which doc wins on conflict | warning |
| `one-topic-per-file-SD02` | One coherent domain per file | warning |
| `not-shadowed-by-skill-SD03` | A skill doesn't already own this domain | error |
| `discoverable-SD04` | Something loads it on the relevant turn | warning |
| `every-line-scored-SD05` | Each advice line graded with GR checks | warning |

#### Context file — `references/context-file-checklist.md` (CF)

| Code | Check | Severity |
|---|---|---|
| `lean-budget-CF01` | Body under 2,000 tokens | error |
| `bounded-topics-CF02` | Each topic 2-3 paragraphs; link out beyond that | warning |
| `no-begging-or-emphasis-CF03` | No "please"/"important"/"critical" | warning |
| `covers-the-basics-CF04` | What it does, tests, key layers | warning |
| `defers-on-conflict-CF05` | Defers to a standards doc covering the same topic | warning |

#### Hook — `references/hook-checklist.md` (HK)

| Code | Check | Severity |
|---|---|---|
| `narrowest-event-safe-matcher-HK01` | Tightest event; JS regex, not POSIX classes | warning |
| `deliberate-fail-direction-HK02` | `failClosed` set appropriately; exit codes understood | warning |
| `runnable-script-HK03` | Executable, valid shebang, helpers confirmed on `$PATH` | error |

#### Stub checklists — no codes yet

`command-checklist.md`, `subagent-checklist.md`, `skill-script-checklist.md`, and `other-checklist.md` are placeholders with no checks. **They can produce no container findings.** When a PR changes a command, subagent, skill script, or settings file:

1. Run the **guideline pass** on any advice it contains — GR codes apply everywhere and are the only findings available for these types.
2. Record what a container check *would* have caught in `ideas`, with `area` set to the artifact type. Those ideas are the primary input for writing the four missing checklists, so they matter more here than anywhere else in the benchmark.
3. Set `container_checklist_missing: true` on the per-PR record so the gap is visible in the run stats rather than looking like a clean result.

### Severity

Every finding carries the `severity` of the check it cites, copied from the catalog above — `error`, `warning`, or `informative`. It is not a judgment call; it's a property of the check. This is what lets the dashboard weight a bloated `SKILL.md` (`error`) differently from a stray "always" (`informative`).

### Confidence

- `high` — unambiguous. The artifact plainly does what the check forbids.
- `medium` — the check applies and the artifact likely violates it, but intent or repo convention could justify it.
- `low` — **don't file it.** If you're at `low`, drop it.

`review-change.md` tells an interactive review to rank 1-5 and report only 5s. The benchmark is deliberately more permissive — it keeps `medium` so the dataset can show what a stricter cutoff would have discarded. Do not carry the 1-5 scale into finding records; use `confidence`.

**Five defensible findings beat twenty speculative ones.** A PR with no violations is a normal, expected, publishable outcome. Padding is worse than an empty list: it silently destroys the statistics this whole exercise exists to produce.

### Ideas

If you spot a genuine artifact problem that no check covers, record it in the per-PR file's `ideas` array. These are how the checklists grow — a first-class output of a run, not a footnote. Given four stub checklists, expect ideas to be *more* frequent in this benchmark than in the Node.js one.

**The bar is generality.** An idea must be a candidate *check*: something that would fire again, in other repositories, on artifacts nobody has seen yet. Ask "would I want this checked on every artifact PR?"

- **Yes** — "a skill's `description` must not name a specific model version, which goes stale silently." Mechanically checkable, applies anywhere.
- **No** — "this skill should reference the team's `deploy.md`." True, useful, entirely local.

Every idea must be **grounded in an artifact you actually read** — name the file and line. An idea with no `grounded_in` is a wish-list entry.

`area` should be one of the ten artifact types (`Skill`, `Guideline / Rule`, `Pointer Rule`, `Standards Doc`, `Context File`, `Hook`, `Command`, `Subagent`, `Skill Script`, `Settings / Other`) so ideas group alongside findings; use `Uncategorized` if none fit.

### Was it already caught? (`also_found_by`)

Finding a real problem is worth more if **nobody else found it**. Several benchmark repos already run a PR reviewer — a bot (CodeRabbit on `awesome-cursorrules` and `mastra`; cubic + Baz on `inbox-zero`) or human maintainers (`coder`). For every finding we file, we want to know whether that reviewer got there first. This turns the benchmark from "how many problems does the skill find" into the sharper question: **"how many artifact problems does the skill find that the repo's existing review process missed?"**

**Only applies when the repo has a PR reviewer.** `repository.md` records this. If the repo has none (`suna` during its window), set `also_found_by` to `null` on every finding and move on — do not go looking.

**How to check.** For each PR you review, fetch its review comments **once**, up front, before reading the diff:

```bash
# Inline (line-anchored) review comments — the ones that matter most
gh api "repos/<owner>/<name>/pulls/<N>/comments?per_page=100" \
  --jq '.[] | {user: .user.login, path, line, url: .html_url, body: .body[:600]}'

# Top-level PR comments — bots often post one summary comment here
gh api "repos/<owner>/<name>/issues/<N>/comments?per_page=100" \
  --jq '.[] | {user: .user.login, url: .html_url, body: .body[:1500]}'
```

**What counts as a match.** Match on the **substance of the problem**, not on wording, checklist name, or severity — the other reviewer describes it in their own language and won't cite our rule codes.

- **Match** — same defect, same artifact line. They wrote "this SKILL.md is huge, move the examples out" and we filed `lean-skill-md-SK09` on that file. Different vocabulary, same problem.
- **Match** — they flagged it a line or two away on the same artifact for the same reason. Line numbers drift; the defect is the unit.
- **Not a match** — they commented on the same line about something else (a typo, a broken link) while our finding is about token bloat.
- **Not a match** — a vague summary bullet ("consider tightening this file") with no anchor to the specific problem.

When genuinely torn, treat it as **not** a match and say why in `notes`. Over-crediting the other reviewer understates the skill; under-crediting is visible and auditable in the run file.

Record the reviewer's **login exactly as GitHub reports it**, including the `[bot]` suffix (`coderabbitai[bot]`, `cubic-dev-ai[bot]`, `baz-reviewer[bot]`, `Copilot`), or the human's username. If two reviewers both flagged it (common on `inbox-zero`, which runs two bots), record the first one chronologically and name the others in `notes`. `comment_url` is the `html_url` of the specific comment, so any match can be checked in one click — a match without a URL isn't verifiable, so don't claim one.

### Out of scope

Whole PRs excluded in step 2 never reach a sub-agent. Within an in-scope PR, these are still out of scope: application source, lockfiles, `CHANGELOG.md`, generated docs, and any path `repository.md` marks as product payload.

## Schema: per-PR run file

`<repo>/runs/<run-id>/pr-<N>.json`

```json
{
  "pr": 1421,
  "title": "Add code-review skill and wire it into CLAUDE.md",
  "state": "MERGED",
  "url": "https://github.com/elie222/inbox-zero/pull/1421",
  "author": "elie222",
  "additions": 214,
  "deletions": 6,
  "changed_files": 3,
  "artifact_files": [".claude/skills/code-review/SKILL.md", "CLAUDE.md"],
  "category": "feature",
  "reviewed": true,
  "container_checklist_missing": false,
  "pr_reviewers_present": ["cubic-dev-ai[bot]", "baz-reviewer[bot]"],
  "findings": [
    {
      "rule_name": "lean-skill-md-SK09",
      "rule_reference": "references/skill-checklist.md",
      "pass": "container",
      "artifact_type": "Skill",
      "file": ".claude/skills/code-review/SKILL.md",
      "line": 1,
      "code": "(whole file — 3,480 estimated tokens)",
      "description": "SKILL.md body is ~3,480 tokens, over the 2,000 budget and past the 3,000 spec limit. The four worked examples in the body belong in references/.",
      "severity": "error",
      "confidence": "high",
      "also_found_by": {
        "reviewer": "cubic-dev-ai[bot]",
        "reviewer_type": "bot",
        "comment_url": "https://github.com/elie222/inbox-zero/pull/1421#discussion_r1234567890",
        "quote": "This skill file is very large — consider splitting the examples into a references/ file."
      }
    },
    {
      "rule_name": "calibrated-force-GR05",
      "rule_reference": "references/guideline-rule-checklist.md",
      "pass": "guideline",
      "artifact_type": "Context File",
      "file": "CLAUDE.md",
      "line": 42,
      "code": "**ALWAYS** run `pnpm typecheck` before committing — this is CRITICAL!",
      "description": "Bold, capitalised coercion plus an exclamation mark on a single guideline line.",
      "severity": "warning",
      "confidence": "high",
      "also_found_by": null
    }
  ],
  "ideas": [
    {
      "area": "Command",
      "rule": "A command that takes arguments must state what happens when they are absent or malformed.",
      "why": "command-checklist.md is a stub, so nothing catches a command whose behavior on missing args is undefined. This is the single most common command defect observed.",
      "grounded_in": ".claude/commands/review.md:8"
    }
  ],
  "notes": "Free-text: what you read, what you sampled, judgment calls, and why an obvious-looking check did NOT fire."
}
```

`pass` is `container` or `guideline` — which of the two passes produced the finding. This is what makes the two-pass structure measurable: a run where the guideline pass produces nothing is a run where that pass was probably skipped.

`artifact_type` is the routing-table type the finding was graded as, so findings group by artifact type on the dashboard.

`pr_reviewers_present` lists the logins that left review comments on this PR at all — bot or human. It's the denominator context for `also_found_by`: an empty list means nobody reviewed this PR, so every finding on it being `also_found_by: null` is expected rather than a win. Omit it (or use `[]`) when the repo has no PR reviewer.

`also_found_by` is `null` when no other reviewer flagged the same problem — the common and desirable case. **Never omit the key**; `null` is a claim ("we checked, nobody caught it"), a missing key is silence. See "Was it already caught?" above for what counts as a match.

`category`: one of `feature` · `fix` · `refactor` · `docs-artifact` · `build` · `revert`. A PR that would be `deps`, `chore`, or `release` never reaches a sub-agent.

`notes` is where the reasoning lives, and it matters: it's how a human later audits whether a zero-finding result was correct or lazy.

## Schema: findings_history.json

One per repository, at `<repo>/findings_history.json`. This is the long-lived artifact — **append only**.

Finding records are flat and self-describing: each one carries the repo name, so records can be concatenated across all repositories and aggregated directly without walking a nested structure. Idea records follow the same shape in a parallel `ideas` array.

```json
{
  "repo": "inbox-zero",
  "url": "https://github.com/elie222/inbox-zero",
  "schema_version": 1,
  "runs": [
    {
      "run_id": "2026-07-20-1",
      "skill_commit": "ab397f4",
      "pr_range": { "from": 1180, "to": 1421 },
      "prs_scanned": 400,
      "prs_excluded_no_artifact": 341,
      "prs_excluded_maintenance": 12,
      "prs_excluded_product_payload": 0,
      "prs_excluded_damaged": 0,
      "damaged_prs": [],
      "prs_excluded_duplicate": 2,
      "duplicate_prs": [1302, 1303],
      "prs_reviewed": 45,
      "prs_with_findings": 21,
      "findings_count": 63,
      "findings_per_pr": 1.4,
      "findings_by_pass": { "container": 38, "guideline": 25 },
      "findings_by_severity": { "error": 11, "warning": 44, "informative": 8 },
      "prs_with_missing_container_checklist": 6,
      "repo_has_pr_reviewer": true,
      "pr_reviewers": ["cubic-dev-ai[bot]", "baz-reviewer[bot]"],
      "prs_with_reviewer_comments": 34,
      "findings_also_found_count": 7,
      "findings_unique_count": 56,
      "findings": [
        {
          "repo": "inbox-zero",
          "pr": 1421,
          "pr_url": "https://github.com/elie222/inbox-zero/pull/1421",
          "file": ".claude/skills/code-review/SKILL.md",
          "line": 1,
          "code": "(whole file — 3,480 estimated tokens)",
          "rule_name": "lean-skill-md-SK09",
          "rule_reference": "references/skill-checklist.md",
          "pass": "container",
          "artifact_type": "Skill",
          "description": "SKILL.md body is ~3,480 tokens, over the 2,000 budget and past the 3,000 spec limit.",
          "severity": "error",
          "confidence": "high",
          "also_found_by": {
            "reviewer": "cubic-dev-ai[bot]",
            "reviewer_type": "bot",
            "comment_url": "https://github.com/elie222/inbox-zero/pull/1421#discussion_r1234567890",
            "quote": "This skill file is very large — consider splitting the examples into a references/ file."
          }
        }
      ],
      "ideas_count": 9,
      "ideas": [
        {
          "repo": "inbox-zero",
          "pr": 1421,
          "pr_url": "https://github.com/elie222/inbox-zero/pull/1421",
          "area": "Command",
          "rule": "A command that takes arguments must state what happens when they are absent or malformed.",
          "why": "command-checklist.md is a stub, so nothing catches this today.",
          "grounded_in": ".claude/commands/review.md:8"
        }
      ]
    }
  ]
}
```

### Field reference

Run entry:

| Field | Meaning |
|---|---|
| `run_id` | `YYYY-MM-DD-<n>` |
| `skill_commit` | Git commit of the skill at review time — findings are only interpretable against a specific version of the checklists |
| `pr_range` | Lowest and highest PR number in the *reviewed* set |
| `prs_scanned` | How many PRs were fetched and classified |
| `prs_excluded_no_artifact` | Discarded under **A** — no artifact path in the diff |
| `prs_excluded_maintenance` | Discarded under **B** — deps, releases, formatting-only artifact changes |
| `prs_excluded_product_payload` | Discarded under **C** — shipped product surface, not repo tooling |
| `prs_excluded_damaged` | Discarded under **D** — project-repudiated PRs |
| `damaged_prs` | The PR numbers excluded under **D**, so a narrow exclusion stays auditable |
| `prs_excluded_duplicate` | Discarded under **E** |
| `duplicate_prs` | The PR numbers excluded under **E** |
| `prs_reviewed` | In-scope PRs actually reviewed — the benchmark denominator. Target 70, but **most repos will be well under**, and the real number is what gets recorded |
| `findings_per_pr` | `findings_count / prs_reviewed`. Comparable across runs on the same repo; compare across repos only with the caveat below |
| `findings_by_pass` | Container vs guideline split — a guideline count of 0 means the pass was skipped, not that the artifacts were clean |
| `findings_by_severity` | Error/warning/informative split |
| `prs_with_missing_container_checklist` | PRs whose artifact type routes to a stub checklist — the visible size of the coverage gap |
| `repo_has_pr_reviewer` | Whether this repo runs a PR reviewer (bot or line-by-line human) — mirrors `repository.md`. When `false`, `also_found_by` is `null` throughout and the three fields below are `null`, not `0` |
| `pr_reviewers` | The reviewer logins seen across the reviewed set, e.g. `["cubic-dev-ai[bot]", "baz-reviewer[bot]"]` |
| `prs_with_reviewer_comments` | How many of the reviewed PRs actually got reviewer comments. Coverage is never 100% — the honest denominator for "did the existing process have a chance to catch it" |
| `findings_also_found_count` | Findings with a non-null `also_found_by` |
| `findings_unique_count` | `findings_count - findings_also_found_count`. **The headline number for this dimension**: real artifact problems the repo's existing review process missed |

Finding record:

| Field | Meaning |
|---|---|
| `repo` | Repository name, repeated on every finding so records aggregate standalone |
| `pr` / `pr_url` | Which pull request introduced it |
| `file` | Path relative to the repo root |
| `line` | Line number in the file at the PR head |
| `code` | The offending content, quoted verbatim. For whole-file checks (`lean-skill-md-SK09`), state the measured value |
| `rule_name` | Stable code from the catalog — the aggregation key |
| `rule_reference` | Which checklist the check lives in |
| `pass` | `container` or `guideline` |
| `artifact_type` | Routing-table type it was graded as |
| `description` | What's wrong and why it matters, in one or two sentences |
| `severity` | `error` / `warning` / `informative`, copied from the catalog |
| `confidence` | `high` or `medium` (`low` findings are not filed) |
| `also_found_by` | `null` if no other reviewer flagged this same problem, otherwise the object below. Never omit the key |

`also_found_by` object:

| Field | Meaning |
|---|---|
| `reviewer` | GitHub login exactly as reported, `[bot]` suffix included — `coderabbitai[bot]`, `cubic-dev-ai[bot]`, `Copilot`, or a human username |
| `reviewer_type` | `bot` or `human` |
| `comment_url` | `html_url` of the specific comment, so a human can verify the match in one click. No URL, no claimed match |
| `quote` | A short verbatim excerpt of what they said, so the match can be judged without opening the link |

Narrative `notes` stay in the per-PR run files. `findings_history.json` carries findings and ideas only, so it stays queryable.

### Cross-repo comparability

`findings_per_pr` is honest **within** a repo and across runs on it. **Across** repos it needs care, for a reason specific to this benchmark: an artifact-touching PR in a product repo typically changes one small file, while an artifact-touching PR in a collection repo like `awesome-cursorrules` may add several hundred lines of pure advice, each line eligible for the six GR checks. Expect that repo's findings-per-PR to be an order of magnitude higher, and don't read it as "the skill works better there."

When comparing across repos, prefer `findings_by_pass.container / prs_reviewed`, which isn't distorted by how much advice a PR happens to contain.

## Adding a new benchmark repository

1. Create `<repo>/` with a `repository.md` — the one and only context file. Include the URL, what the project is, its **artifact inventory with real counts**, which artifact types are N/A, which paths are product payload, and — most valuable — the conventions that look like violations but are deliberate. Add a **PR review automation** section recording whether the repo has a PR reviewer, which logins, and roughly what share of the *in-window* PRs they cover (detection command in step 1). The reviewer active today is often not the one that reviewed the window — sample the window, not just recent PRs.
2. Nothing to set up for `source code/` — the clone command creates it, and it's git-ignored.
3. Check the repo has enough artifact PR history. Use the path-scoped commit queries in step 2 before committing to a repo; a repo with 8 artifact PRs in two years isn't worth a slot.
4. Run the process above. The first run creates `findings_history.json`.

## Open issues

Known gaps in this benchmark's design. Resolve before reading too much into the numbers.

1. **Rule codes are positional and live only here.** The catalog above is derived from checklist numbering, but the checklists themselves carry no codes. Renumbering a checklist silently invalidates history. The durable fix is to embed the code in each check line in `references/*-checklist.md` and have this document reference them rather than define them.
2. **Four checklists are stubs.** `command`, `subagent`, `skill-script`, and `other` have no checks, so those artifact types can produce only guideline findings. `prs_with_missing_container_checklist` measures the gap; the `ideas` stream is meant to close it.
3. **The `.cursorrules` legacy format isn't in the routing table.** Each affected `repository.md` states which checklist governs it for that repo. Fold the decision back into `SKILL.md` once it's settled.
4. **Token-budget checks (`SK09`, `CF01`, `SK25`) need a consistent estimator.** `SKILL.md` says a rough estimate within ~20% is enough, but two sub-agents estimating differently will disagree on a hard `error` threshold. Runs should state the method used in `notes`.
5. **`not-lintable-GR02` names JS tooling.** The check cites ESLint, TypeScript strict, and Prettier by name. A reviewer reading it literally will skip it on Go, Python, or Terraform advice, where the equivalents are `golangci-lint`, `go vet`, `gofmt`, `ruff`. The check should name the *category* of tool, not specific ones. This is the one place the checklists carry a hidden JS assumption; `coder` is the repo that exposes it.
6. **Non-PR artifact churn is invisible to this benchmark.** Several repos push artifact changes directly to `main` — in `suna` only ~34 of 91 artifact commits ever became a PR. The benchmark measures the PR-reviewed slice, which for some repos is a minority of real artifact evolution. A commit-based denominator would cover more but loses the review context a PR provides.
