#!/usr/bin/env node
// Summarize local Codex and Claude Code usage into src/data/ai-usage.json.
// Reads only timestamps, model names and token counts from the local session
// logs; prompts, replies and file paths never leave this machine.
// Run: pnpm ai-usage
import {
  createReadStream,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const home = homedir();

function* walk(dir, match) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path, match);
    else if (match(name)) yield path;
  }
}

async function* records(path, needles) {
  for await (const line of createInterface({ input: createReadStream(path) })) {
    if (!needles.some((n) => line.includes(n))) continue;
    try {
      yield JSON.parse(line);
    } catch {}
  }
}

// Local calendar day, so late-night sessions land on the day they happened.
const localDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 10);
};

const days = new Map();
const models = new Map();

function add(tool, model, iso, tokens) {
  const date = localDay(iso);
  if (!date || !(tokens > 0)) return;
  const day = days.get(date) ?? { date, codex: 0, claude: 0 };
  day[tool] += tokens;
  days.set(date, day);
  const key = `${tool}:${model || "unknown"}`;
  const row = models.get(key) ?? { model: model || "unknown", tool, tokens: 0 };
  row.tokens += tokens;
  models.set(key, row);
}

// Codex: each token_count event carries the tokens of the turn that just ran;
// the model comes from the most recent turn_context.
const codexSeen = new Set();
for (const root of ["sessions", "archived_sessions"]) {
  const dir = join(home, ".codex", root);
  const isRollout = (n) => n.startsWith("rollout-") && n.endsWith(".jsonl");
  for (const path of walk(dir, isRollout)) {
    const name = path.split("/").pop();
    if (codexSeen.has(name)) continue;
    codexSeen.add(name);
    let model = null;
    for await (const o of records(path, ['"turn_context"', '"token_count"'])) {
      if (o.type === "turn_context") model = o.payload?.model ?? model;
      else if (o.payload?.type === "token_count") {
        const tokens = o.payload?.info?.last_token_usage?.total_tokens;
        add("codex", model, o.timestamp, tokens);
      }
    }
  }
}

// Claude Code: assistant messages carry usage; streamed replies repeat the same
// message id across lines, so count each id once.
const claudeSeen = new Set();
const projects = join(home, ".claude", "projects");
for (const path of walk(projects, (n) => n.endsWith(".jsonl"))) {
  for await (const o of records(path, ['"usage"'])) {
    const m = o.message;
    if (o.type !== "assistant" || !m?.usage || !m.id) continue;
    if (claudeSeen.has(m.id) || m.model === "<synthetic>") continue;
    claudeSeen.add(m.id);
    const u = m.usage;
    const tokens =
      (u.input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0) +
      (u.output_tokens ?? 0);
    add("claude", m.model, o.timestamp, tokens);
  }
}

const out = {
  generatedAt: localDay(new Date().toISOString()),
  days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
  models: [...models.values()].sort((a, b) => b.tokens - a.tokens),
};
const dataDir = new URL("../src/data/", import.meta.url);
mkdirSync(dataDir, { recursive: true });
writeFileSync(
  new URL("ai-usage.json", dataDir),
  JSON.stringify(out, null, 2) + "\n",
);
const sum = (k) => out.days.reduce((n, d) => n + d[k], 0);
console.log(
  `ai-usage: ${out.days.length} days · codex ${sum("codex")} · claude ${sum("claude")} tokens · ${out.models.length} models`,
);
