import Link from "next/link";

import { textLink } from "@/lib/styles";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
] as const;

// The site's two pages. The current one is marked, and drops its underline.
export function SiteNav({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Site">
      <ul className="flex gap-5 text-muted-foreground">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={href === current ? "page" : undefined}
              className={`${textLink} aria-[current=page]:text-foreground aria-[current=page]:no-underline`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
