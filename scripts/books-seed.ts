// Resolves the starting reading list (src/data/books/seed.json: the four
// photographed books plus the old tracker list) against Open Library, then
// Google Books, with the same confidence rules as the intake. Writes the
// result to src/data/books/shelf.json and the covers to public/books/covers,
// so the site builds with no network or database. Prints a report.
//
//   pnpm books:seed
//
// Books that fail the checks keep the list's title and author, with no
// cover, and are listed in the report. The list was typed by hand, so the
// "vision" confidence is 1. An entry with no author is accepted only when
// one book alone matches its title.
import { mkdir, rm, writeFile } from "node:fs/promises";

import seed from "@/data/books/seed.json";
import { prepareCover } from "@/lib/books/covers";
import { resolveGuess } from "@/lib/books/lookup";
import { creditedAuthors, displayTitle } from "@/lib/books/match";
import type { Book, BookStatus } from "@/lib/books/types";

const COVERS = "public/books/covers";

type SeedEntry = {
  title: string;
  authors: string[];
  status: BookStatus;
  rating: number | null;
  publisher?: string;
};

async function main() {
  await rm(COVERS, { recursive: true, force: true });
  await mkdir(COVERS, { recursive: true });
  const stamp = new Date().toISOString();
  const books: Book[] = [];
  const report: string[] = [];

  for (const [i, entry] of (seed as SeedEntry[]).entries()) {
    const guess = { title: entry.title, authors: entry.authors, publisher: entry.publisher, confidence: 1 };
    const res = await resolveGuess(guess, { allowNoAuthor: entry.authors.length === 0 });
    // Reading dates aren't on the list, so seeded books have none.
    const base = {
      id: i + 1,
      status: entry.status,
      rating: entry.rating,
      startDate: null,
      finishDate: null,
      createdAt: stamp,
      updatedAt: stamp,
    };
    const notes = res.notes.length ? ` [${res.notes.join("; ")}]` : "";
    if (res.ok) {
      const m = res.match;
      const cover = await prepareCover(m, async (name, jpeg) => {
        await writeFile(`${COVERS}/${name}.jpg`, jpeg);
        return `/books/covers/${name}.jpg`;
      });
      const title = displayTitle(entry.title, m.title);
      const authors = creditedAuthors(entry.authors, m.authors);
      books.push({
        ...base,
        title,
        authors,
        ...cover,
        source: m.source,
        sourceId: m.sourceId,
        isbn: m.isbns[0] ?? null,
        year: m.year,
        pages: m.pages,
      });
      report.push(
        `OK    ${entry.title} -> "${title}" by ${authors.join(", ")} (${m.source} ${m.sourceId}, ` +
          `title ${m.titleScore.toFixed(2)}, isbn ${m.isbns[0] ?? "none"}, cover ${cover.coverUrl ?? "none"})${notes}`,
      );
    } else {
      books.push({
        ...base,
        title: entry.title,
        authors: entry.authors,
        coverUrl: null,
        coverCachedPath: null,
        spineColor: null,
        source: null,
        sourceId: null,
        isbn: null,
        year: null,
        pages: null,
      });
      const offered = res.candidates
        .map((c) => `"${c.title}" by ${c.authors.join(", ") || "?"} (${c.source} ${c.sourceId}, title ${c.titleScore.toFixed(2)})`)
        .join("; ");
      report.push(`FAIL  ${entry.title}: ${res.reasons.join("; ")}. Candidates: ${offered || "none"}${notes}`);
    }
  }

  await writeFile("src/data/books/shelf.json", `${JSON.stringify(books, null, 2)}\n`);
  console.log(report.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
