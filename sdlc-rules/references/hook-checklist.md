# Hook Checklist

Hooks live in `.cursor/hooks.json` with scripts under `.cursor/hooks/*` (Cursor), or under the `hooks` key inside `.claude/settings.json` (Claude Code — no separate file). Identify the harness first; the checks below apply to either location. For the full authoring procedure, follow the `create-hook` skill; this checklist is the quick review gate.

## Checks

1. **Narrowest event, safe matcher** — pick the tightest event that matches the goal. Matchers are JavaScript regex (`\s`, never POSIX `[[:space:]]`); get the hook firing with no or a trivial matcher before tightening. `{severity: warning}`

2. **Deliberate fail direction** — gating hooks (shell/MCP/tool approval) set `failClosed: true` if dealing with security or critical missions, so a crash or timeout blocks rather than silently allows. Know the exit codes: `0` = success, `2` = block, any other non-zero fails open unless `failClosed`. `{severity: warning}`

3. **Runnable script** — the script is executable (`chmod +x`) with a valid shebang, and every helper it calls (`jq`, `python3`, `node`, repo CLIs) is confirmed on `$PATH`. Don't assume a common binary exists in the hook environment. `{severity: error}`

4. **Untrusted stdin, no shell interpolation** — every field from the stdin JSON (`file_path`, commands, prompts) is attacker-influenced: paths can contain spaces, `$()`, and backticks, and command substitution executes even inside double quotes (this exact bug class is CVE-2026-35021). Quote everything, or prefer exec form (`command` + `args` array) which skips shell tokenization entirely. `{severity: error}`

5. **Hook config is arbitrary code execution** — committed hook config (`.claude/settings.json`, `.cursor/hooks.json`) runs with full user permissions, no sandbox, on every session (real RCE + token-exfil CVE: CVE-2025-59536). Review a hooks diff like a CI-pipeline change: read every command string, resolve every referenced script, flag network calls and secrets in the config. `{severity: error}`

6. **Loop-safe** — a Stop/SubagentStop hook that can block must check `stop_hook_active` (Cursor: bounded `loop_limit`) and exit 0 when set, or it blocks → agent works → blocks again, burning whole sessions. Same class: a PostToolUse formatter that edits files must not re-trigger itself — call a deterministic CLI (`prettier`, `ruff`) and never invoke the agent from a hook. `{severity: warning}`
