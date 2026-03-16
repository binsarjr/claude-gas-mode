#!/usr/bin/env node
/**
 * Gas Stop Hook — Prevents Claude Code from stopping mid-task during /gas or /gaspoll mode.
 *
 * Works across all projects by using `cwd` from the hook input data.
 * Uses Claude Code's built-in task system (TaskCreate/TaskUpdate/TaskList)
 * for task management — the hook only checks the lock file and completion markers.
 *
 * Flow:
 * 1. If stop_hook_active is set → allow stop (prevent infinite loop)
 * 2. If .claude/gas.lock doesn't exist in cwd → allow stop (not in gas mode)
 * 3. If last message contains **DONE** or **BLOCKED** → clean up lock, allow stop
 * 4. Otherwise → block stop with context-aware message:
 *    - If gaspoll mode: remind about self-reflection loop & completion audit
 *    - If gas mode: remind to check TaskList and continue
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

function readLockFile(lockPath) {
  try {
    return readFileSync(lockPath, "utf8");
  } catch {
    return "";
  }
}

function isGaspollMode(lockContent, transcript) {
  // Check lock file content for gaspoll marker
  if (lockContent.includes("gaspoll")) return true;

  // Check transcript for /gaspoll invocation
  const messages = transcript || [];
  for (const msg of messages) {
    if (msg.role === "user") {
      const content = Array.isArray(msg.content)
        ? msg.content.map((b) => b.text || "").join("\n")
        : String(msg.content || "");
      if (content.includes("/gaspoll")) return true;
    }
  }
  return false;
}

function hasCompletedTasksButNoReflection(lastMessage) {
  // Heuristic: Claude mentions tasks are done / completed but hasn't done reflection
  const completionSignals = [
    "all tasks",
    "tasks are completed",
    "tasks completed",
    "everything is done",
    "all done",
    "finished all",
    "completed all",
  ];
  const reflectionSignals = [
    "completion audit",
    "self-reflection",
    "fresh eyes",
    "user perspective",
    "dependency check",
    "re-read the original task",
    "reflection loop",
  ];

  const lowerMsg = lastMessage.toLowerCase();
  const hasCompletion = completionSignals.some((s) => lowerMsg.includes(s));
  const hasReflection = reflectionSignals.some((s) => lowerMsg.includes(s));

  return hasCompletion && !hasReflection;
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
const lockContent = readLockFile(lockPath);
const gaspollMode = isGaspollMode(
  lockContent,
  data.transcript_messages || []
);

if (gaspollMode) {
  // Gaspoll-specific: enforce self-reflection loop and completion audit
  const skippedReflection = hasCompletedTasksButNoReflection(lastMessage);

  if (skippedReflection) {
    block(
      "GASPOLL MODE ACTIVE: You completed tasks but SKIPPED the self-reflection loop. " +
        "DO NOT STOP. You MUST run the Completion Audit now:\n" +
        "1. Re-read the original task — compare what was asked vs what was delivered. Any gaps?\n" +
        "2. Fresh eyes check — if you started from scratch, what would you do differently?\n" +
        "3. User perspective — walk through the user's experience step by step. What breaks? What's missing?\n" +
        "4. Dependency check — did your changes require updates elsewhere? Config, imports, env vars?\n" +
        "5. Generate new tasks with TaskCreate if ANY gaps are found.\n" +
        "Only output **DONE** when there is genuinely nothing left to improve."
    );
  } else {
    block(
      "GASPOLL MODE ACTIVE: You have not completed all tasks yet. " +
        "Use TaskList to check remaining tasks and continue working. " +
        "Remember: after ALL tasks are done, you MUST run the self-reflection loop " +
        "(Review → Discover → Completion Audit → Decide). " +
        "Check if work is truly complete from the user's perspective. " +
        "Generate new tasks if anything is missing. " +
        "Do not output **DONE** until you have honestly verified everything is complete."
    );
  }
} else {
  // Regular gas mode
  block(
    "GAS MODE ACTIVE: You have not completed all tasks yet. " +
      "Use TaskList to check your remaining tasks, then continue working on the next pending item. " +
      "Do not stop until all tasks are completed and you output **DONE** or **BLOCKED**."
  );
}
