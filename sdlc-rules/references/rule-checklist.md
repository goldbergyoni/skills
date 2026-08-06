# Pointer Rule Checklist

Pointer rules are thin, always-loaded files — Cursor's `.cursor/rules/*.mdc` is the canonical example. Coding guidelines are not allowed here; that's what a skill or `standards-checklist.md` doc is for.

## What's allowed

A pointer rule file may only:
1. Point the agent to an existing skill (e.g. `use-coding-and-testing-skills.mdc`, `use-sdlc-skill.mdc`) or standards doc
2. Cover a non-coding topic: workflow constraints, security/legal requirements, environment setup, file-scope triggers `{severity: informative}`

## What's disallowed

Any TypeScript, React, styling, naming, or other code-style instruction belongs in a skill reference article or a standalone standards doc — not here. If the proposed rule contains such guidance, reject it and instruct the author to move it to the relevant skill (e.g. `.cursor/skills/`, `.claude/skills/`) or a `standards/` doc. `{severity: error}`

## Examples

- Allowed: `must-read-agentsmd.mdc` — workflow/legal constraint
- Allowed: `use-coding-and-testing-skills.mdc` — skill pointer
- Disallowed: a rule describing how to write boolean conditions — move to `frontend-coding/references/typescript.md` or a standalone `standards/typescript.md`
