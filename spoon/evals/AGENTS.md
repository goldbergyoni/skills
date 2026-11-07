# Spoon evals: guide for agents

This folder tests the spoon skill (`../skills/spoon`) with promptfoo. Each case sends a realistic user message, runs it twice, and checks the answer. Every case runs on 4 real agent tools, never the raw API. The 4 tools are `claude -p` (`claude-cli`), the Claude Agent SDK (`claude-sdk`), Codex (`codex`) and OpenCode (`opencode`). Both Claude tools use Sonnet 5.5 at medium effort. Codex uses its default model, and OpenCode uses its free `big-pickle` model. The cases cover five areas: the skill triggers, the answer length (`1s`, `1p`, `1m`), the format (`bul`, `html`, the 🥄 footer), verification (`ver1`, `ver3`, Claude only), and subagent features (`ver2`, `ver3`, `cr`, Claude only: the reply must be a finished, clean answer that fits the dose).

The files: `promptfooconfig.yaml` holds the providers, run settings, cases and checks. `run.sh` is the only entry point. It computes the skill version (`metadata.version` plus a hash of the skill's `.md` files) and makes a fresh temp workspace. It links spoon into the workspace at `.claude/skills/spoon` and `.agents/skills/spoon`, then runs `npx promptfoo eval`. `provider.js` wraps `claude -p`, because promptfoo has no built-in provider for it. It returns the same `toolCalls` and `skillCalls` data as the built-in providers. `asserts.js` holds only the checks promptfoo has no built-in for. `results/results.csv` is kept in git, and the other files in `results/` are ignored.

Only this repo's spoon may load, never a copy from `~/.claude`, a plugin or a marketplace. Each part of the setup helps:
- The workspace sits outside any git repo.
- Claude runs with `setting_sources: [project]`.
- `run.sh` sets `OPENCODE_DISABLE_CLAUDE_CODE=1`.
- The workspace path is resolved with `pwd -P`. On macOS `/var` links to `/private/var`, and without the real path promptfoo can miss a skill load.

Every case runs two checks: the built-in `skill-used`, and `spoonFromWorkspace`, which fails if any spoon file came from outside the workspace. The one exception is the negative trigger case (a plain question with no `spoon` or `sp`): it turns the defaults off and asserts `not-skill-used` instead.

Rules when you change things:
- **Don't edit the skill:** report skill problems instead.
- **Prefer config over code:** if a promptfoo built-in check or setting can do the job, use it before adding JavaScript.
- **Keep checks working on every provider:** they read only promptfoo's standard metadata.
- **Keep the version stamp:** each run is labeled with the spoon version, so results map to a skill version.
- **No invented results:** report only what a real run showed.

Run it with `./run.sh`, and add promptfoo flags after it, e.g. `./run.sh --filter-pattern dose`. Logins: Claude Code for both Claude tools, Codex's `~/.codex` for Codex, and none for OpenCode's free model. A full run takes 5–6 minutes and costs about $2 for the Claude tools. Known limits:
- **Provider filter:** a filter must keep one Claude tool, e.g. `--filter-providers 'codex|claude-cli'`. Otherwise promptfoo stops on the Claude-only cases.
- **OpenCode:** the free model sometimes hangs and returns empty answers. Rerun before blaming the skill.
- **Full view:** use `npx promptfoo view` for reasons, costs and transcripts.
