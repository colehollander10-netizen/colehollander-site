"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import { Otto } from "@/components/otto";

const WORD = "ship";

export function ShipEgg() {
  const reduce = useReducedMotion();
  const [run, setRun] = useState<{ id: number; width: number } | null>(null);

  useEffect(() => {
    console.log(
      "%cpsst. type “ship” anywhere on the page.",
      "color:#3aa8dc;font-family:ui-monospace,monospace",
    );

    let typed = "";
    const ship = () => {
      setRun({ id: Date.now(), width: window.innerWidth });
      const order = String(Math.floor(1000 + Math.random() * 9000));
      toast(`Order #CH-${order} shipped`, {
        description: "Routed through Order Desk. Thanks for stopping by.",
      });
    };
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest("input, textarea, [contenteditable]")
      )
        return;
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
      typed = (typed + e.key.toLowerCase()).slice(-WORD.length);
      if (typed === WORD) {
        typed = "";
        ship();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-28 z-40 h-12 overflow-hidden"
    >
      <AnimatePresence>
        {run && !reduce && (
          <motion.div
            key={run.id}
            className="absolute bottom-0 left-0"
            initial={{ x: -48 }}
            animate={{ x: run.width + 48 }}
            transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1] }}
            onAnimationComplete={() => setRun(null)}
          >
            {/* Otto delivers the order, waving on his way past. */}
            <motion.span
              className="block"
              animate={{ y: [0, -6, 0, -3, 0] }}
              transition={{ duration: 0.55, repeat: 3 }}
            >
              <Otto
                carrying
                height={36}
                armClassName="animate-[otto-wave_480ms_ease-in-out_infinite]"
              />
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
