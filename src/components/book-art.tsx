import { lastNames, spineColor, spineInk, spineStyle } from "@/lib/books/spine";
import type { Book } from "@/lib/books/types";

// A rounded spine: shadow at the hinge, a soft highlight, shadow at the edge.
const SPINE_SHADE =
  "linear-gradient(90deg, rgb(0 0 0/0.22), rgb(255 255 255/0.1) 20%, rgb(255 255 255/0) 50%, rgb(0 0 0/0.12))";
// The fold where a front cover meets the spine.
export const HINGE = "linear-gradient(90deg, rgb(0 0 0/0.28), rgb(255 255 255/0.12) 5%, rgb(0 0 0/0) 9%)";
// The weave of a cloth binding, for books with no cover.
const WEAVE =
  "repeating-linear-gradient(0deg, rgb(255 255 255/0.04) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(0 0 0/0.06) 0 1px, transparent 1px 3px)";

const DARK_INK = "#1f1a16";
// Gold foil, or a dark stamp on a light binding.
const foil = (ink: string) => (ink === DARK_INK ? "#5a3f12" : "#ecd391");

const cover = (book: Book) => book.coverCachedPath ?? book.coverUrl;

// The spine of a book, filling its parent: the shelf's button, or the spine
// face of a book taken down. A book with a cover gets one of the spine
// styles; a book without one is bound in cloth with gilt rules.
export function SpineFace({ book }: { book: Book }) {
  const color = spineColor(book);
  const ink = spineInk(color);
  const style = cover(book) ? spineStyle(book.title) : "cloth";
  const rule = "absolute inset-x-[3px] h-[5px] border-y border-current opacity-45";

  return (
    <span
      className="relative flex size-full flex-col items-center gap-2 overflow-hidden rounded-[inherit] ring-1 ring-foreground/15 ring-inset"
      style={{
        backgroundColor: color,
        backgroundImage: style === "cloth" ? `${SPINE_SHADE}, ${WEAVE}` : SPINE_SHADE,
        color: ink,
        paddingTop: { plain: 14, label: 14, foil: 26, bands: 28, cloth: 18 }[style],
        paddingBottom: style === "bands" || style === "cloth" ? 20 : 12,
      }}
    >
      {(style === "bands" || style === "cloth") && (
        <>
          <span aria-hidden className={`${rule} top-[8px]`} />
          <span aria-hidden className={`${rule} bottom-[7px]`} />
        </>
      )}
      {style === "bands" && <span aria-hidden className={`${rule} top-[17px]`} />}
      {style === "foil" && (
        <span aria-hidden className="absolute top-[9px] text-[9px] leading-none" style={{ color: foil(ink) }}>
          ◆
        </span>
      )}
      {/* The title takes the room the authors leave. */}
      <span
        className={`min-h-0 truncate text-[11px] leading-none font-medium tracking-[-0.01em] [writing-mode:vertical-rl] ${style === "label" ? "mx-[4px] rounded-[1px] bg-[#f4ecda] px-[2px] py-2.5 text-[#2a2520] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14),inset_0_0_0_3px_#f4ecda,inset_0_0_0_4px_rgb(0_0_0/0.1)]" : ""}`}
        style={style === "foil" ? { color: foil(ink) } : undefined}
      >
        {book.title}
      </span>
      {book.authors.length > 0 && (
        <span className="mt-auto max-h-[64px] shrink-0 truncate text-[8.5px] leading-none tracking-[0.06em] uppercase opacity-70 [writing-mode:vertical-rl]">
          {lastNames(book.authors)}
        </span>
      )}
    </span>
  );
}

// A typeset front for a book whose catalog has no cover: the spine's cloth,
// a blind-stamped frame, the title, a rule, and the authors at the foot.
export function ClothCover({ book }: { book: Book }) {
  const color = spineColor(book);
  return (
    <div
      className="relative flex size-full flex-col px-[14%] pt-[18%] pb-[15%]"
      style={{ color: spineInk(color), backgroundColor: color, backgroundImage: WEAVE }}
    >
      <span className="absolute inset-[4%] rounded-[1px] border border-current opacity-30" />
      <span className="text-[1.5em] leading-[1.12] font-light tracking-[-0.02em] text-balance">{book.title}</span>
      <span className="mt-[10%] h-px w-6 bg-current opacity-50" />
      <span className="mt-auto text-[0.75em] leading-snug tracking-[0.14em] uppercase opacity-75">
        {book.authors.join(" & ")}
      </span>
    </div>
  );
}
