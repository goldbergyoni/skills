# Spoon evals

Run: `./run.sh`. Extra args go to promptfoo, e.g. `./run.sh --filter-pattern dose`.

To run fewer tools, keep one Claude tool in the filter, e.g. `--filter-providers 'codex|claude-cli'`. promptfoo stops if a Claude-only case has no Claude tool to run on.

Every case runs twice on 4 agent tools:
- **claude-cli**: `claude -p` (Sonnet 5.5). promptfoo has no built-in for it, so it lives in `provider.js`.
- **claude-sdk**: promptfoo's built-in `anthropic:claude-agent-sdk` (Sonnet 5.5)
- **codex**: `openai:codex-sdk`, with Codex's default model and your ChatGPT login
- **opencode**: `opencode:sdk`, with the free `big-pickle` model, because OpenCode has no Claude or OpenAI login here

Logins: Claude Code for both Claude tools, Codex (`~/.codex`) for Codex. OpenCode's free model needs none.

**Only this repo's spoon loads.** `run.sh` makes a temp workspace outside git. It links `skills/spoon` where each tool looks for project skills: `.claude/skills` for Claude, `.agents/skills` for Codex and OpenCode. User copies stay out:
- Claude loads only project settings.
- OpenCode's `~/.claude` lookup is turned off.
- Codex and OpenCode have no user spoon.

**Checks.** Most are promptfoo built-ins: `skill-used`, `word-count`, `regex`, `llm-rubric`. `asserts.js` holds only what has no built-in:
- every spoon file a tool used is in the workspace
- sentence count
- bold bullets
- an HTML file on disk
- the subagent count
- the transcript for the judge

The `ver1` and `ver3` cases run on Claude only, because the skill's subagent steps use Claude Code tools. So do the three *subagents* cases (`ver2`, `ver3`, `cr`): they check that a reply with subagents is a finished answer with the 🥄 last and no referee chatter in the body, and that it still fits the dose.

**Results.** `results/results.csv` (kept in git) has every answer with PASS/FAIL per tool. For cost, reasons and full transcripts: `npx promptfoo view`.
