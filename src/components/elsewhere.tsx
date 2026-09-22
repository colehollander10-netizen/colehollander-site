"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";

import { Separator } from "@/components/ui/separator";

const links = [
  {
    label: "X",
    Icon: FaXTwitter,
    detail: "@colehollander10",
    href: "https://x.com/colehollander10",
  },
  {
    label: "LinkedIn",
    Icon: FaLinkedin,
    detail: "in/cole-hollander-gt5",
    href: "https://www.linkedin.com/in/cole-hollander-gt5",
  },
];

export function Elsewhere() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <ul onPointerLeave={() => setActive(null)}>
      {links.map((link, i) => (
        <li key={link.href} className="relative">
          <Separator />
          {active === i && (
            <motion.span
              layoutId="elsewhere-highlight"
              className="absolute inset-x-[-0.5rem] inset-y-px -z-10 rounded-md bg-muted"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <a
            href={link.href}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="group -mx-2 flex items-center gap-4 rounded-md px-2 py-2.5 focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <span className="flex items-center gap-2">
              <link.Icon aria-hidden className="size-3.5" />
              {link.label}
            </span>
            <span className="ml-auto truncate text-muted-foreground transition-colors group-hover:text-foreground">
              {link.detail}
            </span>
            <ArrowUpRight
              aria-hidden
              className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
            />
          </a>
        </li>
      ))}
      <Separator />
    </ul>
  );
}
