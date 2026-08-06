# Context File Checklist

Context files are dedicated AI-coding documents — `AGENTS.md`, `CLAUDE.md`, and the like — that orient an agent to a repo, app, library, or component, at the root or any nested directory. They load on every relevant turn, so they spend the agent's attention budget directly.

## Checks

1. **Lean budget** — body under 2,000 tokens. Estimate with the method in `SKILL.md` and print the count; move overflow into linked docs. `{severity: error}`

2. **Bounded topics** — keep each topic to 2-3 paragraphs. When one needs more, summarize and link a dedicated doc instead of expanding inline. `{severity: warning}`

3. **No begging or emphasis inflation** — avoid pleading and shouting words ("please", "important", "critical"); when every line shouts, none stands out. `{severity: warning}`

4. **Covers the basics** — states what the component/lib does, whether tests exist (and how to run them) or that none do, and the key layers/architecture. `{severity: warning}`

5. **Defers on conflict** — when a standalone standards doc (`references/standards-checklist.md`) covers the same topic, this file states that doc wins instead of restating or contradicting it. `{severity: warning}`
