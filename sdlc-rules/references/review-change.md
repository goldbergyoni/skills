# Reviewing a Change

The official process for reviewing any AI-steering artifact change, in any harness — Cursor (`.cursor/`) or Claude Code (`.claude/`) alike. Follow it whenever there is intent — explicit or implicit — to review an SDLC / AI-coding-harness change to the process itself.

## 1. Scope — what to review

- **Explicit target** — if the ask names a specific file, artifact, or area, review only that.
- **Otherwise** — review everything changed under `.cursor/` and `.claude/`, plus any changed agent context file (`AGENTS.md`, `CLAUDE.md`, at any depth), in the diff against `main`.

## 2. Classify and route — which doc holds the§ checklist

Classify each changed file by its path and content, then load the matching checklist using the **Artifact routing** table in `SKILL.md`. That table is the single source of truth for the artifact-type → checklist mapping; do not restate it here.

Review each changed file in up to two passes and merge findings under that file:

1. **Container pass** — classify the file and run its container checklist.
2. **Guideline pass** — when the change adds or edits code advice (guidelines, best practices, rule lines), score each discrete line with `guideline-rule-checklist.md`, regardless of which file it lives in.

Run the guideline pass whenever code advice changed, even if the container checklist is a stub. If the container checklist isn't ready yet, note that and skip container checks — but still run the guideline pass when applicable.

## 3. Score each check

Evaluate every check against the actual diff. For each, record `PASS`, `FAIL`, or `N/A`, with a one-line reason on any `FAIL`. Each check carries a `{severity: error | warning | informative}` tag; a `FAIL` is a finding at that severity. `PASS` and `N/A` are not findings.

For every finding, state where the faulty thing is (file and line/section), and when it's easy, show a potential fix. This is secondary to the golden rule of keeping things short — don't pad.

Rank each finding 1–5 for how sure you are it's correct. Drop everything ranked 1–4; report only findings ranked 5.

## 4. Text report

Per file, print:

```
## SDLC Review: <file>

Type: <type> · Checklist: <checklist>

| # | Check | Severity | Result | Note |
|---|-------|----------|--------|------|
| 1 | <name> | error | PASS / FAIL / N/A | <reason if FAIL> |

Findings — errors: <n> · warnings: <n> · informative: <n>
```

Findings count `FAIL`s grouped by severity. After the last file, print one combined total across all files

## 5. Offer the HTML report

If the original ask already requested an HTML report, skip this step and go to step 6. Otherwise, after the text report, use the `AskQuestion` tool to ask whether to generate a richer HTML report. Generate it only on a positive answer.

## 6. HTML report

Template: `assets/review-report-template.html.tmpl`. Read it, replace only the `reviewData` object, save to `$TMPDIR/sdlc-review.html` (outside the workspace — the repo ignores `*.html`), then open it.

Populate `reviewData`:

- `generatedAt` — when the review ran.
- `summary` — computed by the template from items; don't set it.
- `artifacts` — one entry per reviewed file: `type`, `file`, `checklist`, `sections`.

Each section is `{ name, kind, items }`. `kind` is `container` (default) or `guideline`. Each item is `{ num, check, severity, result, note, description? }`:

- `severity`: `error | warning | informative`
- `result`: `PASS | FAIL | N/A`
- `description`: criterion text from the checklist (the part after the em dash) — include it so rows can expand with "What this checks"

**Building tabs** — the report is flat: every tab sits at the top level, no nesting.

1. Summary is always the first tab.
2. Each container checklist `##` heading becomes its own tab — one per category. Mark these sections `kind: "container"`; the template labels each tab `<Type> - <category>` (e.g. `Skill - Security And Trust`, `Rule - Checks`). Don't put the file topic or path in the tab name.
3. Every guideline/rule line scored with `guideline-rule-checklist.md` — across all files — collapses into one dedicated `Instruction And Rule` tab. Mark those sections `kind: "guideline"`; the template merges them into that single tab and groups them by file inside it. Don't give each file its own guideline tab.
4. Place each scored check under the category whose `##` heading it sits under in its checklist.
5. Skip conditional categories that don't apply to the artifact — e.g. the skill checklist's `Workflows` applies only to multi-step workflow skills, so omit it (no tab) for a guidelines-only skill. Empty categories likewise produce no tab.
