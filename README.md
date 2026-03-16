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
Like `/gas`, but with a **self-reflection loop + completion audit**. After completing all initial tasks, Claude:
1. Reviews its own work — re-reads changed files, runs tests, checks for bugs
2. Discovers improvements — missing tests, code quality issues, edge cases, security concerns
3. Runs a **Completion Audit** — re-reads the original task, does a fresh-eyes check, walks through the user's perspective, checks dependencies
4. Self-generates new tasks if it finds anything worth fixing
5. Keeps going until there's genuinely nothing left to improve (up to 5 reflection rounds)

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

### Option A: Install Script (Recommended)

One command — copies skills, hook, and auto-registers in `settings.json`:

```bash
git clone https://github.com/binsarjr/claude-gas-mode.git
cd claude-gas-mode
./install.sh
```

This will:
- Install `/gas` and `/gaspoll` skills to `~/.claude/skills/`
- Install the stop hook to `~/.claude/hooks/`
- Auto-register the hook in `~/.claude/settings.json` (merges with existing settings)
- Auto-detect `bun` for faster hook execution

#### Project-local install

To install into the current project instead of globally:

```bash
./install.sh --local
```

This installs everything to `.claude/` in the current directory.

### Option B: Manual

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

3. Register the hook in `~/.claude/settings.json`:

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
              └─ Not found → Is this gaspoll mode?
                                ├─ Yes → Did Claude skip the reflection loop?
                                │         ├─ Yes → Block with Completion Audit checklist
                                │         └─ No  → Block with reflection loop reminder
                                └─ No  → Block, tell Claude to use TaskList and continue
```

The hook detects gaspoll mode via the lock file content (`gaspoll:<timestamp>`) and enforces the self-reflection loop. For `/gas`, it uses the simpler "check TaskList and continue" message.

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
