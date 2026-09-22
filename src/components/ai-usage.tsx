"use client";

import type { ReactNode } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Heatmap, type HeatDay } from "@/components/heatmap";

export type ModelRow = { model: string; tool: "codex" | "claude"; tokens: number };

const INK_SCALE: [string, string, string, string, string] = [
  "var(--heat-0)",
  "color-mix(in oklch, var(--foreground) 22%, transparent)",
  "color-mix(in oklch, var(--foreground) 45%, transparent)",
  "color-mix(in oklch, var(--foreground) 70%, transparent)",
  "var(--foreground)",
];

const TOOL = {
  codex: { name: "Codex", color: "var(--foreground)" },
  claude: { name: "Claude Code", color: "#d97757" },
} as const;

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// "claude-haiku-4-5-20251001" -> "Haiku 4.5", "gpt-5.6-sol" -> "GPT-5.6 Sol".
export function modelName(id: string) {
  const parts = id.replace(/-\d{8}$/, "").split("-");
  if (parts[0] === "claude") {
    const [family, ...version] = parts.slice(1);
    return `${family[0].toUpperCase()}${family.slice(1)} ${version.join(".")}`.trim();
  }
  if (parts[0] === "gpt") {
    const [version, ...rest] = parts.slice(1);
    const tier = rest.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    return `GPT-${version}${tier ? ` ${tier}` : ""}`;
  }
  return id.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function AiUsage({
  days,
  totals,
  models,
  since,
  className,
  children,
}: {
  days: HeatDay[];
  totals: { codex: number; claude: number };
  models: ModelRow[];
  since: string;
  className: string;
  children: ReactNode;
}) {
  const sinceLabel = new Date(`${since}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const top = models.slice(0, 5);
  const max = top[0]?.tokens ?? 1;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span tabIndex={0} className={`${className} cursor-help`}>
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" sideOffset={8} className="w-72 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-medium">Tokens, lately</p>
          <p className="text-xs text-muted-foreground">since {sinceLabel}</p>
        </div>
        <Heatmap
          days={days}
          weeks={12}
          colors={INK_SCALE}
          label={`Daily Codex and Claude Code tokens since ${sinceLabel}`}
        />
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          {(["codex", "claude"] as const).map((tool) => (
            <span key={tool} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: TOOL[tool].color }}
              />
              {TOOL[tool].name} {compact.format(totals[tool])}
            </span>
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted-foreground">Top models</p>
          <ol className="space-y-1.5">
            {top.map((row, i) => (
              <li key={`${row.tool}:${row.model}`} className="text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="w-3 text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <span className="font-medium">{modelName(row.model)}</span>
                  <span className="ml-auto text-muted-foreground tabular-nums">
                    {compact.format(row.tokens)}
                  </span>
                </div>
                <div className="mt-1 ml-5 h-1 rounded-full bg-[var(--heat-0)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, (row.tokens / max) * 100)}%`,
                      background: TOOL[row.tool].color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
