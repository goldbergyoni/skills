# Subagent Checklist

Subagents live at `.cursor/agents/*.md` or `.claude/agents/*.md` (markdown with YAML frontmatter: `name`, `description`, optional `tools`/`model`, then the system prompt body).

## Checks

1. **Delegation-ready description** — the `description` frontmatter states *when* to invoke the agent (trigger conditions, e.g. "Use immediately after writing or modifying code"), not just what it is. The description is the router input; a label-style description ("Expert code reviewer") means the agent is rarely or never auto-selected. `{severity: warning}`

2. **Least-privilege tools** — `tools` is listed explicitly and matches the role: reviewers/analyzers are read-only (no Edit/Write); omitting `tools` inherits *everything*, including all MCP tools and the ability to spawn nested agents. Flag `permissionMode: bypassPermissions`. `{severity: warning}`

3. **Self-contained prompt with output contract** — the subagent starts with a fresh context: no conversation history, no files already read. The prompt body must stand alone (no "the changes we discussed") and define the report format (e.g. severity levels with `file:line` refs), because only the final message returns to the caller — everything else is discarded. `{severity: warning}`
