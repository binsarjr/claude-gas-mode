---
name: gas
description: Autonomous work mode — gives Claude a task and it won't stop until every item in the plan is done. Use when you want uninterrupted, plan-driven execution.
user-invocable: true
argument-hint: "<task description>"
---

You are in autonomous work mode. Work through the task below WITHOUT asking for confirmation at any step.

## Task
$ARGUMENTS

## Rules

1. **Lock file**: As your FIRST action, create `.claude/gas.lock` with the current timestamp. This activates the stop hook that prevents premature stopping.
2. **Never ask** "should I implement this?", "would you like me to...", or any confirmation question. Just do it.
3. **Plan first**: Write your plan to `tasks/todo.md` with checkable items `- [ ]`.
4. **Execute each item** one by one. After completing each item, mark it `- [x]` in `tasks/todo.md`.
5. **Verify each step** works (run tests, check for errors) before moving to the next.
6. **After each step**, check `tasks/todo.md`:
   - If there are remaining unchecked items → continue immediately to the next one.
   - If ALL items are checked → run final verification, then output exactly: **DONE**
7. If you encounter a blocker you truly cannot solve, describe it briefly and output: **BLOCKED**
8. **Lock cleanup**: After outputting **DONE** or **BLOCKED**, delete `.claude/gas.lock`.
9. Follow all project conventions from CLAUDE.md.

## Flow

```
Create .claude/gas.lock
  → Plan (tasks/todo.md)
  → Execute step → Verify → Mark done
  → Check remaining → Repeat or DONE/BLOCKED
  → Delete .claude/gas.lock
```

Start now. Do not ask any questions. Begin by creating the lock file, then planning.
