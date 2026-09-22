"use client";

import { useState, type PointerEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";

const W = 96;
const H = 120;
const SPOT = 38;
const FULL = 160;

// A 1-bit dithered portrait. Hovering reveals the color photo in a spotlight
// that follows the pointer; clicking or tapping develops the whole photo.
export function Portrait() {
  const [developed, setDeveloped] = useState(false);
  const x = useMotionValue(W / 2);
  const y = useMotionValue(H / 2);
  const radius = useSpring(0, { stiffness: 220, damping: 28 });
  const mask = useMotionTemplate`radial-gradient(circle at ${x}px ${y}px, #000 calc(${radius}px * 0.55), transparent ${radius}px)`;

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse" || developed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
    radius.set(SPOT);
  };

  const toggle = () => {
    const next = !developed;
    setDeveloped(next);
    if (next) {
      x.set(W / 2);
      y.set(H / 2);
    }
    radius.set(next ? FULL : 0);
  };

  return (
    <button
      type="button"
      aria-pressed={developed}
      aria-label="Photo of Cole Hollander. Toggle color."
      onClick={toggle}
      onPointerMove={move}
      onPointerLeave={() => !developed && radius.set(0)}
      className="relative block cursor-crosshair overflow-hidden rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      style={{ width: W, height: H }}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-foreground [mask-image:url(/cole-dither-dark.png)] [mask-size:100%_100%] dark:[mask-image:url(/cole-dither-light.png)]"
      />
      <motion.img
        src="/cole.jpg"
        alt=""
        width={W}
        height={H}
        draggable={false}
        className="absolute inset-0 size-full object-cover"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      />
    </button>
  );
}
