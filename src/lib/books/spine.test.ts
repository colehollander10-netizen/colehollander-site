import { describe, expect, it } from "vitest";

import { CLOTH, lastNames, spineColor, spineInk, spineWidth } from "./spine";

// WCAG contrast ratio between two #rrggbb colors.
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("spineWidth", () => {
  it("grows with page count, within 22 to 44px", () => {
    expect(spineWidth(90)).toBe(24);
    expect(spineWidth(256)).toBe(34);
    expect(spineWidth(40)).toBe(22);
    expect(spineWidth(2000)).toBe(44);
    expect(spineWidth(null)).toBe(30);
  });
});

describe("spineColor", () => {
  it("uses the color sampled from the cover", () => {
    expect(spineColor({ title: "Prayer", spineColor: "#d2dee3" })).toBe("#d2dee3");
  });

  it("gives a coverless book the same cloth color every time", () => {
    const coverless = ["No More Boring Bible Study", "You Gotta Ask", "Bible Translations for Everyone", "Stand Firm and Act Like Men"];
    for (const title of coverless) {
      const color = spineColor({ title, spineColor: null });
      expect(CLOTH).toContain(color);
      expect(spineColor({ title, spineColor: null })).toBe(color);
    }
  });

  it("keeps the title legible on every cloth color", () => {
    for (const color of CLOTH) expect(contrast(color, spineInk(color))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("lastNames", () => {
  it.each([
    [["J. I. Packer"], "Packer"],
    [["Augustine of Hippo"], "Augustine"],
    [["Joby Martin", "Charles Martin"], "Martin"],
    [["John Piper", "Justin Taylor"], "Piper & Taylor"],
    [["Jon & Pam Strain"], "Strain"],
  ])("%j -> %s", (authors, names) => {
    expect(lastNames(authors)).toBe(names);
  });
});
