import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PALETTE, isPalette } from "../data/palettes";

const STORAGE_KEY = "palette";

/* Keep in sync with the inline script in index.html, which applies the saved
   palette before first paint so the page never flashes the default one. */
const readPalette = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isPalette(stored)) return stored;
  } catch {
    /* storage can be blocked; fall back to the default palette */
  }
  return DEFAULT_PALETTE;
};

/**
 * Owns the colour palette, independently of light/dark.
 *
 * The palette is a second attribute on <html>. It only layers token overrides
 * on top of whichever theme is active, so choosing one never touches the
 * theme and the theme toggle never touches the palette.
 */
export const usePalette = () => {
  const [palette, setPaletteState] = useState(() =>
    typeof document === "undefined"
      ? DEFAULT_PALETTE
      : document.documentElement.dataset.palette || readPalette()
  );

  useEffect(() => {
    document.documentElement.dataset.palette = palette;

    /* keep the browser UI (address bar) in step with the new background */
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim()
      );
    }
  }, [palette]);

  const setPalette = useCallback((next) => {
    if (!isPalette(next)) return;
    setPaletteState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* a blocked store only costs persistence, not the switch itself */
    }
  }, []);

  return { palette, setPalette };
};
