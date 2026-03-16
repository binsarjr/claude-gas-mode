#!/bin/bash
# Gas Mode for Claude Code — Installer
# Installs skills and hook, then auto-registers the hook in settings.json.
#
# Usage:
#   ./install.sh          # Install globally to ~/.claude/
#   ./install.sh --local  # Install to current project's .claude/

set -e

# --- Parse args ---
INSTALL_MODE="global"
if [[ "$1" == "--local" || "$1" == "-l" ]]; then
  INSTALL_MODE="local"
fi

if [[ "$INSTALL_MODE" == "local" ]]; then
  CLAUDE_DIR=".claude"
  SETTINGS_FILE="$CLAUDE_DIR/settings.json"
  echo "Installing Gas Mode (project-local)..."
else
  CLAUDE_DIR="$HOME/.claude"
  SETTINGS_FILE="$CLAUDE_DIR/settings.json"
  echo "Installing Gas Mode (global)..."
fi

GAS_SKILLS_DIR="$CLAUDE_DIR/skills/gas"
GASPOLL_SKILLS_DIR="$CLAUDE_DIR/skills/gaspoll"
HOOKS_DIR="$CLAUDE_DIR/hooks"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""

# --- Install skills ---
mkdir -p "$GAS_SKILLS_DIR" "$GASPOLL_SKILLS_DIR"
cp "$SCRIPT_DIR/skills/gas/SKILL.md" "$GAS_SKILLS_DIR/SKILL.md"
echo "  Installed skill: /gas     -> $GAS_SKILLS_DIR/SKILL.md"
cp "$SCRIPT_DIR/skills/gaspoll/SKILL.md" "$GASPOLL_SKILLS_DIR/SKILL.md"
echo "  Installed skill: /gaspoll -> $GASPOLL_SKILLS_DIR/SKILL.md"

# --- Install hook script ---
mkdir -p "$HOOKS_DIR"
cp "$SCRIPT_DIR/hook-scripts/gas-stop-hook.js" "$HOOKS_DIR/gas-stop-hook.js"
echo "  Installed hook:  gas-stop-hook.js -> $HOOKS_DIR/gas-stop-hook.js"

# --- Auto-register hook in settings.json ---
echo ""

# Determine the hook command path
if [[ "$INSTALL_MODE" == "local" ]]; then
  HOOK_CMD="node .claude/hooks/gas-stop-hook.js"
else
  HOOK_CMD="node ~/.claude/hooks/gas-stop-hook.js"
fi

# Check if node or bun is available, prefer bun for speed
if command -v bun &>/dev/null; then
  HOOK_CMD="${HOOK_CMD/node/bun}"
  echo "  Detected bun — using bun for faster hook execution."
fi

register_hook() {
  local settings_file="$1"
  local hook_cmd="$2"

  # Create settings file if it doesn't exist
  if [[ ! -f "$settings_file" ]]; then
    cat >"$settings_file" <<EOJSON
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$hook_cmd",
            "timeout": 10000
          }
        ]
      }
    ]
  }
}
EOJSON
    echo "  Created $settings_file with hook config."
    return
  fi

  # Check if hook is already registered
  if grep -q "gas-stop-hook" "$settings_file" 2>/dev/null; then
    echo "  Hook already registered in $settings_file — skipping."
    return
  fi

  # Try to merge with existing settings using node/bun
  local runtime="node"
  command -v bun &>/dev/null && runtime="bun"

  $runtime -e "
    const fs = require('fs');
    const path = '$settings_file';
    let settings = {};
    try {
      // Strip comments (// and /* */) for JSONC support
      let raw = fs.readFileSync(path, 'utf8');
      raw = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove trailing commas before } or ]
      raw = raw.replace(/,\s*([\]}])/g, '\$1');
      settings = JSON.parse(raw);
    } catch(e) {
      console.error('  Warning: could not parse existing settings, creating backup...');
      fs.copyFileSync(path, path + '.bak');
      settings = {};
    }

    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.Stop) settings.hooks.Stop = [];

    // Check if already registered
    const already = settings.hooks.Stop.some(entry =>
      entry.hooks && entry.hooks.some(h => h.command && h.command.includes('gas-stop-hook'))
    );

    if (!already) {
      settings.hooks.Stop.push({
        matcher: '',
        hooks: [{
          type: 'command',
          command: '$hook_cmd',
          timeout: 10000
        }]
      });
      fs.writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
      console.log('  Registered hook in $settings_file');
    } else {
      console.log('  Hook already registered in $settings_file — skipping.');
    }
  " 2>&1
}

register_hook "$SETTINGS_FILE" "$HOOK_CMD"

# --- Done ---
echo ""
echo "Done! Gas Mode is ready."
echo ""
echo "  Open Claude Code and try:"
echo "    /gas fix the broken tests"
echo "    /gaspoll refactor the auth module"
echo ""
