#!/bin/bash
# Gas Mode for Claude Code — Manual Installer
# Installs the skill and hook to your user-level Claude Code config.

set -e

CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills/gas"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Gas Mode for Claude Code..."
echo ""

# Install skill
mkdir -p "$SKILLS_DIR"
cp "$SCRIPT_DIR/skills/gas/SKILL.md" "$SKILLS_DIR/SKILL.md"
echo "  Installed skill: gas -> $SKILLS_DIR/SKILL.md"

# Install hook script
mkdir -p "$HOOKS_DIR"
cp "$SCRIPT_DIR/hook-scripts/gas-stop-hook.js" "$HOOKS_DIR/gas-stop-hook.js"
echo "  Installed hook:  gas-stop-hook.js -> $HOOKS_DIR/gas-stop-hook.js"

echo ""
echo "Done! Two things remain:"
echo ""
echo "  1. Add the Stop hook to $SETTINGS_FILE:"
echo ""
echo '     {
       "hooks": {
         "Stop": [
           {
             "matcher": "",
             "hooks": [
               {
                 "type": "command",
                 "command": "node ~/.claude/hooks/gas-stop-hook.js",
                 "timeout": 10000
               }
             ]
           }
         ]
       }
     }'
echo ""
echo "     Tip: use 'bun' instead of 'node' for faster execution."
echo ""
echo "  2. Open Claude Code and type: /gas fix the broken tests"
echo ""
