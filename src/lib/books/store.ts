import { createClient, type Client, type Row } from "@libsql/client";

import shelf from "@/data/books/shelf.json";
import type { Book, NewBook } from "./types";

export type IntakeDecision =
  | "added"
  | "updated"
  | "duplicate"
  | "needs_choice"
  | "no_match"
  | "chosen"
  | "declined"
  | "error";

export type IntakeLog = {
  id: number;
  createdAt: string;
  image: string | null;
  caption: string | null;
  guess: unknown;
  candidates: unknown;
  decision: IntakeDecision;
  bookId: number | null;
  message: string;
};

export type NewIntakeLog = Omit<IntakeLog, "id" | "createdAt">;

// Everything the site and the intake need from a database. Another database
// plugs in by implementing this and returning it from getStore().
export interface BookStore {
  listBooks(): Promise<Book[]>;
  insertBook(book: NewBook): Promise<Book>;
  updateBook(id: number, changes: Partial<NewBook>): Promise<Book>;
  deleteBook(id: number): Promise<void>;
  logIntake(entry: NewIntakeLog): Promise<number>;
  getIntake(id: number): Promise<IntakeLog | null>;
  updateIntake(id: number, changes: Partial<NewIntakeLog>): Promise<void>;
  listIntakes(limit: number): Promise<IntakeLog[]>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'finished', 'want_to_read')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    start_date TEXT,
    finish_date TEXT,
    cover_url TEXT,
    cover_cached_path TEXT,
    spine_color TEXT,
    source TEXT CHECK (source IN ('openlibrary', 'googlebooks')),
    source_id TEXT,
    isbn TEXT,
    year INTEGER,
    pages INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (source, source_id)
  )`,
  `CREATE TABLE IF NOT EXISTS intake_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    image TEXT,
    caption TEXT,
    guess TEXT,
    candidates TEXT,
    decision TEXT NOT NULL,
    book_id INTEGER,
    message TEXT NOT NULL
  )`,
];

const BOOK_COLUMNS: Record<keyof NewBook, string> = {
  title: "title",
  authors: "authors",
  status: "status",
  rating: "rating",
  startDate: "start_date",
  finishDate: "finish_date",
  coverUrl: "cover_url",
  coverCachedPath: "cover_cached_path",
  spineColor: "spine_color",
  source: "source",
  sourceId: "source_id",
  isbn: "isbn",
  year: "year",
  pages: "pages",
};

const LOG_COLUMNS: Record<keyof NewIntakeLog, string> = {
  image: "image",
  caption: "caption",
  guess: "guess",
  candidates: "candidates",
  decision: "decision",
  bookId: "book_id",
  message: "message",
};

const JSON_FIELDS = new Set(["authors", "guess", "candidates"]);

function toSql<T extends object>(columns: Record<string, string>, values: Partial<T>) {
  const entries = Object.entries(values).filter(([k, v]) => k in columns && v !== undefined);
  return {
    names: entries.map(([k]) => columns[k]),
    args: entries.map(([k, v]) => (JSON_FIELDS.has(k) ? JSON.stringify(v) : (v as string | number | null))),
  };
}

function rowToBook(r: Row): Book {
  return {
    id: Number(r.id),
    title: String(r.title),
    authors: JSON.parse(String(r.authors)),
    status: r.status as Book["status"],
    rating: r.rating === null ? null : Number(r.rating),
    startDate: r.start_date as string | null,
    finishDate: r.finish_date as string | null,
    coverUrl: r.cover_url as string | null,
    coverCachedPath: r.cover_cached_path as string | null,
    spineColor: r.spine_color as string | null,
    source: r.source as Book["source"],
    sourceId: r.source_id as string | null,
    isbn: r.isbn as string | null,
    year: r.year === null ? null : Number(r.year),
    pages: r.pages === null ? null : Number(r.pages),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowToLog(r: Row): IntakeLog {
  return {
    id: Number(r.id),
    createdAt: String(r.created_at),
    image: r.image as string | null,
    caption: r.caption as string | null,
    guess: r.guess === null ? null : JSON.parse(String(r.guess)),
    candidates: r.candidates === null ? null : JSON.parse(String(r.candidates)),
    decision: r.decision as IntakeDecision,
    bookId: r.book_id === null ? null : Number(r.book_id),
    message: String(r.message),
  };
}

// libSQL speaks to Turso over HTTP in production and to a local SQLite file
// (file:books.db) or memory (:memory:) for development and tests.
export async function libsqlStore(db: Client): Promise<BookStore> {
  await db.batch(SCHEMA, "write");
  const now = () => new Date().toISOString();

  const getBook = async (id: number) => {
    const { rows } = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [id] });
    if (!rows[0]) throw new Error(`No book with id ${id}`);
    return rowToBook(rows[0]);
  };

  return {
    async listBooks() {
      const { rows } = await db.execute("SELECT * FROM books ORDER BY id");
      return rows.map(rowToBook);
    },
    async insertBook(book) {
      const { names, args } = toSql(BOOK_COLUMNS, book);
      const stamp = now();
      const res = await db.execute({
        sql: `INSERT INTO books (${names.join(", ")}, created_at, updated_at)
              VALUES (${names.map(() => "?").join(", ")}, ?, ?)`,
        args: [...args, stamp, stamp],
      });
      return getBook(Number(res.lastInsertRowid));
    },
    async updateBook(id, changes) {
      const { names, args } = toSql(BOOK_COLUMNS, changes);
      await db.execute({
        sql: `UPDATE books SET ${[...names, "updated_at"].map((n) => `${n} = ?`).join(", ")} WHERE id = ?`,
        args: [...args, now(), id],
      });
      return getBook(id);
    },
    async deleteBook(id) {
      await db.execute({ sql: "DELETE FROM books WHERE id = ?", args: [id] });
    },
    async logIntake(entry) {
      const { names, args } = toSql(LOG_COLUMNS, entry);
      const res = await db.execute({
        sql: `INSERT INTO intake_log (${names.join(", ")}, created_at)
              VALUES (${names.map(() => "?").join(", ")}, ?)`,
        args: [...args, now()],
      });
      return Number(res.lastInsertRowid);
    },
    async getIntake(id) {
      const { rows } = await db.execute({ sql: "SELECT * FROM intake_log WHERE id = ?", args: [id] });
      return rows[0] ? rowToLog(rows[0]) : null;
    },
    async updateIntake(id, changes) {
      const { names, args } = toSql(LOG_COLUMNS, changes);
      if (!names.length) return;
      await db.execute({
        sql: `UPDATE intake_log SET ${names.map((n) => `${n} = ?`).join(", ")} WHERE id = ?`,
        args: [...args, id],
      });
    },
    async listIntakes(limit) {
      const { rows } = await db.execute({
        sql: "SELECT * FROM intake_log ORDER BY id DESC LIMIT ?",
        args: [limit],
      });
      return rows.map(rowToLog);
    },
  };
}

let store: Promise<BookStore> | null = null;

// The configured database, or null when BOOKS_DATABASE_URL is unset.
export function getStore(): Promise<BookStore> | null {
  const url = process.env.BOOKS_DATABASE_URL;
  if (!url) return null;
  store ??= libsqlStore(createClient({ url, authToken: process.env.BOOKS_DATABASE_AUTH_TOKEN }));
  return store;
}

// The shelf reads the database when one is configured, and otherwise the
// seed committed in src/data/books/shelf.json (so builds need no credentials).
export async function loadBooks(): Promise<Book[]> {
  const db = getStore();
  return db ? (await db).listBooks() : (shelf as Book[]);
}
