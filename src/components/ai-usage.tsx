"use client";

import { useRef, useState, type ReactNode } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { SERIES, UsageChart, compact } from "@/components/usage-chart";
import type { UsageDay } from "@/lib/usage";

export type ModelRow = {
  model: string;
  tool: "codex" | "claude" | "cursor";
  tokens: number;
};

const COLOR = Object.fromEntries(SERIES.map((s) => [s.key, s.color]));

// "claude-haiku-4-5-20251001" -> "Haiku 4.5", "gpt-5.6-sol" -> "GPT-5.6 Sol",
// "cursor-grok-4.6-high-fast" -> "Grok 4.6 High Fast".
export function modelName(id: string) {
  const words = id
    .replace(/-\d{8}$/, "")
    .replace(/^(claude|cursor)-/, "")
    .split("-")
    .filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const prev = out[out.length - 1];
    // Version numbers split on dashes ("opus-5-5") join back with a dot.
    if (/^\d+$/.test(w) && prev && /^\d+(\.\d+)*$/.test(prev)) {
      out[out.length - 1] = `${prev}.${w}`;
    } else {
      out.push(/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1));
    }
  }
  return out[0] === "Gpt" ? `GPT-${out.slice(1).join(" ")}` : out.join(" ");
}

export function AiUsage({
  days,
  models,
  className,
  children,
}: {
  days: UsageDay[];
  models: ModelRow[];
  className: string;
  children: ReactNode;
}) {
  const top = models.slice(0, 5);
  const max = top[0]?.tokens ?? 1;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pointer = useRef("");

  // Hover cards ignore touch, and this trigger has no link to fall back on,
  // so a tap toggles the card. Mouse and keyboard keep the hover behavior.
  const tap = () => {
    if (pointer.current === "touch") setOpen((o) => !o);
    pointer.current = "";
  };

  return (
    <HoverCard
      open={open}
      onOpenChange={setOpen}
      openDelay={150}
      closeDelay={100}
    >
      <HoverCardTrigger asChild>
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          onPointerDown={(e) => (pointer.current = e.pointerType)}
          onClick={tap}
          className={`${className} cursor-help`}
        >
          {children}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        sideOffset={8}
        className="w-72 p-4"
        // A tap on the trigger toggles; don't also count it as a tap outside.
        onPointerDownOutside={(e) => {
          if (trigger.current?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        <UsageChart days={days} />

        {top.length > 0 && (
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
                        background: COLOR[row.tool],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
