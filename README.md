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

| File | Purpose |
|------|---------|
| `gas.md` | Slash command — the prompt that tells Claude how to work autonomously |
| `gas-stop-hook.js` | Stop hook — blocks Claude from stopping while tasks remain unchecked |

The stop hook reads `tasks/todo.md` in the current project and checks for unchecked items (`- [ ]`). If any remain, it blocks the stop and tells Claude to keep working.

## Installation

### 1. Copy the stop hook

```bash
# Create hooks directory
mkdir -p ~/.claude/hooks

# Copy the hook
cp gas-stop-hook.js ~/.claude/hooks/gas-stop-hook.js
```

### 2. Register the hook in your settings

Add the Stop hook to `~/.claude/settings.json`:

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

> **Note:** You can use `bun` instead of `node` if you have it installed — it's faster.

### 3. Copy the slash command

**User-level** (works in all projects):

```bash
mkdir -p ~/.claude/commands
cp gas.md ~/.claude/commands/gas.md
```

**Project-level** (single project only):

```bash
mkdir -p .claude/commands
cp gas.md .claude/commands/gas.md
```

### 4. Verify

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

You can extend the command for your project. Copy `gas.md` to `.claude/commands/gas.md` in your project and add rules:

```markdown
## Rules

... existing rules ...

10. Run `npm test` after modifying code.
11. Use TypeScript strict mode.
12. Follow the project's ESLint configuration.
```

### Adding skill integration

If you use the [superpowers](https://github.com/claude-plugins-official/superpowers) plugin, you can add skill scanning to your `gas.md`:

```markdown
## Rules

... existing rules ...

3. **Skill check**: Before planning, scan available skills and invoke every relevant one.
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

## File Structure

When gas mode is active, your project will have:

```
your-project/
├── .claude/
│   └── gas.lock          # Created when gas starts, deleted when done
└── tasks/
    └── todo.md           # The plan with checkable items
```

Both files are ephemeral — `gas.lock` is auto-deleted on completion, and `todo.md` serves as a progress tracker you can review.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- Node.js 18+ (or Bun)

## License

MIT
