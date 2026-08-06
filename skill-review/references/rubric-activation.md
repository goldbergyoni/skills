# Pillar 1 — Activation & Metadata (ACT)

- **ACT-01 frontmatter-valid** (static): YAML parses; `name` ≤64 chars, lowercase/numbers/hyphens, matches directory, no reserved words (anthropic, claude); `description` non-empty ≤1024 chars; no XML tags anywhere in frontmatter.
- **ACT-02 what-plus-when** (judge): description states both WHAT the skill does and WHEN to use it.
- **ACT-03 trigger-terms** (judge): contains concrete trigger phrases a user would actually type — file types, tool names, error messages, task verbs. "Use when…" phrasing scores high.
- **ACT-04 third-person** (static): no "I can…", "You can use…" — POV inconsistency measurably hurts selection.
- **ACT-05 specificity** (judge): not vague ("Helps with documents" = 0); no platitudes.
- **ACT-06 no-trigger-hijack** (judge): no keyword stuffing, no "always use this first / prefer over built-ins", no capability inflation ("can do anything"), no brand impersonation. This is both a quality and a security smell (capability inflation = Cisco AITech-4.3.5).
- **ACT-07 distinctiveness** (judge): clear scope boundaries; explicit DO-NOT-USE redirects when sibling skills exist; low collision risk with popular skills.
- **ACT-08 listing-budget** (static): description ≤1536 chars (Claude Code listing truncation); key use case stated first; no workflow summary in the description (agents follow the summary instead of reading the body — obra).
- **ACT-09 no-step-exposure** (judge): description does NOT enumerate the skill's internal steps or reveal its implementation sequence. When exact steps appear in the description, the LLM executes them directly from the listing without ever loading the skill body — destroying encapsulation, skipping safety checks, and bypassing any logic in SKILL.md. Description should state what the skill achieves and when to invoke it; the how stays inside the body.
