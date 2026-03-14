# Gas Mode for Claude Code

Autonomous work mode for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Give Claude a task, and it won't stop until every item in the plan is done.

## What It Does

When you run `/gas <task>`, Claude enters autonomous mode:

1. Creates a lock file (`.claude/gas.lock`)
2. Creates a structured task plan using Claude Code's **built-in task system** (`TaskCreate`)
3. Executes each task, updating status (`in_progress` → `completed`) as it goes
4. **Cannot stop** until all tasks are completed — the stop hook blocks premature exits
5. Outputs `**DONE**` or `**BLOCKED**` when finished, cleaning up the lock

Without gas mode, Claude may stop to ask clarifying questions or pause between steps. Gas mode forces continuous execution through the entire plan.

## How It Works

Two components work together:

| Component | Purpose |
|-----------|---------|
| `skills/gas/SKILL.md` | Skill — the prompt that tells Claude how to work autonomously |
| `hook-scripts/gas-stop-hook.js` | Stop hook — blocks Claude from stopping while tasks remain incomplete |

The skill instructs Claude to use the built-in `TaskCreate`/`TaskUpdate`/`TaskList` tools for task management. The stop hook checks for the lock file and completion markers (`**DONE**`/`**BLOCKED**`) — if gas mode is active and no completion marker is found, the hook blocks the stop and tells Claude to keep working.

## Installation

### Option A: Plugin (Recommended)

If your Claude Code supports plugins:

```bash
/plugin install gas-mode
```

Or add the marketplace manually:

```bash
/plugin marketplace add https://github.com/binsarjr/claude-gas-mode
```

### Option B: Install Script

```bash
git clone https://github.com/binsarjr/claude-gas-mode.git
cd claude-gas-mode
./install.sh
```

Then add the Stop hook to `~/.claude/settings.json`:

```jsonc
{
  // ... your existing settings ...
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
}
```

> **Tip:** Use `bun` instead of `node` for faster hook execution.

### Option C: Manual

1. Copy the skill:

```bash
mkdir -p ~/.claude/skills/gas
cp skills/gas/SKILL.md ~/.claude/skills/gas/SKILL.md
```

2. Copy the hook:

```bash
mkdir -p ~/.claude/hooks
cp hook-scripts/gas-stop-hook.js ~/.claude/hooks/gas-stop-hook.js
```

3. Register the hook in `~/.claude/settings.json` (see above).

### Verify

Open Claude Code in any project and type:

```
/gas fix the broken tests
```

Claude should immediately start working without asking questions.

## Usage

```
/gas <your task description>
```

### Examples

```
/gas add dark mode support to the settings page
/gas fix all TypeScript errors in src/
/gas refactor the auth module to use JWT tokens
/gas read the error logs and fix all issues
/gas add unit tests for the user service
```

### Stopping Gas Mode

Gas mode ends when Claude outputs **DONE** or **BLOCKED**. If you need to force-stop:

1. Press `Ctrl+C` to interrupt
2. Delete the lock file manually: `rm .claude/gas.lock`

## Customization

### Adding project-specific rules

Copy the skill to your project and extend it:

```bash
mkdir -p .claude/skills/gas
cp ~/.claude/skills/gas/SKILL.md .claude/skills/gas/SKILL.md
```

Then add rules:

```markdown
## Rules

... existing rules ...

10. Run `npm test` after modifying code.
11. Use TypeScript strict mode.
12. Follow the project's ESLint configuration.
```

## How the Stop Hook Works

```
Claude tries to stop
  ↓
Hook checks: .claude/gas.lock exists?
  ├─ No  → Allow stop (not in gas mode)
  └─ Yes → Check last message for **DONE** / **BLOCKED**
              ├─ Found → Delete lock, allow stop
              └─ Not found → Block stop, tell Claude to use TaskList and continue
```

The hook is intentionally simple — all task state lives in Claude Code's built-in task system. The hook only needs to know whether gas mode is active (lock file) and whether Claude has declared completion (markers).

## Project Structure

```
claude-gas-mode/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest for marketplace distribution
├── skills/
│   └── gas/
│       └── SKILL.md          # The /gas skill definition
├── hooks/
│   └── hooks.json            # Plugin hook registration
├── hook-scripts/
│   └── gas-stop-hook.js      # Stop hook logic
├── install.sh                # Manual installer
├── LICENSE
└── README.md
```

When gas mode is active in your project:

```
your-project/
├── .claude/
│   └── gas.lock              # Created when gas starts, deleted when done
```

The lock file is ephemeral — auto-deleted on completion. Task progress is tracked through Claude Code's built-in task system, visible in the CLI status line.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- Node.js 18+ (or Bun)

## License

MIT
