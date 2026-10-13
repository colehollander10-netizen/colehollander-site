import { describe, expect, it } from "vitest";

import shelf from "@/data/books/shelf.json";

import {
  arrangeShelves,
  datesForNewBook,
  findDuplicate,
  FINISHED_SHOWN,
  readingStrip,
  shelfBooks,
  statusChange,
  statusFromCaption,
  STRIP_MAX,
} from "./records";
import { CLOTH } from "./spine";
import type { Book } from "./types";

describe("statusFromCaption", () => {
  it.each([
    ["finished", "finished"],
    ["Done!", "finished"],
    ["just finished reading this", "finished"],
    ["started", "in_progress"],
    ["Reading", "in_progress"],
    ["starting this one tonight", "in_progress"],
    ["to read", "want_to_read"],
    ["Want to read", "want_to_read"],
    ["on my list", "want_to_read"],
  ])("%s -> %s", (caption, status) => {
    expect(statusFromCaption(caption)).toBe(status);
  });

  it.each([null, undefined, "", "look at this cover", "thread"])("%s says nothing", (caption) => {
    expect(statusFromCaption(caption)).toBeNull();
  });
});

const book = (extra: Partial<Book>): Book => ({
  id: 1,
  title: "Knowing God",
  authors: ["J. I. Packer"],
  status: "in_progress",
  rating: null,
  startDate: "2026-10-01",
  finishDate: null,
  coverUrl: null,
  coverCachedPath: null,
  spineColor: null,
  source: "openlibrary",
  sourceId: "OL68979W",
  isbn: "9780830816507",
  year: 1973,
  pages: 256,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  ...extra,
});

describe("findDuplicate", () => {
  const shelf = [
    book({}),
    book({ id: 2, title: "No More Boring Bible Study", authors: ["Faith Womack"], source: null, sourceId: null, isbn: null }),
  ];
  const incoming = { source: "openlibrary" as const, sourceId: "OL68979W", isbn: null, title: "Knowing God", authors: ["J. I. Packer"] };

  it("matches by catalog ID", () => {
    expect(findDuplicate(shelf, incoming)?.id).toBe(1);
  });

  it("matches by ISBN across catalogs", () => {
    const fromGoogle = { ...incoming, source: "googlebooks" as const, sourceId: "abc", isbn: "9780830816507" };
    expect(findDuplicate(shelf, fromGoogle)?.id).toBe(1);
  });

  it("matches an unverified row by title and author", () => {
    const b = { source: "openlibrary" as const, sourceId: "OL1W", isbn: null, title: "No More Boring Bible Study", authors: ["Faith Womack"] };
    expect(findDuplicate(shelf, b)?.id).toBe(2);
  });

  it("does not match a different work with the same title", () => {
    const guide = { ...incoming, sourceId: "OL8381301W", authors: ["J. I. Packer"] };
    expect(findDuplicate(shelf, guide)).toBeUndefined();
  });
});

describe("status changes", () => {
  it("dates a new book by its status", () => {
    expect(datesForNewBook("in_progress", "2026-10-12")).toEqual({ startDate: "2026-10-12", finishDate: null });
    expect(datesForNewBook("finished", "2026-10-12")).toEqual({ startDate: null, finishDate: "2026-10-12" });
    expect(datesForNewBook("want_to_read", "2026-10-12")).toEqual({ startDate: null, finishDate: null });
  });

  it("finishing keeps the start date and sets the finish date", () => {
    expect(statusChange(book({}), "finished", "2026-10-12")).toEqual({
      status: "finished",
      startDate: "2026-10-01",
      finishDate: "2026-10-12",
    });
  });

  it("starting a to-read book sets the start date", () => {
    expect(statusChange(book({ status: "want_to_read", startDate: null }), "in_progress", "2026-10-12")).toEqual({
      status: "in_progress",
      startDate: "2026-10-12",
      finishDate: null,
    });
  });

  it("changes nothing for the same status or no status", () => {
    expect(statusChange(book({}), "in_progress", "2026-10-12")).toBeNull();
    expect(statusChange(book({}), null, "2026-10-12")).toBeNull();
  });
});

describe("shelves", () => {
  const finished = (id: number, finishDate: string | null) => book({ id, status: "finished", finishDate });

  it("puts the newest finish first, then undated books newest added first", () => {
    const books = [finished(1, null), finished(2, "2026-09-01"), finished(3, null), finished(4, "2026-10-05"), book({ id: 5 })];
    expect(shelfBooks(books, "finished").map((b) => b.id)).toEqual([4, 2, 3, 1]);
  });

  it("orders Reading now by start date and To read by date added", () => {
    const books = [
      book({ id: 1, startDate: "2026-09-01" }),
      book({ id: 2, startDate: "2026-10-01" }),
      book({ id: 3, status: "want_to_read", startDate: null, createdAt: "2026-10-02T00:00:00Z" }),
      book({ id: 4, status: "want_to_read", startDate: null, createdAt: "2026-10-03T00:00:00Z" }),
    ];
    expect(shelfBooks(books, "in_progress").map((b) => b.id)).toEqual([2, 1]);
    expect(shelfBooks(books, "want_to_read").map((b) => b.id)).toEqual([4, 3]);
  });

  it("has the three shelves in order, and only Finished is cut to the newest 12", () => {
    const books = Array.from({ length: 20 }, (_, i) => finished(i + 1, `2026-01-${String(i + 1).padStart(2, "0")}`));
    const shelves = arrangeShelves([...books, book({ id: 99 })]);
    expect(shelves.map((s) => [s.title, s.books.length, s.shown])).toEqual([
      ["Reading now", 1, null],
      ["Finished", 20, FINISHED_SHOWN],
      ["To read", 0, null],
    ]);
    expect(FINISHED_SHOWN).toBe(12);
    expect(shelves[1].books.slice(0, FINISHED_SHOWN).map((b) => b.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => 20 - i),
    );
  });
});

describe("the seeded shelf", () => {
  const books = shelf as Book[];
  const titles = (status: Book["status"]) => shelfBooks(books, status).map((b) => b.title);

  it("puts the photographed books, the newest, before the old tracker list", () => {
    expect(titles("finished")[0]).toBe("The Simple Path to Wealth");
    expect(titles("finished").slice(1, 4)).toEqual(["12 Ways Your Phone is Changing You", "Prayer", "The Running Man"]);
    expect(titles("in_progress")).toEqual(["Knowing God", "The Anxious Generation", "Confessions"]);
  });
});

describe("readingStrip", () => {
  it("is the Reading now shelf, as spine colors and widths", () => {
    const strip = readingStrip([
      book({ id: 1, startDate: "2026-09-01", spineColor: "#16130c", pages: 351 }),
      book({ id: 2, startDate: "2026-10-01", title: "You Gotta Ask", spineColor: null, pages: null }),
      book({ id: 3, status: "finished" }),
    ]);
    expect(strip).toEqual([
      { id: 2, title: "You Gotta Ask", color: expect.any(String), width: 30 },
      { id: 1, title: "Knowing God", color: "#16130c", width: 40 },
    ]);
    expect(CLOTH).toContain(strip[0].color);
  });

  it(`shows at most ${STRIP_MAX} books`, () => {
    const books = Array.from({ length: STRIP_MAX + 3 }, (_, i) => book({ id: i + 1 }));
    expect(readingStrip(books)).toHaveLength(STRIP_MAX);
  });

  it("is empty when nothing is in progress", () => {
    expect(readingStrip([book({ status: "finished" })])).toEqual([]);
  });
});
