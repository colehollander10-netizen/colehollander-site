import type { Metadata } from "next";
import Link from "next/link";

import { Bookshelf } from "@/components/bookshelf";
import { arrangeShelves } from "@/lib/books/records";
import { loadBooks } from "@/lib/books/store";
import { reveal, textLink } from "@/lib/styles";

export const metadata: Metadata = {
  title: "Books · Cole Hollander",
  description: "What Cole Hollander is reading, has finished, and wants to read.",
};

// Books sent through /api/intake show up within a minute; the intake also
// revalidates this page as soon as it writes.
export const revalidate = 60;

export default async function BooksPage() {
  const shelves = arrangeShelves(await loadBooks());

  return (
    <main className="mx-auto w-full max-w-[40rem] px-6 pt-20 pb-24 text-[15px] leading-relaxed sm:text-sm sm:pt-32">
      <header className={reveal}>
        <Link href="/" className={`${textLink} text-muted-foreground`}>
          Cole Hollander
        </Link>
        <h1 className="mt-6 -ml-[0.04em] text-[clamp(2.5rem,11vw,3.75rem)] leading-[0.95] font-light tracking-[-0.045em]">
          Books
        </h1>
      </header>

      {shelves.map((shelf, i) => (
        <section
          key={shelf.status}
          aria-labelledby={`shelf-${shelf.status}`}
          className={`${reveal} mt-16`}
          style={{ animationDelay: `${150 * (i + 1)}ms` }}
        >
          <h2 id={`shelf-${shelf.status}`} className="mb-12 text-muted-foreground">
            {shelf.title} <span className="tabular-nums text-foreground/30">{shelf.books.length}</span>
          </h2>
          {shelf.books.length ? (
            <Bookshelf books={shelf.books} label={shelf.title} />
          ) : (
            <p className="text-muted-foreground">Nothing here right now.</p>
          )}
        </section>
      ))}
    </main>
  );
}
