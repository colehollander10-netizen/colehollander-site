import type { CSSProperties } from "react";

export type HeatDay = { date: string; level: number };

const DAY = 86_400_000;
const toKey = (d: Date) => d.toISOString().slice(0, 10);

// Columns are weeks (Sunday first), rows are weekdays, like GitHub's graph.
export function Heatmap({
  days,
  weeks,
  colors,
  label,
}: {
  days: HeatDay[];
  weeks: number;
  colors: [string, string, string, string, string];
  label: string;
}) {
  const levels = new Map(days.map((d) => [d.date, d.level]));
  const last = days.length
    ? new Date(`${days[days.length - 1].date}T00:00:00Z`)
    : new Date(`${toKey(new Date())}T00:00:00Z`);
  const end = last.getTime() + (6 - last.getUTCDay()) * DAY;
  const start = end - (weeks * 7 - 1) * DAY;

  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const date = toKey(new Date(start + i * DAY));
    return { date, level: date > toKey(last) ? -1 : (levels.get(date) ?? 0) };
  });

  return (
    <div
      role="img"
      aria-label={label}
      className="grid w-fit grid-flow-col grid-rows-[repeat(7,10px)] gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${weeks}, 10px)` } as CSSProperties}
    >
      {cells.map((cell) => (
        <span
          key={cell.date}
          className="size-2.5 rounded-[2px]"
          style={{ background: cell.level < 0 ? "transparent" : colors[cell.level] }}
        />
      ))}
    </div>
  );
}

// Buckets raw daily counts into five levels using quartiles of active days.
export function toLevels(days: { date: string; value: number }[]): HeatDay[] {
  const active = days.map((d) => d.value).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p: number) => active[Math.floor((active.length - 1) * p)] ?? 0;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  return days.map(({ date, value }) => ({
    date,
    level: value <= 0 ? 0 : 1 + cuts.filter((c) => value > c).length,
  }));
}
