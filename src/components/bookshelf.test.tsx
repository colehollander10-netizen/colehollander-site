import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Book } from "@/lib/books/types";
import { Bookshelf } from "./bookshelf";

const book = (id: number): Book => ({
  id,
  title: `Book ${id}`,
  authors: ["A. Writer"],
  status: "finished",
  rating: null,
  startDate: null,
  finishDate: null,
  coverUrl: null,
  coverCachedPath: null,
  spineColor: null,
  source: null,
  sourceId: null,
  isbn: null,
  year: null,
  pages: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
});

const books = (n: number) => Array.from({ length: n }, (_, i) => book(i + 1));
const spines = (html: string) => [...html.matchAll(/aria-label="(Book \d+) by/g)].map((m) => m[1]);

describe("Bookshelf", () => {
  it("starts with the first `shown` books and a collapsed Show all toggle", () => {
    const html = renderToStaticMarkup(<Bookshelf books={books(20)} label="Finished" shown={12} />);
    expect(spines(html)).toEqual(books(12).map((b) => b.title));
    const list = html.match(/<ul[^>]* id="([^"]+)"/)![1];
    expect(html).toMatch(new RegExp(`<button[^>]*aria-expanded="false"[^>]*aria-controls="${list}"[^>]*>Show all 20</button>`));
  });

  it("has no toggle when every book fits", () => {
    const html = renderToStaticMarkup(<Bookshelf books={books(12)} label="Finished" shown={12} />);
    expect(spines(html)).toHaveLength(12);
    expect(html).not.toContain("Show all");
  });

  it("shows every book on an uncut shelf", () => {
    const html = renderToStaticMarkup(<Bookshelf books={books(15)} label="To read" shown={null} />);
    expect(spines(html)).toHaveLength(15);
    expect(html).not.toContain("aria-expanded");
  });
});
