import Link from "next/link";

import type { readingStrip } from "@/lib/books/records";

const HEIGHT = 40;

// A few small spines on a shelf line, for the books in progress. They lift
// a little on hover and link to the full shelf.
export function ReadingStrip({ books }: { books: ReturnType<typeof readingStrip> }) {
  if (!books.length) return null;
  return (
    <Link
      href="/books"
      className="group/strip flex w-fit items-end gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
    >
      <span aria-hidden className="flex items-end gap-[2px] border-b-2 border-(--shelf-wood) px-1">
        {books.map((book, i) => (
          <span
            key={book.id}
            className="block rounded-t-[1.5px] ring-1 ring-foreground/15 ring-inset motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.34,1.4,0.64,1)] group-hover/strip:-translate-y-1"
            style={{
              width: Math.round(book.width / 3),
              height: HEIGHT,
              backgroundColor: book.color,
              transitionDelay: `${i * 35}ms`,
            }}
          />
        ))}
      </span>
      <span className="pb-px text-muted-foreground underline decoration-foreground/25 decoration-1 underline-offset-4 transition-colors group-hover/strip:decoration-foreground">
        Reading now
        <span className="sr-only">: {books.map((b) => b.title).join(", ")}</span>
      </span>
    </Link>
  );
}
