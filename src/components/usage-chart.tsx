"use client";

import { useState, type PointerEvent } from "react";

import type { UsageDay } from "@/lib/usage";

const HEIGHT = 64;
const GAP = 2;

// Bottom to top in each column; also the legend order.
export const SERIES = [
  { key: "codex", name: "Codex", color: "var(--foreground)" },
  { key: "cursor", name: "Cursor", color: "var(--cursor)" },
  { key: "claude", name: "Claude Code", color: "var(--claude)" },
] as const;

export const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dayLabel = (date: string, weekday = false) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en", {
    weekday: weekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// Daily tokens as stacked columns, one segment per tool. Hovering or
// scrubbing a day swaps the headline and legend to that day's numbers.
export function UsageChart({ days }: { days: UsageDay[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (days.length === 0) {
    return <p className="text-xs text-muted-foreground">No usage logged yet.</p>;
  }

  const first = dayLabel(days[0].date);
  const last = dayLabel(days[days.length - 1].date);
  const dayTotal = (d: UsageDay) => d.codex + d.cursor + d.claude;
  const max = Math.max(...days.map(dayTotal));
  const day = active === null ? null : days[active];
  const shown = day ?? {
    codex: days.reduce((n, d) => n + d.codex, 0),
    cursor: days.reduce((n, d) => n + d.cursor, 0),
    claude: days.reduce((n, d) => n + d.claude, 0),
  };

  // The whole column is the hit target, not just the painted bar.
  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - rect.left) / rect.width) * days.length);
    setActive(Math.min(days.length - 1, Math.max(0, i)));
  };

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p>
          <span className="font-medium">
            {compact.format(shown.codex + shown.cursor + shown.claude)}
          </span>{" "}
          <span className="text-muted-foreground">tokens</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {day ? dayLabel(day.date, true) : `${first} – ${last}`}
        </p>
      </div>

      <div
        role="img"
        aria-label={`Daily Codex, Cursor and Claude Code tokens, ${first} to ${last}`}
        className="flex items-end border-b border-border [touch-action:pan-y]"
        style={{ height: HEIGHT, gap: GAP }}
        onPointerDown={pick}
        onPointerMove={pick}
        onPointerLeave={() => setActive(null)}
      >
        {days.map((d, i) => {
          const segments = SERIES.map((s) => ({
            ...s,
            height: d[s.key] > 0 ? Math.max(1, (d[s.key] / max) * (HEIGHT - GAP)) : 0,
          }))
            .filter((s) => s.height > 0)
            .reverse();
          return (
            <div
              key={d.date}
              className="flex h-full min-w-0 flex-1 flex-col justify-end"
              style={{
                gap: GAP,
                opacity: active === null || active === i ? 1 : 0.35,
              }}
            >
              {segments.map((s, j) => (
                <span
                  key={s.key}
                  className={j === 0 ? "rounded-t-[2px]" : undefined}
                  style={{ height: s.height, background: s.color }}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>{first}</span>
        <span>{last}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-[2px]"
              style={{ background: s.color }}
            />
            {s.name}
            <span className="text-foreground tabular-nums">
              {compact.format(shown[s.key])}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
