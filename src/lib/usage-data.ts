import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { ModelRow } from "@/components/ai-usage";
import type { UsageDay } from "@/lib/usage";

// Machine snapshots carry codex/claude, cursor.json carries cursor.
type Snapshot = {
  generatedAt: string;
  days: Partial<UsageDay>[];
  models: ModelRow[];
};

const DIR = join(process.cwd(), "src/data/ai-usage");

// Runs at build time. Each computer commits its own Codex and Claude Code
// snapshot, plus one account-wide Cursor file (see scripts/ai-usage.mjs);
// summing them gives the whole picture.
export function loadUsage(): { days: UsageDay[]; models: ModelRow[] } {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return { days: [], models: [] };
  }

  const days = new Map<string, UsageDay>();
  const models = new Map<string, ModelRow>();
  for (const file of files) {
    const snap: Snapshot = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    for (const d of snap.days) {
      if (!d.date) continue;
      const day = days.get(d.date) ?? { date: d.date, codex: 0, claude: 0, cursor: 0 };
      day.codex += d.codex ?? 0;
      day.claude += d.claude ?? 0;
      day.cursor += d.cursor ?? 0;
      days.set(d.date, day);
    }
    for (const m of snap.models) {
      const key = `${m.tool}:${m.model}`;
      const row = models.get(key) ?? { ...m, tokens: 0 };
      row.tokens += m.tokens;
      models.set(key, row);
    }
  }

  return {
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    models: [...models.values()].sort((a, b) => b.tokens - a.tokens),
  };
}
