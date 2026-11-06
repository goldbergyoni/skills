#!/usr/bin/env bash
# One command: ./run.sh  (extra args go to promptfoo, e.g. --filter-pattern dose)
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --silent
mkdir -p results && rm -f results/cost.log results/init.log

# Skill version: metadata.version from SKILL.md + a hash of the skill's .md files (edits often skip the bump).
ver="$(sed -n 's/^ *version: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' ../skills/spoon/SKILL.md | head -1)"
hash="$(find ../skills/spoon -name '*.md' | sort | xargs cat | shasum | cut -c1-8)"
export SPOON_VERSION="${ver:-none}+${hash}"

# Fresh workspace that sees ONLY this repo's spoon. With --setting-sources project,
# claude skips ~/.claude (user skills, plugins, hooks), so the old copies never load.
export SPOON_WS="$(mktemp -d)"
export SPOON_JUDGE_WS="$(mktemp -d)"
export SPOON_COST_LOG="$PWD/results/cost.log"
export SPOON_INIT_LOG="$PWD/results/init.log"
mkdir -p "$SPOON_WS/.claude/skills"
ln -s "$(cd ../skills/spoon && pwd)" "$SPOON_WS/.claude/skills/spoon"

{
  echo "spoon version: $SPOON_VERSION"
  npx promptfoo eval -c promptfooconfig.yaml --repeat 2 --no-cache -j 4 \
    --description "spoon $SPOON_VERSION" --tag "spoon_version=$SPOON_VERSION" \
    -o results/results.json -o results/results.html "$@" || true
  node summarize.js results
} 2>&1 | tee results/run.log
