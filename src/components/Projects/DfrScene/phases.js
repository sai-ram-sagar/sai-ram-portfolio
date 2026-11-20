/*
 * The four steps of the mission workflow. Kept apart from mission.js (which
 * imports three.js) so the card's HTML overlay can use the names without
 * pulling the 3D library into the main bundle.
 */
export const PHASES = ["Plan", "Configure", "Execute", "Complete"];

/** Which step a time within the mission cycle belongs to. */
export const phaseAt = (t) => (t < 9 ? 0 : t < 15 ? 1 : t < 23.4 ? 2 : 3);
