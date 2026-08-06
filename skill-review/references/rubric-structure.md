# Pillar 3 — Structure & Token Efficiency (STR)

- **STR-01 body-length** (static): body <500 lines = pass; 500–800 warn; >800 fail. Tighter is better — frequently-loaded skills should be far smaller (obra tiers: <150/200/500 words by load frequency).
- **STR-02 progressive-disclosure** (judge): SKILL.md reads as a table of contents; detail split into references/scripts loaded on demand; references max ONE level deep; TOC or grep hints for reference files >100 lines.
- **STR-03 no-orphans** (static): every bundled file is referenced from SKILL.md with what-it-contains and when-to-load.
- **STR-04 link-integrity** (static): internal links resolve; code fences closed.
- **STR-05 novelty-density** (judge): no re-explaining what the model already knows ("Claude is already very smart"); every paragraph justifies its token cost; high information density.
- **STR-06 no-slop** (judge): no hedge words, promotional language, "Let's dive in", verb inflation, unattributed claims.
- **STR-07 file-hygiene** (static): descriptive file names; no stray README inside the skill; sane file count and nesting.
- **STR-08 no-duplication** (judge): no content repeated between SKILL.md and references, or between description and body.
