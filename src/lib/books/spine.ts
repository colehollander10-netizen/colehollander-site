import { inkFor } from "./color";
import type { Book } from "./types";

// Cloth colors for books whose catalog has no cover: oxblood, navy, forest,
// ochre, slate, and plum, like library bindings.
export const CLOTH = ["#6e2a26", "#24395a", "#2f4a3a", "#855a1c", "#46525e", "#553449"];

// Thicker books get wider spines, within a range that keeps the shelf even.
export function spineWidth(pages: number | null): number {
  return pages ? Math.round(Math.min(44, Math.max(22, 18 + pages / 16))) : 30;
}

// Picks made from the title, so the same book always looks the same.
const titleHash = (title: string) => [...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// The color sampled from the cover, or a cloth color.
export function spineColor(book: Pick<Book, "title" | "spineColor">): string {
  return book.spineColor ?? CLOTH[titleHash(book.title) % CLOTH.length];
}

// Books on a shelf are not all one height.
export const SPINE_MAX_H = 184;
export const spineHeight = (title: string) => SPINE_MAX_H - 34 + ((titleHash(title) >>> 3) % 35);

// How the title is set on a spine: plain, on a paper label, in gold foil
// under an ornament, or between raised bands.
const SPINE_STYLES = ["plain", "label", "foil", "bands"] as const;
export const spineStyle = (title: string) => SPINE_STYLES[(titleHash(title) >>> 7) % SPINE_STYLES.length];

export function spineInk(color: string): string {
  return inkFor(color) === "dark" ? "#1f1a16" : "#fbf8f2";
}

// What fits on a spine: "Augustine of Hippo" -> "Augustine", and two Martins
// -> "Martin".
export const lastName = (author: string) => (author.includes(" of ") ? author.split(" of ")[0] : author.split(" ").at(-1));
export const lastNames = (authors: string[]) => [...new Set(authors.map(lastName))].join(" & ");
