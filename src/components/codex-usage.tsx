"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Heatmap, type HeatDay } from "@/components/heatmap";

export const INK_SCALE: [string, string, string, string, string] = [
  "var(--heat-0)",
  "color-mix(in oklch, var(--foreground) 22%, transparent)",
  "color-mix(in oklch, var(--foreground) 45%, transparent)",
  "color-mix(in oklch, var(--foreground) 70%, transparent)",
  "var(--foreground)",
];

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function CodexUsage({
  days,
  sessions,
  tokens,
  since,
  className,
  children,
}: {
  days: HeatDay[];
  sessions: number;
  tokens: number;
  since: string;
  className: string;
  children: React.ReactNode;
}) {
  const sinceLabel = new Date(`${since}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span tabIndex={0} className={`${className} cursor-help`}>
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" sideOffset={8} className="w-72 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-medium">Codex, lately</p>
          <p className="text-xs text-muted-foreground">since {sinceLabel}</p>
        </div>
        <Heatmap
          days={days}
          weeks={12}
          colors={INK_SCALE}
          label={`Codex sessions per day since ${sinceLabel}`}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          {sessions} sessions · {compact.format(tokens)} tokens
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
