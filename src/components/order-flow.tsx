"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Thermal printers feed paper in small jerks, so the reveal moves in steps.
const PRINT_STEPS = 9;
const printEase = (t: number) => Math.ceil(t * PRINT_STEPS) / PRINT_STEPS;

const LINES: [string, string][] = [
  ["Item", "1 × Cole Hollander"],
  ["Ships from", "Order Desk"],
  ["Status", "Ready to ship"],
];

function Receipt() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { clipPath: "inset(100% 0 -20% 0)", y: 12 }}
      animate={{ clipPath: "inset(0% 0 -20% 0)", y: 0 }}
      transition={{ duration: 0.7, ease: printEase }}
      className="drop-shadow-[0_6px_16px_rgb(0_0_0/0.14)] dark:drop-shadow-[0_6px_16px_rgb(0_0_0/0.6)]"
    >
      <div className="bg-[#f7f6f2] px-4 pt-4 pb-6 font-mono text-[10.5px] leading-5 tracking-wide text-neutral-800 uppercase [mask:conic-gradient(from_-45deg_at_bottom,#0000,#000_1deg_89deg,#0000_90deg)_50%/10px_100%] dark:bg-neutral-800 dark:text-neutral-100">
        <div className="flex items-center justify-center gap-1.5">
          <Image
            src="/orderdesk-mark.png"
            alt=""
            width={12}
            height={12}
            className="size-3"
          />
          Order Desk
        </div>
        <p className="text-center opacity-55">Order #CH-0922</p>
        <div className="my-2 border-t border-dashed border-foreground/25" />
        <dl>
          {LINES.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="opacity-55">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="my-2 border-t border-dashed border-foreground/25" />
        <p className="text-center">Type “ship” to send it</p>
        <div
          aria-hidden
          className="mx-auto mt-3 h-6 w-4/5 bg-[repeating-linear-gradient(90deg,currentColor_0_1px,transparent_1px_3px,currentColor_3px_5px,transparent_5px_6px,currentColor_6px_7px,transparent_7px_10px)] opacity-80"
        />
      </div>
    </motion.div>
  );
}

export function OrderDeskLink({ className }: { className: string }) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <a href="https://www.orderdesk.com" className={className}>
          <Image
            src="/orderdesk-mark.png"
            alt=""
            width={14}
            height={14}
            className="mr-1 inline-block size-3.5 -translate-y-px rounded-[3px] transition-transform duration-500 ease-out group-hover/od:rotate-[360deg] motion-reduce:transition-none"
            priority
          />
          Order Desk
        </a>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        sideOffset={6}
        className="w-60 bg-transparent p-0 shadow-none ring-0"
      >
        <Receipt />
      </HoverCardContent>
    </HoverCard>
  );
}
