// Fixes the bookshelf database by hand. Needs BOOKS_DATABASE_URL (and
// BOOKS_DATABASE_AUTH_TOKEN for Turso) in the environment.
//
//   pnpm books list
//   pnpm books set 12 status=finished finish_date=2026-10-12 rating=4
//   pnpm books delete 12
//   pnpm books import              copy src/data/books/shelf.json into an empty database
//   pnpm books log [count]         recent intakes, newest first
import shelf from "@/data/books/shelf.json";
import { getStore } from "@/lib/books/store";
import type { Book, NewBook } from "@/lib/books/types";

// Field names as typed on the command line, and how to read each value.
const FIELDS: Record<string, [keyof NewBook, (v: string) => unknown]> = {
  title: ["title", String],
  authors: ["authors", (v) => v.split(";").map((a) => a.trim())],
  status: ["status", (v) => {
    if (!["in_progress", "finished", "want_to_read"].includes(v)) throw new Error(`Unknown status ${v}`);
    return v;
  }],
  rating: ["rating", (v) => (v === "null" ? null : Number(v))],
  start_date: ["startDate", (v) => (v === "null" ? null : v)],
  finish_date: ["finishDate", (v) => (v === "null" ? null : v)],
  cover_url: ["coverUrl", (v) => (v === "null" ? null : v)],
  spine_color: ["spineColor", (v) => (v === "null" ? null : v)],
  isbn: ["isbn", (v) => (v === "null" ? null : v)],
  year: ["year", (v) => (v === "null" ? null : Number(v))],
  pages: ["pages", (v) => (v === "null" ? null : Number(v))],
};

const row = (b: Book) =>
  [b.id, b.status.padEnd(12), b.rating ?? "-", `${b.title} — ${b.authors.join(", ")}`, b.sourceId ?? "(no catalog match)"].join("  ");

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const db = getStore();
  if (!db) throw new Error("Set BOOKS_DATABASE_URL first.");
  const store = await db;

  switch (command) {
    case "list":
      for (const b of await store.listBooks()) console.log(row(b));
      break;
    case "set": {
      const [id, ...pairs] = args;
      const changes: Partial<NewBook> = {};
      for (const pair of pairs) {
        const [key, ...rest] = pair.split("=");
        const field = FIELDS[key];
        if (!field) throw new Error(`Unknown field ${key}. Fields: ${Object.keys(FIELDS).join(", ")}`);
        Object.assign(changes, { [field[0]]: field[1](rest.join("=")) });
      }
      console.log(row(await store.updateBook(Number(id), changes)));
      break;
    }
    case "delete":
      await store.deleteBook(Number(args[0]));
      console.log(`Deleted ${args[0]}.`);
      break;
    case "import": {
      if ((await store.listBooks()).length) throw new Error("The database already has books; import is for an empty one.");
      // New ids and timestamps; everything else as committed.
      for (const book of shelf as Book[]) await store.insertBook(book);
      console.log(`Imported ${shelf.length} books.`);
      break;
    }
    case "log":
      for (const l of await store.listIntakes(Number(args[0] ?? 10))) {
        console.log(`#${l.id} ${l.createdAt} ${l.decision}${l.bookId ? ` book ${l.bookId}` : ""}: ${l.message}`);
      }
      break;
    default:
      console.log("Usage: pnpm books list | set <id> field=value… | delete <id> | import | log [count]");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
