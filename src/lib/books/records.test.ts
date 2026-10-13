import { describe, expect, it } from "vitest";

import { datesForNewBook, findDuplicate, statusChange, statusFromCaption } from "./records";
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
