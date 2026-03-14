# Gas Mode for Claude Code

Autonomous work mode for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Give Claude a task, and it won't stop until every item in the plan is done.

## What It Does

This plugin provides two skills:

### `/gas` — Autonomous execution
When you run `/gas <task>`, Claude enters autonomous mode:
1. Creates a lock file (`.claude/gas.lock`)
2. Creates a structured task plan using Claude Code's **built-in task system** (`TaskCreate`)
3. Executes each task, updating status (`in_progress` → `completed`) as it goes
4. **Cannot stop** until all tasks are completed — the stop hook blocks premature exits
5. Outputs `**DONE**` or `**BLOCKED**` when finished, cleaning up the lock

### `/gaspoll` — Autonomous execution with self-generating tasks
Like `/gas`, but with a **self-reflection loop**. After completing all initial tasks, Claude:
1. Reviews its own work — re-reads changed files, runs tests, checks for bugs
2. Discovers improvements — missing tests, code quality issues, edge cases, security concerns
3. Self-generates new tasks if it finds anything worth fixing
4. Keeps going until there's genuinely nothing left to improve (up to 3 reflection rounds)

Use `/gas` when you know exactly what you want done. Use `/gaspoll` when you want Claude to be thorough and find things you might have missed.

## How It Works

Three components work together:

| Component | Purpose |
|-----------|---------|
| `skills/gas/SKILL.md` | `/gas` skill — autonomous execution |
| `skills/gaspoll/SKILL.md` | `/gaspoll` skill — autonomous execution with self-reflection |
| `hook-scripts/gas-stop-hook.js` | Stop hook — blocks Claude from stopping while tasks remain incomplete |

Both skills use Claude Code's built-in `TaskCreate`/`TaskUpdate`/`TaskList` tools for task management. The stop hook checks for the lock file and completion markers (`**DONE**`/`**BLOCKED**`) — if gas mode is active and no completion marker is found, the hook blocks the stop.

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

1. Copy the skills:

```bash
mkdir -p ~/.claude/skills/gas ~/.claude/skills/gaspoll
cp skills/gas/SKILL.md ~/.claude/skills/gas/SKILL.md
cp skills/gaspoll/SKILL.md ~/.claude/skills/gaspoll/SKILL.md
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
/gaspoll <your task description>
```

### Examples

```bash
# Autonomous execution — stops when plan is done
/gas add dark mode support to the settings page
/gas fix all TypeScript errors in src/

# Self-generating tasks — reviews and improves its own work
/gaspoll refactor the auth module to use JWT tokens
/gaspoll add unit tests for the user service
/gaspoll build a REST API for the billing module
```

### When to use `/gaspoll` over `/gas`

| Scenario | Use |
|----------|-----|
| Clear, well-defined task | `/gas` |
| Exploratory or complex task | `/gaspoll` |
| You want exactly what you asked, nothing more | `/gas` |
| You want Claude to find and fix things you missed | `/gaspoll` |
| Quick fix or small change | `/gas` |
| Building a new feature end-to-end | `/gaspoll` |

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
│   ├── gas/
│   │   └── SKILL.md          # The /gas skill definition
│   └── gaspoll/
│       └── SKILL.md          # The /gaspoll skill definition
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
