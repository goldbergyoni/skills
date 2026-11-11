# skills

A small collection of [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) for Claude Code, focused on the quality of the AI-steering layer itself — the skills, rules, commands and context files that tell coding agents how to work.

Each top-level directory is one skill.

## Skills

### `spoon` — moved

spoon now lives in its own repo: [practicajs/spoon](https://github.com/practicajs/spoon).

### `sdlc-rules` — standards for every AI-steering artifact

The authority for creating and reviewing anything that steers an AI coding agent, in any harness: skills, rules, commands, subagents, hooks, standards docs, context files (`AGENTS.md` / `CLAUDE.md`) and harness permission files (`settings.json`, `mcp.json`).

Its core is a routing table that maps an artifact to the checklist that governs it, plus a two-layer review model: every file is graded as a whole by its container checklist, and *separately* every individual piece of code advice inside it is graded line by line against the guideline checklist. `references/review-change.md` is the official review process — scope, classification, severity scoring, text report, optional HTML report.

Ships ten checklists under `references/` and an eval harness under `evals/` that runs the standards against real-world repositories (Coder, Mastra, Suna, Inbox Zero, awesome-cursorrules).

### `skill-review` — score a skill and render the verdict

Reviews and scores agent skills against an eight-pillar rubric — activation, instruction quality, structure/token efficiency, security, maintainability, evaluations, workflow efficiency, maintenance quality — and renders the result as an interactive dashboard. Takes a local skill directory, a GitHub URL, or a skills.sh listing.

The flow is: static scan (`scripts/static_scan.py` — frontmatter validation, body length, security patterns like injection phrasing, exfil destinations, dangerous commands, invisible unicode) → judge against the per-pillar rubrics → token analysis → emit JSON → render. Every finding carries verbatim evidence with `file:line` and an actionable fix; a CRITICAL security finding caps the score at 25 and marks the skill UNSAFE.

Five dashboard styles, all self-contained single-file HTML (see `demo/`):

| Style | Use it for |
|---|---|
| **Boardroom** | Executive scorecard — default for a single skill |
| **Watchtower** | Security-ops report, severity first — default for "is it safe?" |
| **Editor's Desk** | Annotated craft review with before→after rewrites |
| **Arena** | Corpus leaderboard, radar, popularity-vs-quality — default for comparisons |
| **Profiler** | Token economics and activation analysis |

## Install

Copy the skill directory into your skills folder:

```bash
git clone https://github.com/goldbergyoni/skills.git
cp -r skills/skill-review ~/.claude/skills/    # user-level, all projects
# or
cp -r skills/skill-review .claude/skills/      # this project only
```

Then just ask — e.g. *"review this skill"* or *"does this rule look right?"* — and Claude loads the skill by its description.

## License

MIT — see [LICENSE](LICENSE).
