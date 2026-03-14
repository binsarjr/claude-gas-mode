#!/usr/bin/env node
/**
 * Gas Stop Hook — Prevents Claude Code from stopping mid-task during /gas mode.
 *
 * Works across all projects by using `cwd` from the hook input data.
 * Uses Claude Code's built-in task system (TaskCreate/TaskUpdate/TaskList)
 * for task management — the hook only checks the lock file and completion markers.
 *
 * Flow:
 * 1. If stop_hook_active is set → allow stop (prevent infinite loop)
 * 2. If .claude/gas.lock doesn't exist in cwd → allow stop (not in gas mode)
 * 3. If last message contains **DONE** or **BLOCKED** → clean up lock, allow stop
 * 4. Otherwise → block stop, tell Claude to continue working
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

// 4. Block — gas mode is active but no completion marker found
block(
  "GAS MODE ACTIVE: You have not completed all tasks yet. " +
    "Use TaskList to check your remaining tasks, then continue working on the next pending item. " +
    "Do not stop until all tasks are completed and you output **DONE** or **BLOCKED**."
);
