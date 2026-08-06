# Pillar 5 — Maintainability & Ops (OPS)

- **OPS-01 versioning** (static): version present; changelog or visible iteration. Warn if absent.
- **OPS-02 license** (static): license declared.
- **OPS-03 portability** (static): no absolute user paths (`/Users/<name>/`), forward slashes only, `${CLAUDE_SKILL_DIR}` for self-references, no personal/company-internal names.
- **OPS-04 script-hygiene** (static+judge): shebangs; explicit error handling ("solve, don't punt"); no voodoo constants; dependencies listed with install commands.
- **OPS-05 freshness** (judge): no time-sensitive content outside a clearly-marked legacy section; no references to dated model names/versions likely to rot.
