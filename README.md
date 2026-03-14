# Gas Mode for Claude Code

Autonomous work mode for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Give Claude a task, and it won't stop until every item in the plan is done.

## What It Does

When you run `/gas <task>`, Claude enters autonomous mode:

1. Creates a lock file (`.claude/gas.lock`)
2. Writes a plan to `tasks/todo.md` with checkable items
3. Executes each item, marking them `- [x]` as it goes
4. **Cannot stop** until all items are checked — the stop hook blocks premature exits
5. Outputs `**DONE**` or `**BLOCKED**` when finished, cleaning up the lock

Without gas mode, Claude may stop to ask clarifying questions or pause between steps. Gas mode forces continuous execution through the entire plan.

## How It Works

Two components work together:

| Component | Purpose |
|-----------|---------|
| `skills/gas/SKILL.md` | Skill — the prompt that tells Claude how to work autonomously |
| `hook-scripts/gas-stop-hook.js` | Stop hook — blocks Claude from stopping while tasks remain unchecked |

The stop hook reads `tasks/todo.md` in the current project and checks for unchecked items (`- [ ]`). If any remain, it blocks the stop and tells Claude to keep working.

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
              └─ Not found → Read tasks/todo.md
                    ├─ Has unchecked items → Block stop, list remaining tasks
                    ├─ All checked → Block stop, ask for verification + DONE marker
                    └─ No todo.md → Block stop, ask to create plan
```

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
└── tasks/
    └── todo.md               # The plan with checkable items
```

Both files are ephemeral — `gas.lock` is auto-deleted on completion, and `todo.md` serves as a progress tracker you can review.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- Node.js 18+ (or Bun)

## License

MIT
