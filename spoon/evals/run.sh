#!/usr/bin/env bash
# One command: ./run.sh  (extra args go to promptfoo, e.g. --filter-pattern dose --filter-providers codex)
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --silent

# Skill version: metadata.version from SKILL.md + a hash of the skill's .md files (edits often skip the bump).
skill="$(cd ../skills/spoon && pwd)"
ver="$(sed -n 's/^ *version: *"\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$skill/SKILL.md" | head -1)"
hash="$(find "$skill" -name '*.md' | sort | xargs cat | shasum | cut -c1-8)"
export SPOON_VERSION="${ver:-none}+${hash}"

# Fresh workspace outside any git repo, so no tool walks up into other skills.
# It holds only this repo's spoon, where each harness looks for project skills.
export SPOON_WS="$(cd "$(mktemp -d)" && pwd -P)"   # real path: on macOS /var links to /private/var
mkdir -p "$SPOON_WS/.claude/skills" "$SPOON_WS/.agents/skills"
ln -s "$skill" "$SPOON_WS/.claude/skills/spoon"   # Claude Code (cli + sdk)
ln -s "$skill" "$SPOON_WS/.agents/skills/spoon"   # Codex, OpenCode

# Keep user-level copies out. Claude: setting_sources [project] in the config.
# OpenCode also reads ~/.claude/skills (an old spoon lives there), so turn that off.
export OPENCODE_DISABLE_CLAUDE_CODE=1 OPENCODE_DISABLE_AUTOUPDATE=1

echo "spoon $SPOON_VERSION | workspace: $SPOON_WS"
npx promptfoo eval --description "spoon $SPOON_VERSION" --tag "spoon_version=$SPOON_VERSION" "$@"
