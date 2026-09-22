#!/usr/bin/env node
// Summarize AI usage into src/data/ai-usage/, which the site sums at build.
//
// - Codex and Claude Code: this machine's session logs -> <machine>.json.
//   Each computer writes its own file, so two machines never overwrite
//   each other's numbers.
// - Cursor: usage lives on Cursor's servers, so it comes from the dashboard's
//   CSV export (Usage -> Export) in ~/Downloads -> cursor.json. It is
//   account-wide, so there is one file no matter which computer imports it.
//
// Reads only dates, model names and token counts; prompts, replies, file
// paths and the raw CSV never leave this machine.
// Refreshes once a month on its own: .githooks/pre-commit runs it with
// --if-stale, which skips machines already refreshed this month. A newer
// Cursor export is imported either way. Force a refresh: pnpm ai-usage
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const home = homedir();

// A short hash names the file, so the public repo never shows the hostname.
const machine =
  process.env.AI_USAGE_MACHINE ||
  createHash("sha256").update(hostname()).digest("hex").slice(0, 8);
const dataDir = new URL("../src/data/ai-usage/", import.meta.url);
const snapshot = new URL(`${machine}.json`, dataDir);

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

// Cursor: fold the newest dashboard export into cursor.json. An export only
// covers the range picked on the dashboard, so days outside it are kept.
function csvRow(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted && c === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += c;
    }
  }
  return [...cells, cell];
}

function newestCursorExport() {
  if (process.env.CURSOR_USAGE_CSV) return process.env.CURSOR_USAGE_CSV;
  const downloads = join(home, "Downloads");
  let names = [];
  try {
    names = readdirSync(downloads);
  } catch {
    return null;
  }
  const exports = names
    .filter((n) => /^usage-events-.*\.csv$/.test(n))
    .map((n) => join(downloads, n))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return exports[0] ?? null;
}

function importCursor() {
  const csv = newestCursorExport();
  if (!csv || !existsSync(csv)) return;
  const target = new URL("cursor.json", dataDir);
  const previous = existsSync(target)
    ? JSON.parse(readFileSync(target, "utf8"))
    : { rows: [] };
  const mtime = statSync(csv).mtimeMs;
  if (previous.exportMtime >= mtime) return;

  const [header, ...lines] = readFileSync(csv, "utf8").trim().split(/\r?\n/);
  const col = Object.fromEntries(csvRow(header).map((name, i) => [name, i]));
  if (col.Date === undefined || col.Model === undefined || col["Total Tokens"] === undefined) {
    console.log(`ai-usage: ${csv} is not a Cursor usage export; skipped`);
    return;
  }

  const fresh = new Map();
  for (const line of lines) {
    const cells = csvRow(line);
    const date = localDay(cells[col.Date]);
    const tokens = Number(cells[col["Total Tokens"]]);
    if (!date || !(tokens > 0)) continue;
    const model = cells[col.Model] || "unknown";
    const key = `${date}|${model}`;
    fresh.set(key, (fresh.get(key) ?? 0) + tokens);
  }
  if (fresh.size === 0) return;

  const dates = [...fresh.keys()].map((k) => k.split("|")[0]).sort();
  const [from, to] = [dates[0], dates[dates.length - 1]];
  const rows = [
    ...previous.rows.filter((r) => r.date < from || r.date > to),
    ...[...fresh].map(([key, tokens]) => {
      const [date, model] = key.split("|");
      return { date, model, tokens };
    }),
  ].sort((a, b) => a.date.localeCompare(b.date) || b.tokens - a.tokens);

  const byDay = new Map();
  const byModel = new Map();
  for (const r of rows) {
    byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.tokens);
    byModel.set(r.model, (byModel.get(r.model) ?? 0) + r.tokens);
  }
  const out = {
    generatedAt: localDay(new Date().toISOString()),
    exportMtime: mtime,
    days: [...byDay].map(([date, cursor]) => ({ date, codex: 0, claude: 0, cursor })),
    models: [...byModel]
      .map(([model, tokens]) => ({ model, tool: "cursor", tokens }))
      .sort((a, b) => b.tokens - a.tokens),
    rows,
  };
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
  const total = rows.reduce((n, r) => n + r.tokens, 0);
  console.log(`ai-usage: cursor · ${from} to ${to} imported · ${total} tokens in total`);
}

importCursor();

if (process.argv.includes("--if-stale") && existsSync(snapshot)) {
  const { generatedAt } = JSON.parse(readFileSync(snapshot, "utf8"));
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (generatedAt?.slice(0, 7) === thisMonth) {
    console.log(`ai-usage: ${machine} already refreshed this month`);
    process.exit(0);
  }
}

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
if (out.days.length === 0) {
  console.log("ai-usage: no Codex or Claude Code logs on this machine; nothing written");
  process.exit(0);
}

mkdirSync(dataDir, { recursive: true });
writeFileSync(
  snapshot,
  JSON.stringify(out, null, 2) + "\n",
);
const sum = (k) => out.days.reduce((n, d) => n + d[k], 0);
console.log(
  `ai-usage: ${machine} · ${out.days.length} days · codex ${sum("codex")} · claude ${sum("claude")} tokens · ${out.models.length} models`,
);
