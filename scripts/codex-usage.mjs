#!/usr/bin/env node
// Summarize local Codex CLI usage into src/data/codex-usage.json.
// Reads only token totals from ~/.codex session logs; prompts, replies and
// file paths never leave this machine. Run: pnpm codex-usage
import { createReadStream, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const roots = ["sessions", "archived_sessions"].map((d) =>
  join(homedir(), ".codex", d),
);

function* walk(dir) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (name.startsWith("rollout-") && name.endsWith(".jsonl")) yield path;
  }
}

async function sessionTokens(path) {
  let max = 0;
  const lines = createInterface({ input: createReadStream(path) });
  for await (const line of lines) {
    if (!line.includes('"token_count"')) continue;
    try {
      const total = JSON.parse(line).payload?.info?.total_token_usage?.total_tokens;
      if (typeof total === "number" && total > max) max = total;
    } catch {}
  }
  return max;
}

const days = new Map();
const seen = new Set();
for (const root of roots) {
  for (const path of walk(root)) {
    const name = path.split("/").pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const date = name.match(/rollout-(\d{4}-\d{2}-\d{2})/)?.[1];
    if (!date) continue;
    const tokens = await sessionTokens(path);
    const day = days.get(date) ?? { date, sessions: 0, tokens: 0 };
    day.sessions += 1;
    day.tokens += tokens;
    days.set(date, day);
  }
}

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
};
writeFileSync(
  new URL("../src/data/codex-usage.json", import.meta.url),
  JSON.stringify(out, null, 2) + "\n",
);
const sessions = out.days.reduce((n, d) => n + d.sessions, 0);
console.log(`codex-usage: ${out.days.length} days, ${sessions} sessions`);
