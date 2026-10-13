import { authorMatches, fold, mainTitle, normalizeTitle } from "./match";
import type { Book, BookSource, BookStatus } from "./types";

// "finished", "started", "to read"… -> a status, or null when the caption
// says nothing about one. Order matters: "want to read" mentions "read", and
// "finished reading" mentions "reading".
export function statusFromCaption(caption: string | null | undefined): BookStatus | null {
  const c = ` ${fold(caption ?? "")} `;
  if (/ (want to read|to read|on my list|tbr) /.test(c)) return "want_to_read";
  if (/ (finished|finish|done|completed) /.test(c)) return "finished";
  if (/ (reading|started|starting|start) /.test(c)) return "in_progress";
  return null;
}

type Identity = {
  source: BookSource | null;
  sourceId: string | null;
  isbn: string | null;
  title: string;
  authors: string[];
};

// The same book is never added twice: match by catalog ID, then ISBN. Rows
// that never matched a catalog (seeded from the old list) match by title and
// author, so a later photo of one updates it instead of adding a copy.
export function findDuplicate(books: Book[], b: Identity): Book | undefined {
  return (
    books.find((x) => b.sourceId && x.source === b.source && x.sourceId === b.sourceId) ??
    books.find((x) => b.isbn && x.isbn === b.isbn) ??
    books.find(
      (x) =>
        !x.sourceId &&
        normalizeTitle(mainTitle(x.title)) === normalizeTitle(mainTitle(b.title)) &&
        authorMatches(x.authors, b.authors),
    )
  );
}

export function datesForNewBook(status: BookStatus, today: string) {
  return {
    startDate: status === "in_progress" ? today : null,
    finishDate: status === "finished" ? today : null,
  };
}

// The changes to apply when a caption gives an existing book a new status,
// or null when nothing changes.
export function statusChange(
  book: Pick<Book, "status" | "startDate">,
  next: BookStatus | null,
  today: string,
): Pick<Book, "status" | "startDate" | "finishDate"> | null {
  if (!next || next === book.status) return null;
  if (next === "finished") {
    return { status: next, startDate: book.startDate, finishDate: today };
  }
  if (next === "in_progress") {
    return { status: next, startDate: today, finishDate: null };
  }
  return { status: next, startDate: null, finishDate: null };
}

export const SHELF_TITLES: Record<BookStatus, string> = {
  in_progress: "Reading now",
  finished: "Finished",
  want_to_read: "To read",
};

// Newest first by the date that matters for the shelf; undated books (the
// seeded list) follow in the order they were added.
export function arrangeShelves(books: Book[]) {
  const newest = (a: string | null, b: string | null) => (b ?? "").localeCompare(a ?? "");
  const shelf = (status: BookStatus, date: (b: Book) => string | null) => ({
    status,
    title: SHELF_TITLES[status],
    books: books
      .filter((b) => b.status === status)
      .sort((a, b) => newest(date(a), date(b)) || a.id - b.id),
  });
  return [
    shelf("in_progress", (b) => b.startDate),
    shelf("finished", (b) => b.finishDate),
    shelf("want_to_read", (b) => b.createdAt),
  ];
}
