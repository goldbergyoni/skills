# Spoon evals

Run: `./run.sh` (needs `claude` logged in; 1–2 minutes and about $1.45). Filter with `./run.sh --filter-pattern dose`.

Each case runs twice through the real `claude -p` (Sonnet 5.5, medium effort). A temp workspace links this repo as its only `spoon`, and `--setting-sources project` keeps `~/.claude` skills and plugins out.

Cases: triggering, dose length (`1s`, `1p`, `1m`), formats (`bul`, `html`, footer), `ver3` (two subagents), `ver1` (LLM judge). `results/summary.txt` (kept in git) has the skill version (`metadata.version` + a hash of the skill files), per-case pass/fail, real output and total cost. Full results stay local; open them with `npx promptfoo view`.
