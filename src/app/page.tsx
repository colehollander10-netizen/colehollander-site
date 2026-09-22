import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

import { Separator } from "@/components/ui/separator";

const links = [
  {
    label: "Order Desk",
    detail: "orderdesk.com",
    href: "https://www.orderdesk.com",
  },
  { label: "X", detail: "@colehollander", href: "https://x.com/colehollander" },
  {
    label: "LinkedIn",
    detail: "in/cole-hollander-gt5",
    href: "https://www.linkedin.com/in/cole-hollander-gt5",
  },
];

const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-700 motion-safe:fill-mode-both";

const textLink =
  "rounded-sm underline decoration-foreground/25 decoration-1 underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[34rem] px-6 pt-20 pb-24 text-sm leading-relaxed sm:pt-32">
      <header className={reveal}>
        <h1 className="font-medium">Cole Hollander</h1>
        <p className="text-muted-foreground">Updated September 2026</p>
      </header>

      <section
        className={`${reveal} mt-10 space-y-4 motion-safe:delay-100`}
        aria-label="About"
      >
        <p>
          I work at{" "}
          <a href="https://www.orderdesk.com" className={textLink}>
            <Image
              src="/orderdesk-mark.png"
              alt=""
              width={14}
              height={14}
              className="mr-1 inline-block size-3.5 -translate-y-px rounded-[3px]"
              priority
            />
            Order Desk
          </a>
          , where we help merchants automate order management across hundreds
          of ecommerce services.
        </p>
        <p>
          Lately I build internal AI tools that help our support team answer
          customers faster.
        </p>
        <p>
          You can find me on{" "}
          <a href="https://x.com/colehollander" className={textLink}>
            X
          </a>{" "}
          and{" "}
          <a
            href="https://www.linkedin.com/in/cole-hollander-gt5"
            className={textLink}
          >
            LinkedIn
          </a>
          .
        </p>
      </section>

      <nav
        className={`${reveal} mt-16 motion-safe:delay-200`}
        aria-labelledby="elsewhere"
      >
        <h2 id="elsewhere" className="mb-3 text-muted-foreground">
          Elsewhere
        </h2>
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <Separator />
              <a
                href={link.href}
                className="group -mx-2 flex items-center gap-4 rounded-md px-2 py-2.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-foreground"
              >
                <span>{link.label}</span>
                <span className="ml-auto truncate text-muted-foreground">
                  {link.detail}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground motion-reduce:transition-none"
                />
              </a>
            </li>
          ))}
        </ul>
        <Separator />
      </nav>
    </main>
  );
}
