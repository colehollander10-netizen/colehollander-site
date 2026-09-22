import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The link preview card for X, LinkedIn, iMessage and the rest, rendered to a
// static PNG at build time. It mirrors the page: dithered portrait, the name
// in Geist, the role, on the same cream paper.
export const alt = "Cole Hollander, AI Operations Specialist at Order Desk";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// output: "export" needs the route pinned to build time.
export const dynamic = "force-static";

const PAPER = "#f8f3ea";
const INK = "#2c2621";
const MUTED = "#7a7066";

const dataUrl = async (file: string) =>
  `data:image/png;base64,${(await readFile(join(process.cwd(), "public", file))).toString("base64")}`;

export default async function Image() {
  const [portrait, mark] = await Promise.all([
    dataUrl("cole-dither-dark.png"),
    dataUrl("orderdesk-mark.png"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "0 96px",
          background: PAPER,
          color: INK,
        }}
      >
        <img
          src={portrait}
          width={288}
          height={360}
          alt=""
          style={{ borderRadius: 16, imageRendering: "pixelated" }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, letterSpacing: -4, lineHeight: 1 }}>
            Cole Hollander
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 28,
              fontSize: 34,
              color: MUTED,
            }}
          >
            AI Operations Specialist at
            <img
              src={mark}
              width={32}
              height={32}
              alt=""
              style={{ margin: "0 10px 0 14px", borderRadius: 6 }}
            />
            <span style={{ color: INK }}>Order Desk</span>
          </div>
          <div style={{ marginTop: 56, fontSize: 26, color: MUTED }}>
            colehollander.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
