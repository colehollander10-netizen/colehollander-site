import { describe, expect, it } from "vitest";

import { dominantColor, inkFor } from "./color";

const pixels = (...runs: [number, [number, number, number]][]) =>
  Uint8Array.from(runs.flatMap(([n, rgb]) => Array.from({ length: n }, () => rgb).flat()));

describe("dominantColor", () => {
  it("lets a vivid color beat a slightly larger shadow", () => {
    expect(dominantColor(pixels([50, [10, 8, 6]], [40, [230, 140, 40]]))).toBe("#e68c28");
  });

  it("keeps a mostly white cover white", () => {
    expect(dominantColor(pixels([90, [250, 250, 245]], [10, [200, 40, 40]]))).toBe("#fafaf5");
  });
});

describe("inkFor", () => {
  it("uses dark ink on light spines and light ink on dark ones", () => {
    expect(inkFor("#fafaf5")).toBe("dark");
    expect(inkFor("#14314c")).toBe("light");
  });
});
