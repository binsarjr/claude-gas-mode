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
3. **Skill discovery**: Before planning, review the available skills listed in the conversation context (look for skill names and descriptions in system-reminder messages). If any skill would help accomplish parts of the task, incorporate it into your plan and invoke it using the `Skill` tool at the appropriate step. Briefly note which skills you identified as relevant and why.
4. **Plan first**: Use the built-in `TaskCreate` tool to create your task plan. Create one task per step with a clear subject and description. If a step should use a specific skill, mention it in the task description.
5. **Execute each item** one by one. Before starting a task, mark it `in_progress` with `TaskUpdate`. After completing it, mark it `completed`.
6. **Verify each step** works (run tests, check for errors) before moving to the next.
7. **After each step**, use `TaskList` to check remaining tasks:
   - If there are remaining `pending` tasks → continue immediately to the next one.
   - If ALL tasks are `completed` → run final verification, then output exactly: **DONE**
8. If you encounter a blocker you truly cannot solve, describe it briefly and output: **BLOCKED**
9. **Lock cleanup**: After outputting **DONE** or **BLOCKED**, delete `.claude/gas.lock`.
10. Follow all project conventions from CLAUDE.md.

## Flow

```
Create .claude/gas.lock
  → Scan available skills → Plan (TaskCreate for each step)
  → TaskUpdate in_progress → Execute (use Skill tool when relevant) → Verify → TaskUpdate completed
  → TaskList to check remaining → Repeat or DONE/BLOCKED
  → Delete .claude/gas.lock
```

Start now. Do not ask any questions. Begin by creating the lock file, then planning.
