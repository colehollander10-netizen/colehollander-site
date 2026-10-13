import { inkFor } from "./color";
import type { Book } from "./types";

// Cloth colors for books whose catalog has no cover: oxblood, navy, forest,
// ochre, slate, and plum, like library bindings.
export const CLOTH = ["#6e2a26", "#24395a", "#2f4a3a", "#855a1c", "#46525e", "#553449"];

// Thicker books get wider spines, within a range that keeps the shelf even.
export function spineWidth(pages: number | null): number {
  return pages ? Math.round(Math.min(44, Math.max(22, 18 + pages / 16))) : 30;
}

// The color sampled from the cover, or a cloth color picked by title so the
// same book always gets the same one.
export function spineColor(book: Pick<Book, "title" | "spineColor">): string {
  if (book.spineColor) return book.spineColor;
  const hash = [...book.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return CLOTH[hash % CLOTH.length];
}

export function spineInk(color: string): string {
  return inkFor(color) === "dark" ? "#1f1a16" : "#fbf8f2";
}

// What fits on a spine: "Augustine of Hippo" -> "Augustine", and two Martins
// -> "Martin".
const lastName = (author: string) => (author.includes(" of ") ? author.split(" of ")[0] : author.split(" ").at(-1));
export const lastNames = (authors: string[]) => [...new Set(authors.map(lastName))].join(" & ");
