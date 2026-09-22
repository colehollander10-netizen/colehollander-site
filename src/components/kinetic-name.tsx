"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

import { SHIP_EVENT } from "@/components/ship-egg";

const NAME = "Cole Hollander";
const REACH = 140;

function Letter({
  char,
  pointerX,
  pointerY,
}: {
  char: string;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const distance = useTransform(() => {
    // Read both pointer values first so the transform always subscribes to them.
    const x = pointerX.get();
    const y = pointerY.get();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return REACH;
    const dx = x - (rect.left + rect.width / 2);
    const dy = y - (rect.top + rect.height / 2);
    return Math.hypot(dx, dy);
  });
  const target = useTransform(distance, [0, REACH], [800, 300], {
    clamp: true,
  });
  const weight = useSpring(target, { stiffness: 260, damping: 26 });
  const settings = useTransform(weight, (w) => `"wght" ${Math.round(w)}`);

  return (
    <motion.span
      ref={ref}
      aria-hidden
      className="inline-block whitespace-pre"
      style={{ fontVariationSettings: settings }}
    >
      {char}
    </motion.span>
  );
}

export function KineticName() {
  const reduce = useReducedMotion();
  const pointerX = useMotionValue(-9999);
  const pointerY = useMotionValue(-9999);
  const pressTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (reduce) return;
    const move = (e: PointerEvent) => {
      pointerX.set(e.clientX);
      pointerY.set(e.clientY);
    };
    const leave = () => {
      pointerX.set(-9999);
      pointerY.set(-9999);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [reduce, pointerX, pointerY]);

  // Long-press the name on touch screens to find the easter egg.
  const startPress = () => {
    pressTimer.current = window.setTimeout(
      () => window.dispatchEvent(new Event(SHIP_EVENT)),
      700,
    );
  };
  const cancelPress = () => window.clearTimeout(pressTimer.current);

  return (
    <h1
      className="-ml-[0.04em] cursor-default select-none text-[clamp(2.5rem,11vw,3.75rem)] leading-[0.95] font-light tracking-[-0.045em] [touch-action:pan-y]"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="sr-only">{NAME}</span>
      {NAME.split("").map((char, i) =>
        reduce ? (
          <span key={i} aria-hidden>
            {char}
          </span>
        ) : (
          <Letter key={i} char={char} pointerX={pointerX} pointerY={pointerY} />
        ),
      )}
    </h1>
  );
}
