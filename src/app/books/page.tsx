import type { Metadata } from "next";

import { Library } from "@/components/bookshelf";
import { SiteNav } from "@/components/site-nav";
import { arrangeShelves } from "@/lib/books/records";
import { loadBooks } from "@/lib/books/store";
import { reveal } from "@/lib/styles";

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
        <SiteNav current="/books" />
        <h1 className="mt-10 -ml-[0.04em] text-[clamp(2.5rem,11vw,3.75rem)] leading-[0.95] font-light tracking-[-0.045em]">
          Books
        </h1>
      </header>

      <Library shelves={shelves} />
    </main>
  );
}
