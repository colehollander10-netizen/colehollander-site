"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const STEPS = ["Your store", "Order Desk", "Shipped"];

function Flow() {
  const reduce = useReducedMotion();

  return (
    <div className="space-y-3">
      <div className="relative flex items-center justify-between px-1 py-2">
        <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-border" />
        {!reduce && (
          <motion.span
            className="absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rounded-full bg-[#3aa8dc]"
            animate={{ left: ["0.75rem", "50%", "50%", "calc(100% - 0.75rem)"] }}
            transition={{
              duration: 2.4,
              times: [0, 0.4, 0.55, 1],
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 0.4,
            }}
          />
        )}
        <span className="relative size-2 rounded-full border border-foreground/30 bg-popover" />
        <span className="relative rounded-md bg-popover p-1 ring-1 ring-foreground/10">
          <Image
            src="/orderdesk-mark.png"
            alt=""
            width={16}
            height={16}
            className="size-4"
          />
        </span>
        <span className="relative size-2 rounded-full border border-foreground/30 bg-popover" />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        {STEPS.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Every order routed, edited, and sent on to fulfillment without anyone
        copying it by hand.
      </p>
    </div>
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
      <HoverCardContent side="top" className="w-72 p-4">
        <Flow />
      </HoverCardContent>
    </HoverCard>
  );
}
