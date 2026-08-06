# Pillar 9 — Rules & Guidelines Quality (RUL)

Conditional: scored only when the skill contains coding instructions, best-practice rules, or prose guidelines (e.g. a `references/typescript.md`, `references/react.md`, or any file whose primary content is "do X / don't do Y" directives). Purely procedural workflow skills or configuration-only skills skip this pillar.

**Unit of review:** each rule is evaluated individually, not the file as a whole. Extract every distinct instruction line or bullet before scoring — a file with 12 rules gets 12 independent verdicts, then pillar score = mean across all verdicts.

---

- **RUL-01 not-duplicated** (judge): the rule does not already exist — in equivalent or conflicting form — in any other skill reference doc in the corpus. Reviewer must search sibling skills for the same directive before accepting. If a duplicate exists, score 0 and cite the existing location. If a direct conflict exists (rule A says do X, rule B says avoid X), score 0 and flag both sides.

- **RUL-02 not-lintable** (judge): the rule cannot be enforced automatically by a standard tool (ESLint, typescript-eslint strict, Prettier, Stylelint, etc.). If a linter rule already covers this case, score 0 — the prose guideline is redundant and creates drift risk when the linter config changes. Only prose guidelines that require human/LLM judgment earn points here.

- **RUL-03 concise** (judge): one unambiguous directive per bullet; a minimal bad/good example when clarifying intent; no prose padding or rationale paragraphs. If the rule requires more than two sentences to state, it belongs in a design doc, not a guideline. A tight one-liner with an optional bad/good pair scores 4; a paragraph-length explanation scores ≤1.

- **RUL-04 right-home** (judge): the rule is placed in the skill and reference file that is the single most logical owner — not a catch-all, not duplicated into multiple homes. The skill description must cover this domain; no other skill is a better fit. Misplaced rules (TypeScript-level rule in a React file, backend rule in a frontend skill) score 0 with a relocation suggestion.
