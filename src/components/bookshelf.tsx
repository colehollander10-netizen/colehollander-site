"use client";

import Image from "next/image";
import { motion, MotionConfig } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { inkFor } from "@/lib/books/color";
import type { Book } from "@/lib/books/types";

const SPINE_H = 176;
const COVER_W = 140;
const COVER_H = 210;

// About 400ms with a little overshoot, so the book feels pulled, not slid.
const spring = { type: "spring", duration: 0.4, bounce: 0.18 } as const;

// Cloth colors for books whose catalog has no cover.
const CLOTH = ["#6f4e37", "#4f5d4a", "#3f4f63", "#7a5c3e", "#5e4655", "#425a5a"];

// Thicker books get wider spines, within a range that keeps the shelf even.
function spineWidth(pages: number | null): number {
  return pages ? Math.round(Math.min(44, Math.max(22, 18 + pages / 16))) : 30;
}

function spineColor(book: Book): string {
  if (book.spineColor) return book.spineColor;
  const hash = [...book.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return CLOTH[hash % CLOTH.length];
}

const lastNames = (authors: string[]) => authors.map((a) => a.split(" ").at(-1)).join(" & ");

function formatDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dateLine(book: Book): string | null {
  if (book.status === "finished" && book.finishDate) return `Finished ${formatDate(book.finishDate)}`;
  if (book.status === "in_progress" && book.startDate) return `Started ${formatDate(book.startDate)}`;
  return null;
}

// Hovering a spine (or tapping it, or Enter on it) pulls the book off the
// shelf: the spine swings away and the cover turns to face the visitor.
export function Bookshelf({ books, label }: { books: Book[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const shelf = useRef<HTMLUListElement>(null);

  // A tap elsewhere or Escape puts the book back.
  useEffect(() => {
    if (active === null) return;
    const away = (e: PointerEvent) => {
      if (!shelf.current?.contains(e.target as Node)) setActive(null);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [active]);

  return (
    <MotionConfig reducedMotion="user">
      <ul
        ref={shelf}
        aria-label={label}
        // Clipped sideways so closed covers past the edge never widen the page.
        className="bookshelf flex flex-wrap items-end gap-x-[3px] overflow-x-clip px-2"
        style={{ "--spine-h": `${SPINE_H}px` } as CSSProperties}
      >
        {books.map((book) => (
          <Spine
            key={book.id}
            book={book}
            active={active === book.id}
            setActive={(on) => setActive((cur) => (on ? book.id : cur === book.id ? null : cur))}
          />
        ))}
      </ul>
    </MotionConfig>
  );
}

function Spine({ book, active, setActive }: { book: Book; active: boolean; setActive: (on: boolean) => void }) {
  const item = useRef<HTMLLIElement>(null);
  const pointer = useRef("");
  const [left, setLeft] = useState(0);
  const width = spineWidth(book.pages);
  const color = spineColor(book);
  const ink = inkFor(color) === "dark" ? "#1f1a16" : "#fbf8f2";
  const cover = book.coverCachedPath ?? book.coverUrl;
  const dates = dateLine(book);
  const authors = book.authors.join(", ");

  // Center the cover on the spine, kept inside the shelf.
  const open = () => {
    const li = item.current;
    if (li?.parentElement) {
      const x = li.offsetLeft;
      const room = li.parentElement.clientWidth;
      setLeft(Math.min(Math.max((width - COVER_W) / 2, -x), room - x - COVER_W));
    }
    setActive(true);
  };

  const description = [
    `${book.title}${authors ? ` by ${authors}` : ""}`,
    dates,
    book.rating && `rated ${book.rating} of 5`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    // perspective makes each item its own stack, so the open one is lifted.
    // Hover is tracked here, not on the spine, which swings out from under the
    // pointer.
    <li
      ref={item}
      className={`relative shrink-0 ${active ? "z-20" : ""}`}
      style={{ width, height: SPINE_H, perspective: 900 }}
      onPointerEnter={(e) => e.pointerType === "mouse" && open()}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(false)}
    >
      <motion.button
        type="button"
        aria-label={description}
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        // The mouse opens on hover; touch and keyboard toggle.
        onClick={() => {
          const mouse = pointer.current === "mouse";
          pointer.current = "";
          if (mouse) return;
          if (active) setActive(false);
          else open();
        }}
        onBlur={() => setActive(false)}
        initial={false}
        animate={active ? { rotateY: -70, opacity: 0.35 } : { rotateY: 0, opacity: 1 }}
        transition={spring}
        className="spine absolute inset-0 flex cursor-pointer flex-col items-center justify-between overflow-hidden rounded-[3px] py-3 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        style={{ backgroundColor: color, color: ink, transformOrigin: "left center" }}
      >
        <span className="max-h-[118px] truncate text-[11px] leading-none font-medium tracking-tight [writing-mode:vertical-rl]">
          {book.title}
        </span>
        {book.authors.length > 0 && (
          <span className="max-h-[36px] truncate text-[9px] leading-none opacity-75 [writing-mode:vertical-rl]">
            {lastNames(book.authors)}
          </span>
        )}
      </motion.button>

      <motion.div
        aria-hidden
        initial={false}
        animate={
          active
            ? { opacity: 1, rotateY: 0, scale: 1, y: 0 }
            : { opacity: 0, rotateY: 55, scale: 0.72, y: 14 }
        }
        transition={spring}
        className="pointer-events-none absolute"
        style={{ left, top: SPINE_H - COVER_H, width: COVER_W, transformPerspective: 900, originX: 0.5, originY: 1 }}
      >
        <div
          className="relative overflow-hidden rounded-[3px] shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_4px_12px_-4px_rgb(0_0_0/0.3)]"
          style={{ width: COVER_W, height: COVER_H, backgroundColor: color }}
        >
          {cover ? (
            <Image src={cover} alt="" width={COVER_W} height={COVER_H} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col justify-between p-4" style={{ color: ink }}>
              <span className="text-base leading-tight font-medium">{book.title}</span>
              <span className="text-xs opacity-75">{authors}</span>
            </div>
          )}
        </div>
        <div className="mt-2 rounded-md bg-popover/95 px-2.5 py-2 text-xs leading-snug shadow-sm ring-1 ring-foreground/10">
          <p className="font-medium text-popover-foreground">{book.title}</p>
          {authors && <p className="text-muted-foreground">{authors}</p>}
          {(dates || book.rating) && (
            <p className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{dates}</span>
              {book.rating && (
                <span className="tracking-[0.15em] text-foreground/45">
                  {"★".repeat(book.rating)}
                  <span className="text-foreground/15">{"★".repeat(5 - book.rating)}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </motion.div>
    </li>
  );
}
