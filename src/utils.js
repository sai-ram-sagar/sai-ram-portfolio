/**
 * Resolves an asset path such as "projects/employee-dir.png" to its built URL.
 *
 * The patterns below are explicit on purpose: a blanket "/assets/**" glob makes
 * Vite emit every file in the folder — including the multi-megabyte portrait
 * originals — into the deployed bundle. Listing only what the site actually
 * renders keeps the deploy small.
 *
 * The hero uses portfolio-image-round-web.webp: the same photo as
 * portfolio-image-round.png, resized to 900px and re-encoded (5 MB -> 149 KB).
 * The original stays in assets/hero/ untouched as the master copy.
 */
const assets = import.meta.glob(
  [
    "/assets/hero/portfolio-image-round-web.webp",
    "/assets/projects/*.png",
    "/assets/skills/*.png",
    "/assets/extraSkills/*.png",
    "/assets/certificates/*.png",
  ],
  { eager: true, query: "?url", import: "default" }
);

export const getImageUrl = (path) => assets[`/assets/${path}`] ?? "";
