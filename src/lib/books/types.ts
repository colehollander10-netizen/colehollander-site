export type BookStatus = "in_progress" | "finished" | "want_to_read";
export type BookSource = "openlibrary" | "googlebooks";

// One row of the `books` table. Dates are YYYY-MM-DD; timestamps are ISO.
export type Book = {
  id: number;
  title: string;
  authors: string[];
  status: BookStatus;
  rating: number | null;
  startDate: string | null;
  finishDate: string | null;
  coverUrl: string | null;
  coverCachedPath: string | null;
  spineColor: string | null;
  source: BookSource | null;
  sourceId: string | null;
  isbn: string | null;
  year: number | null;
  pages: number | null;
  createdAt: string;
  updatedAt: string;
};

export type NewBook = Omit<Book, "id" | "createdAt" | "updatedAt">;

// What the vision model (or a typed list) says the book is.
export type Guess = {
  title: string;
  authors: string[];
  isbn?: string | null;
  publisher?: string | null;
  confidence: number;
};

// One book returned by Open Library or Google Books.
export type Candidate = {
  source: BookSource;
  sourceId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  year: number | null;
  pages: number | null;
  isbns: string[];
  coverUrl: string | null;
};
