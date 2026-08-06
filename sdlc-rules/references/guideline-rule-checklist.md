# Guideline / Rule Checklist

A guideline (also: rule, practice, best practice) is any single, discrete piece of code advice — one instruction line — wherever it lives: a skill, a standards doc, a reference doc, a pointer rule, a command, a subagent, a hook, a context file (`CLAUDE.md`/`AGENTS.md`), or anywhere else, in any harness. Score each one individually with this checklist, regardless of its container.

## Checks

1. Not duplicated — search everywhere guidelines live: skill references (`.cursor/skills/**/*.md`, `.claude/skills/**/*.md`), standalone standards docs (`.claude/standards/*.md`, `standards/**`), pointer rules (`.cursor/rules/*.mdc`), commands (`.cursor/commands/*.md`, `.claude/commands/**/*.md`), and context files (`CLAUDE.md`, `AGENTS.md`) — for the same or conflicting instruction. If it already exists or directly conflicts, reject and point to the existing location. `{severity: error}`

2. Not lintable — if the rule can be enforced automatically (ESLint, TypeScript strict, Prettier), prefer that instead. Only add a prose guideline when automation isn't practical. `{severity: informative}`

3. Concise — one clear rule, minimal bad/good example if needed, no prose padding. If it needs more than one paragraph to explain itself, it belongs in a design doc, not a guideline. `{severity: warning}`

4. Right home — placed in the correct container and location
   - It fits logically where it lives, and no other container is a better candidate to hold it. `{severity: warning}`

5. Calibrated force — never, in any case, use dramatic forced language to coerce the model: no bold formatting, no exclamation marks, no begging. `{severity: warning}`

6. Measured phrasing — generalizing words like "always"/"never" are not ideal; prefer scoped guidance. This alone is not a warning. `{severity: informative}`
