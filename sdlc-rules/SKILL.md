---
name: sdlc-rules
version: "1.0"
description: "Use for any change to any file that steers AI coding, in any harness — Cursor (.cursor/) or Claude Code (.claude/) alike: skills, standalone guideline/standards docs, skill scripts, rules, commands, subagents, hooks (whether a dedicated file or a key inside settings.json), and harness permission files (settings.json, environment.json, mcp.json), plus agent context files like AGENTS.md and CLAUDE.md. This is the authority for creating and reviewing all AI coding artifacts in this repo. Deviating from these standards regresses workflows for dozens of developers."
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - StrReplace
  - Shell
  - AskQuestion
  - TodoWrite
---

# SDLC — AI Artifact Standards

## Key principle

Keep everything short, concise, and high signal-to-noise. This is the golden rule: every artifact and every review output should favor brevity over completeness

## Reviewing a change

`references/review-change.md` is the official process for reviewing any AI-steering artifact change, in any harness (Cursor `.cursor/`, Claude Code `.claude/`, or equivalent). Follow it whenever there is intent — explicit or implicit — to review an SDLC / AI-coding-harness change to the process itself (e.g. "review this skill", "does this rule look right?", "check my command"). It covers scope, classification, scoring by severity, the text report, and the optional HTML report.

## Artifact routing — which checklist applies

This is the **single source of truth** for mapping any AI-steering artifact to the checklist that governs it. Both creation/editing and the review process (`references/review-change.md`) route through this table; nothing else should restate it.

Two layers of review exist, and they are independent:

- **Container layer.** Every artifact is graded *as a whole* by exactly one container checklist — the one matching its type (a skill, a rule, a command, a hook, a context file, ...). Classify the artifact by its **path** first, then confirm with its **content**.
- **Guideline layer.** *Separately and additionally*, every individual piece of code advice — whether you call it a guideline, a best practice, or a rule, and no matter which file it lives in — must pass through `references/guideline-rule-checklist.md` on its own, line by line.

A single file is therefore graded **twice** when it contains code advice: once by its container checklist for the file overall, and once more by the guideline-rule checklist for each discrete piece of advice inside it. A file with no embedded advice gets only the container pass.

Classify each artifact using the table below — match on **path pattern** first, then verify by **content** — and load the corresponding checklist. Harnesses differ in *where* a given concept lives, not in *which* concepts exist: treat the Cursor and Claude Code paths in each row as equivalents, and apply the same row to any other harness's analogous location.

| Artifact type | How to identify it (path → content) | Checklist |
|---|---|---|
| Skill | any `SKILL.md` file (`.cursor/skills/*`, `.claude/skills/*`, `.agents/skills/*`, ...) | `references/skill-checklist.md` |
| Code guideline / best practice / rule line | an individual line of code advice, embedded in *any* file, of *any* type in this table — a skill, a standards doc, a pointer rule, a command, a subagent, a hook, a context file, anywhere | `references/guideline-rule-checklist.md` |
| Skill script | `skills/*/scripts/*` (any executable or helper script shipped with a skill) | `references/skill-script-checklist.md` |
| Pointer rule | `.cursor/rules/*.mdc` — a thin file that only points to a skill or states a non-coding constraint; it must *not* itself contain code guidance | `references/rule-checklist.md` |
| Standalone standards / guideline doc | a freestanding file of pure code guidance that isn't wrapped in a skill, e.g. `.claude/standards/*.md`, `standards/`, `conventions/` | `references/standards-checklist.md` |
| Command | `.cursor/commands/*.md`, `.claude/commands/**/*.md` (may be nested in subfolders) | `references/command-checklist.md` |
| Subagent | `.cursor/agents/*.md`, `.claude/agents/*.md` | `references/subagent-checklist.md` |
| Hook | `.cursor/hooks.json` + `.cursor/hooks/*` (Cursor: dedicated file) — or the `hooks` key inside `.claude/settings.json` (Claude Code: embedded, no separate file) | `references/hook-checklist.md` |
| Context file | `AGENTS.md`, `CLAUDE.md` (repo root, beside any `package.json`, or any nested directory) | `references/context-file-checklist.md` |
| Settings / env / mcp / harness permissions | `settings.json` (its `permissions`/`allow`/`deny` keys — not `hooks`), `environment.json`, `mcp.json`/`.mcp.json`, and any other harness or permission file | `references/other-checklist.md` |

A single file can match more than one row — most commonly its container row **plus** the code-guideline row for any advice it contains. Apply every checklist it matches. A pure guideline doc (standards, or a skill reference) gets *only* the code-guideline row per line — it has no other content to grade.

## Measuring tokens

Token budgets in the checklists are guidance, not exact gates. A rough estimate within ~20% is enough — estimate however is convenient; no specific tool or method is required.
