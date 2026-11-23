/*
 * Optional colour palettes, picked from the dropdown in the header.
 *
 * "classic" is the original brown/cream design and carries no overrides at
 * all - it is simply what vars.css defines. "spiderman" is the default. Every other palette ships a dark
 * and a light variant, so the sun/moon toggle keeps working inside each one.
 *
 * Only the hand-picked tones live here; the rest of the token set (surfaces,
 * hairlines, glass, text steps) is derived from them in src/palettes.css.
 */
export const DEFAULT_PALETTE = "spiderman";

export const PALETTES = [
  {
    id: "classic",
    label: "Classic Brown",
    swatch: ["#0e0c09", "#d6b895"],
  },
  {
    id: "violet",
    label: "Graphite & Violet",
    swatch: ["#0c0b12", "#a78bfa"],
  },
  {
    id: "spiderman",
    label: "Spider-Man",
    swatch: ["#050507", "#ff3b44"],
  },
];

export const isPalette = (id) => PALETTES.some((palette) => palette.id === id);
