/*
 * Optional colour palettes, picked from the dropdown in the header.
 *
 * "classic" is the original brown/cream design and carries no overrides at
 * all - it is simply what vars.css defines. Every other palette ships a dark
 * and a light variant, so the sun/moon toggle keeps working inside each one.
 *
 * Only the hand-picked tones live here; the rest of the token set (surfaces,
 * hairlines, glass, text steps) is derived from them in src/palettes.css.
 */
export const DEFAULT_PALETTE = "classic";

export const PALETTES = [
  {
    id: "classic",
    label: "Classic Brown",
    swatch: ["#0e0c09", "#d6b895"],
  },
  {
    id: "terracotta",
    label: "Terracotta & Sand",
    swatch: ["#120b09", "#e08a62"],
  },
  {
    id: "olive",
    label: "Olive & Parchment",
    swatch: ["#0d0f0a", "#b5c27a"],
  },
  {
    id: "navy",
    label: "Midnight & Gold",
    swatch: ["#0a0e17", "#e3b857"],
  },
  {
    id: "teal",
    label: "Teal & Coral",
    swatch: ["#071211", "#ff8a73"],
  },
  {
    id: "violet",
    label: "Graphite & Violet",
    swatch: ["#0c0b12", "#a78bfa"],
  },
  {
    id: "emerald",
    label: "Charcoal & Emerald",
    swatch: ["#0b100e", "#5fd3a0"],
  },
  {
    id: "rose",
    label: "Rose & Plum",
    swatch: ["#120b10", "#f08fb0"],
  },
];

export const isPalette = (id) => PALETTES.some((palette) => palette.id === id);
