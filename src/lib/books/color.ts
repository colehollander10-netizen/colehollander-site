// Picks a spine color from a cover's pixels (RGB triples). Colors are grouped
// into coarse bins; vivid bins count extra so a cover's color wins over
// shadows and small amounts of gray, but a mostly white or black cover stays
// that way.
export function dominantColor(rgb: Uint8Array | Buffer): string {
  const bins = new Map<number, { weight: number; r: number; g: number; b: number; n: number }>();
  for (let i = 0; i + 2 < rgb.length; i += 3) {
    const [r, g, b] = [rgb[i], rgb[i + 1], rgb[i + 2]];
    const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const key = ((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6);
    const bin = bins.get(key) ?? { weight: 0, r: 0, g: 0, b: 0, n: 0 };
    bin.weight += 1 + 3 * chroma;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bin.n += 1;
    bins.set(key, bin);
  }
  let best = { weight: 0, r: 0, g: 0, b: 0, n: 1 };
  for (const bin of bins.values()) if (bin.weight > best.weight) best = bin;
  const hex = (v: number) => Math.round(v / best.n).toString(16).padStart(2, "0");
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
}

// Dark ink on light spines, light ink on dark ones (WCAG relative luminance).
export function inkFor(hex: string): "light" | "dark" {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "dark" : "light";
}

// A color's place on a shelf sorted by color: around the wheel from red, then
// the grays, browns near black, and whites, light to dark.
export function colorOrder(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const c = max - Math.min(r, g, b);
  if (c < 0.12) return 360 + (1 - max);
  const h = max === r ? (g - b) / c : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
  return (h * 60 + 360) % 360;
}
