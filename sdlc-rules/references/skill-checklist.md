# Skill Checklist

## Structure And Intent

1. **Valid name** — `name` matches the parent directory: 1-64 chars, lowercase letters/numbers/single hyphens, no leading or trailing `-`, no `--`. `{severity: error}`

2. **Complete frontmatter** — `name` and `description` present; optional fields follow the spec; nothing relies on undocumented client behavior. `compatibility`, if used, names real requirements (1-500 chars). `{severity: error}`

3. **Explicit `allowed-tools`** — the skill sets `allowed-tools` explicitly rather than leaning on defaults. `{severity: warning}`

4. **Declared `version`** — the skill carries a `version` field. `{severity: warning}`

5. **Actionable description** — says what the skill does and when to use it, using concrete trigger phrases users would type. 1-1024 chars; aim under ~100 tokens; never leak internal workflow steps. `{severity: warning}`

6. **Third-person voice** — directives address the agent. No "I can…" or "You can use…"; POV drift measurably hurts skill selection. `{severity: warning}`

7. **Honest scope** — no keyword stuffing, trigger hijacking, official-sounding claims, or "always use first" language. Distinct from sibling skills; states when *not* to use it if overlap is likely. `{severity: warning}`

8. **Calibrated activation** — the description's pull matches the skill's role: scoped domain knowledge or a utility doesn't invite eager loading, and an infrastructurally important artifact doesn't read as too niche to fire. `{severity: warning}`

9. **Lean `SKILL.md`** — routing, invariants, and first steps only. Estimate the used tokens - body under 2,000 tokens; if it nears the 3,000-token spec limit, move detail to `references/`, `scripts/`, or `assets/`. Estimate with the method in `SKILL.md`. `{severity: error}`. Please include/print in results the estimated token count

10. **Real progressive disclosure** — long procedures, examples, templates, and tables live outside `SKILL.md` and load on demand. References stay one level deep; each bundled file is cited with what it holds and when to load it. `{severity: warning}`

11. **No slop, high density** — every line earns its tokens. Cut hedging, promo filler ("Let's dive in"), verb inflation, and anything that re-explains what the model already knows. `{severity: informative}`

12. **No emphasis inflation** — avoid strong, bold attention words like "important" or "critical"; when many sections shout, they compete for the LLM's attention and none stands out. `{severity: warning}`

13. **No broken links** — every relative path the skill names exists in the skill directory (unless a stable web URL). Check `SKILL.md`, `references/*.md`, and script usage text, including renamed files. `{severity: error}`

14. **Clean structure** — descriptive file names, closed code fences, no orphaned files, no content duplicated across `SKILL.md`, frontmatter, and references. No absolute user paths, stale model names, or unmarked time-sensitive claims. `{severity: error}`

15. **Spec-conformant layout** — the root holds only `SKILL.md` (an optional `config.toml` is also allowed), and potentially the subfolders `references/`, `scripts/`, `assets/`, and `evals/`. Anything else deviates from the spec. `{severity: error}`

## Workflows

> Applies only to skills that drive a multi-step workflow — not to skills that merely hold a set of guidelines

16. **Tracked multi-step execution** — a workflow skill breaks work into real steps and guarantees follow-through by backing the run with a to-do list: it hooks into the harness to enqueue items, or keeps its own instructed-to-update `task.md`, or uses an equivalent measure — but some form of tracked checklist must exist. `{severity: warning}`

17. **Observable steps** — multi-step skills define visible progress, per-step output, and completion criteria. Long runs add checkpoint/resume and keep a summary or transcript. `{severity: informative}`

18. **Not over-rigid** — the workflow leaves room for the LLM to judge and adapt; it guides rather than dictating an inflexible step-by-step script that removes reasonable decision-making. `{severity: warning}`

19. **Progress artifacts** — the workflow emits durable artifacts as it runs so the internals can be inspected afterwards and the run resumed safely after a failure — e.g. each agent participating in the flow writes its outcome into a designated folder. `{severity: warning}`

20. **Reviewer in the loop** — when the work needs supervision and has verifiable outcomes, the flow includes a reviewer agent that guarantees those outcomes — ideally a subagent for full context and autonomy. `{severity: warning}`

## Security And Trust

21. **No injection or exfil** — none of: instruction override ("ignore previous instructions"), concealment ("don't tell the user"), coercive "use this first" tool-poisoning, exfil sinks (webhooks, pastebin, raw IPs, markdown-image data URLs), reads of `~/.ssh` / `.env` / credentials, `curl … | sh` / reverse shells / `rm -rf ~`, committed secrets, invisible or bidi Unicode, or instructions to fetch and execute remote content at runtime. `{severity: error}`

22. **Least privilege, honest manifest** — `allowed-tools` is minimal and actually used; side-effecting skills (deploy/commit/send) set `disable-model-invocation: true`; the declared scope matches real behavior — a "read-only" skill with write or network steps fails. `{severity: error}`

## Testing And Evaluation

23. **Evals when behavior matters** — trigger evals cover should-trigger and should-not-trigger prompts, including near-miss negatives and implicit wording. Functional evals assert on output, not just activation. `{severity: warning}`

24. **Discriminating cases** — a broken or uninstalled skill fails them. Use realistic prompts with paths, context, and enough ambiguity to test real value. `{severity: warning}`

25. **Checked token cost** — measure `SKILL.md` body tokens and full expanded tokens (method in `SKILL.md`), and confirm references are genuinely on-demand, not a wrapper that always loads everything. `{severity: warning}`

26. **Resource-metric eval** — at least one eval tracks a resource budget (tokens, latency, or cost) as a scored threshold, not just a logged number. `{severity: warning}`

## Instruction And Rule References

27. **Right home, no duplication** — score every instruction, rule, or guideline line with `guideline-rule-checklist.md`. This checklist only verifies such detail lives in a reference doc, not in `SKILL.md`. `{severity: warning}`
