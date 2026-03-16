---
name: gaspoll
description: Like /gas but with self-generating tasks — after completing the plan, it reviews its own work, discovers errors, improvements, and new opportunities, then creates follow-up tasks automatically. Keeps going until there's truly nothing left to improve.
user-invocable: true
argument-hint: "<task description>"
---

You are in autonomous work mode with **self-generating tasks**. Work through the task below WITHOUT asking for confirmation. After completing your initial plan, you will review your own work and generate follow-up tasks if needed.

## Task
$ARGUMENTS

## Rules

1. **Lock file**: As your FIRST action, create `.claude/gas.lock` with content: `gaspoll:<current timestamp>`.
2. **Never ask** "should I implement this?", "would you like me to...", or any confirmation question. Just do it.
3. **Skill discovery**: Before planning, review the available skills listed in the conversation context (system-reminder messages). If any skill would help, incorporate it into your plan and invoke it using the `Skill` tool at the appropriate step.
4. **Plan first**: Use `TaskCreate` to create your initial task plan. One task per step.
5. **Execute each item**: Mark `in_progress` with `TaskUpdate` before starting, `completed` when done.
6. **Verify each step** works (run tests, check for errors) before moving to the next.
7. **After each step**, use `TaskList` to check remaining tasks → if pending tasks remain, continue.
8. If you encounter a blocker you truly cannot solve, describe it briefly and output: **BLOCKED**
9. **Lock cleanup**: After outputting **DONE** or **BLOCKED**, delete `.claude/gas.lock`.
10. Follow all project conventions from CLAUDE.md.

## Self-Reflection Loop (what makes /gaspoll different from /gas)

When all initial tasks are `completed`, **DO NOT output DONE yet**. Instead, enter the self-reflection loop:

### Step 1 — Review
Examine everything you just did:
- Re-read changed files and look for bugs, typos, edge cases, or inconsistencies
- Run tests, linters, or type-checkers if available
- Check if the code compiles/runs correctly
- Look at the broader context — did your changes break anything else?

### Step 2 — Discover
Think creatively about what else could be done:
- **Errors found?** → Create fix tasks
- **Tests missing?** → Create test tasks
- **Code quality issues?** → Create refactoring tasks (use `/simplify` if appropriate)
- **Documentation outdated?** → Create doc update tasks
- **Related improvements spotted?** → Create enhancement tasks
- **Security concerns?** → Create security fix tasks
- **Performance issues noticed?** → Create optimization tasks
- **Edge cases not handled?** → Create robustness tasks

### Step 3 — Completion Audit (self-generating check)
Before deciding, do a structured completeness check:

1. **Re-read the original task** from `$ARGUMENTS` — compare what was asked vs what was delivered. Any gaps?
2. **Fresh eyes check** — Pretend you are seeing this codebase for the first time. If you started from scratch right now, what would you do differently? Any missed steps?
3. **User perspective** — Imagine the user tries this feature/fix right now. Walk through their experience step by step. What breaks? What's confusing? What's missing?
4. **Dependency check** — Did your changes require updates elsewhere? Config files, imports, exports, env vars, migrations, related modules?
5. **Generate new todo** — If ANY of the above reveals gaps, create new tasks with `TaskCreate` immediately. Be specific about what needs to be done and why.

### Step 4 — Decide
- If you generated new tasks in Step 2 or Step 3 → go back to executing them (rule 5-7)
- If after honest review there is genuinely nothing more to do → output exactly: **DONE**

### Loop limit
- You may run the self-reflection loop up to **5 times** to allow thorough self-correction
- Each loop should discover fewer issues than the previous one
- On the 5th loop, if you still find issues, fix only critical ones then output **DONE**

## Flow

```
Create .claude/gas.lock
  → Scan available skills → Plan (TaskCreate)
  → Execute → Verify → TaskUpdate completed
  → All tasks done?
      ├─ No → Continue to next task
      └─ Yes → SELF-REFLECTION LOOP
                  → Review work
                  → Discover opportunities
                  → Completion Audit (re-read task, fresh eyes, user perspective, deps)
                  → New tasks?
                      ├─ Yes → TaskCreate new tasks → Execute loop again
                      └─ No  → **DONE**
  → Delete .claude/gas.lock
```

Start now. Do not ask any questions. Begin by creating the lock file, then planning.
