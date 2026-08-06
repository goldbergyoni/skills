# Standards / Guideline Doc Checklist

A freestanding file of pure code guidance that isn't wrapped in a skill — e.g. `.claude/standards/*.md`, `standards/`, `conventions/`. Unlike a pointer rule (`rule-checklist.md`), this file's entire job *is* to hold code advice, so it doesn't get the "no code guidance" restriction.

## Checks

1. **Stated precedence** — when the same topic could also be covered in a context file (`CLAUDE.md`/`AGENTS.md`) or a skill, the doc states which one wins on conflict. `{severity: warning}`

2. **One topic per file** — a single file covers one coherent domain (e.g. `typescript.md`, `styling.md`); don't merge unrelated domains into one doc or split one domain across several. `{severity: warning}`

3. **Not shadowed by a skill** — if a skill already owns this domain's guidance, this doc is redundant; point to the skill instead of duplicating it here. `{severity: error}`

4. **Discoverable** — something loads this doc on the relevant turn (a context file link, a skill reference, or an explicit rule pointer). An unreferenced standards file never reaches the model. `{severity: warning}`

5. **Every line scored individually** — each discrete piece of advice in the doc is graded with `guideline-rule-checklist.md`, regardless of container hygiene above. `{severity: warning}`
