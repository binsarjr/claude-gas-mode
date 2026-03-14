#!/usr/bin/env node
/**
 * Gas Stop Hook — Prevents Claude Code from stopping mid-task during /gas mode.
 *
 * Works across all projects by using `cwd` from the hook input data.
 *
 * Flow:
 * 1. If stop_hook_active is set → allow stop (prevent infinite loop)
 * 2. If .claude/gas.lock doesn't exist in cwd → allow stop (not in gas mode)
 * 3. If last message contains **DONE** or **BLOCKED** → clean up lock, allow stop
 * 4. If tasks/todo.md has unchecked items → block stop with reason
 * 5. If all items checked but no DONE/BLOCKED → block stop, ask for verification
 */

import { readFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";

function readStdin() {
  try {
    return JSON.parse(readFileSync("/dev/stdin", "utf8"));
  } catch {
    return {};
  }
}

function getProjectRoot(data) {
  return data.cwd || process.cwd();
}

function getLastAssistantMessage(data) {
  if (data.last_assistant_message) {
    return data.last_assistant_message;
  }

  const messages = data.transcript_messages || [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "assistant") {
      const content = msg.content;
      if (Array.isArray(content)) {
        return content
          .filter((block) => block.type === "text")
          .map((block) => block.text || "")
          .join("\n");
      }
      return String(content || "");
    }
  }
  return "";
}

function checkTodoFile(todoPath) {
  if (!existsSync(todoPath)) {
    return { exists: false, checked: 0, uncheckedCount: 0, uncheckedItems: [] };
  }

  const content = readFileSync(todoPath, "utf8");
  const uncheckedItems = [];
  for (const m of content.matchAll(/^\s*- \[ \] (.+)$/gm)) {
    uncheckedItems.push(m[1]);
  }

  let checked = 0;
  for (const _ of content.matchAll(/^\s*- \[x\] (.+)$/gim)) {
    checked++;
  }

  return { exists: true, checked, uncheckedCount: uncheckedItems.length, uncheckedItems };
}

function block(reason) {
  console.log(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

function allowStop() {
  process.exit(0);
}

function removeLock(lockPath) {
  try {
    unlinkSync(lockPath);
  } catch {
    // ignore
  }
}

// --- Main ---

const data = readStdin();

// 1. Prevent infinite loop
if (data.stop_hook_active || process.env.CLAUDE_GAS_STOP_HOOK_ACTIVE) {
  allowStop();
}

// Resolve paths from project root
const projectRoot = getProjectRoot(data);
const lockPath = resolve(projectRoot, ".claude", "gas.lock");
const todoPath = resolve(projectRoot, "tasks", "todo.md");

// 2. Not in gas mode
if (!existsSync(lockPath)) {
  allowStop();
}

// 3. Check for DONE or BLOCKED
const lastMessage = getLastAssistantMessage(data);

if (lastMessage.includes("**DONE**")) {
  removeLock(lockPath);
  allowStop();
}

if (lastMessage.includes("**BLOCKED**")) {
  removeLock(lockPath);
  allowStop();
}

// 4. Check tasks/todo.md
const todo = checkTodoFile(todoPath);

if (!todo.exists) {
  block(
    "GAS MODE ACTIVE: You stopped but there is no tasks/todo.md. " +
      "Create your task plan in tasks/todo.md and continue working. " +
      "Do not stop until all tasks are complete and you output **DONE**."
  );
}

if (todo.uncheckedCount > 0) {
  const shown = todo.uncheckedItems.slice(0, 10);
  let itemsList = shown.map((item) => `  - ${item}`).join("\n");
  if (todo.uncheckedCount > 10) {
    itemsList += `\n  ... and ${todo.uncheckedCount - 10} more`;
  }

  block(
    `GAS MODE ACTIVE: You stopped but there are ${todo.uncheckedCount} unchecked ` +
      `task(s) remaining in tasks/todo.md:\n${itemsList}\n\n` +
      "Continue working on the next unchecked item. " +
      "Do not stop until all tasks are complete and you output **DONE** or **BLOCKED**."
  );
}

// 5. All checked but no DONE/BLOCKED
if (todo.checked > 0 && todo.uncheckedCount === 0) {
  block(
    "GAS MODE ACTIVE: All tasks in tasks/todo.md appear complete, " +
      "but you haven't output the completion marker. " +
      "Run final verification, then output exactly **DONE** if everything passes, " +
      "or **BLOCKED** if there's an issue you cannot resolve."
  );
}

// Default: allow stop
allowStop();
